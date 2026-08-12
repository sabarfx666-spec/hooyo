import { getSupabase } from "./supabase";
import { currentSpaceId } from "./spaces";
import { SabarState, Trade } from "@/store/types";

/**
 * localStorage keys synced to the cloud alongside the main journal state.
 *
 * Anything written to localStorage but left off this list lives on one browser
 * only — it does not follow the user to another device and does not survive
 * clearing site data. Add new keys here as features are built.
 *
 * Deliberately NOT synced: image/audio blobs (they go to Supabase Storage via
 * lib/db.ts, not into this row), device preferences (sabar-theme,
 * sabar-outlook-month), the auth session, and transient caches.
 */
const EXTRA_KEYS = [
  // Weekly Outlook — the entries themselves; chart images ride along in Storage
  "sabar-outlook-entries",
  // Daily Note drawer
  "sabar-daily-notes",
  // Plan mind map
  "sabar-plan-map",
  // Voice notes: which clip belongs to which field. The audio is in Storage, so
  // without this the recordings survive but nothing knows where they belong.
  "sabar-voice-clips",
  "sabar-profile-avatar",
  "sabar-custom-rituals",
  "sabar-daily-ritual",
  "sabar-ritual-skip",
  "sabar-psych-note",
  // Superseded by sabar-outlook-entries. Kept so existing cloud copies of the
  // old format aren't stranded on accounts that still have them.
  "sabar-weekly-outlook",
  "sabar-weekly-saved-pairs",
  "sabar-trading-accounts",
  "sabar-trade-links",
  "sabar-habits",
  "sabar-news-alarms",
  "sabar-volume-check",
  "sabar-risk-rules-v2",
  "sabar-kill-switch",
  "sabar-account-name",
  "sabar-risk-accounts-v3",
  "sabar-discord-webhook",
  "sabar-notify-discord",
  "sabar-notify-tg-token",
  "sabar-notify-tg-chat",
  "sabar-notify-email-service",
  "sabar-notify-email-template",
  "sabar-notify-email-pubkey",
  "sabar-notify-email-to",
  "sabar-notion-token",
  "sabar-notion-db",
];

export interface CloudData {
  state?: Partial<SabarState>;
  extras?: Record<string, string>;
  /** When this copy was uploaded. Lets a device tell whether the cloud copy is
   *  older than its own unsaved work, instead of blindly overwriting itself. */
  updatedAt?: string;
}

/** Shape of the jsonb column: one CloudData per space. Rows written before
 *  the space system existed hold a bare CloudData — treated as "default". */
interface CloudRow {
  spaces?: Record<string, CloudData>;
  state?: Partial<SabarState>;
  extras?: Record<string, string>;
}

const stripImages = (t: Trade): Trade => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { imgBefore, imgAfter, chartProof, chartProofs, ...rest } = t;
  return rest as Trade;
};

async function uid(): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session?.user.id ?? null;
}

/** Download the current space's journal from the cloud. Null when none exists yet. */
export async function cloudPull(): Promise<CloudData | null> {
  const sb = getSupabase();
  const userId = await uid();
  if (!sb || !userId) return null;
  const { data, error } = await sb
    .from("journal_state")
    .select("data")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  const row = data.data as CloudRow;
  const spaceId = currentSpaceId();
  if (row?.spaces) return row.spaces[spaceId] ?? null;
  // Legacy row from before spaces existed = the default space
  return spaceId === "default" ? (row as CloudData) : null;
}

/** Upload the current space's journal (state + extras), keeping other spaces intact. */
export async function cloudPush(state: SabarState): Promise<boolean> {
  const sb = getSupabase();
  const userId = await uid();
  if (!sb || !userId) return false;
  const extras: Record<string, string> = {};
  for (const k of EXTRA_KEYS) {
    const v = localStorage.getItem(k);
    if (v !== null) extras[k] = v;
  }
  const payload: CloudData = {
    state: { ...state, trades: state.trades.map(stripImages) },
    extras,
    updatedAt: new Date().toISOString(),
  };

  // Read the existing row so other spaces survive the write
  const { data: rowData } = await sb
    .from("journal_state")
    .select("data")
    .eq("user_id", userId)
    .maybeSingle();
  const existing = (rowData?.data ?? {}) as CloudRow;
  const spaces: Record<string, CloudData> = existing.spaces ?? {};
  if (!existing.spaces && existing.state) {
    spaces["default"] = { state: existing.state, extras: existing.extras }; // migrate legacy shape
  }
  spaces[currentSpaceId()] = payload;

  const { error } = await sb
    .from("journal_state")
    .upsert({ user_id: userId, data: { spaces }, updated_at: new Date().toISOString() });
  return !error;
}

/** Write the cloud extras back into localStorage on this device. */
export function applyExtras(extras: Record<string, string> | undefined) {
  if (!extras) return;
  for (const [k, v] of Object.entries(extras)) {
    try { localStorage.setItem(k, v); } catch {}
  }
}
