import { getSupabase } from "./supabase";
import { SabarState, Trade } from "@/store/types";

/** localStorage keys synced to the cloud alongside the main journal state. */
const EXTRA_KEYS = [
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
];

export interface CloudData {
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

/** Download the user's journal from the cloud. Returns null when no row exists yet. */
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
  return data.data as CloudData;
}

/** Upload the journal (state + extra localStorage keys) to the cloud. */
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
  };
  const { error } = await sb
    .from("journal_state")
    .upsert({ user_id: userId, data: payload, updated_at: new Date().toISOString() });
  return !error;
}

/** Write the cloud extras back into localStorage on this device. */
export function applyExtras(extras: Record<string, string> | undefined) {
  if (!extras) return;
  for (const [k, v] of Object.entries(extras)) {
    try { localStorage.setItem(k, v); } catch {}
  }
}
