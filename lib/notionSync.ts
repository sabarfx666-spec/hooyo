// Client helpers for the automatic Notion connection. The integration
// token and database id live in localStorage (and ride along in the
// cloud-synced extras, so the connection follows the account).

import { SabarState } from "@/store/types";
import { buildNotionRows } from "./notionExport";
import { imgLoadTrade } from "./db";
import { getSupabase } from "./supabase";

export const NOTION_TOKEN_KEY = "sabar-notion-token";
export const NOTION_DB_KEY    = "sabar-notion-db";

// ── Chart images for Notion ────────────────────────────────────
// Notion can only display images from a public URL, so each chart is
// published as a real image file into the public "charts-public" bucket
// (unguessable per-user path) and attached to the trade's Notion row.

const PUBLIC_BUCKET = "charts-public";
const IMG_CACHE_KEY = "sabar-notion-imgs";

interface ImgRef { name: string; url: string }

const extOf = (mime: string): string =>
  mime.includes("jpeg") || mime.includes("jpg") ? "jpg" :
  mime.includes("webp") ? "webp" :
  mime.includes("gif")  ? "gif"  : "png";

function dataUrlToBlob(dataUrl: string): Blob | null {
  try {
    const [head, b64] = dataUrl.split(",");
    if (!b64) return null;
    const mime = head.match(/data:(.*?)[;,]/)?.[1] || "image/png";
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  } catch { return null; }
}

async function publishImage(key: string, dataUrl: string): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data: s } = await sb.auth.getSession();
  const userId = s.session?.user.id;
  if (!userId) return null;

  let cache: Record<string, { len: number; url: string }> = {};
  try { cache = JSON.parse(localStorage.getItem(IMG_CACHE_KEY) ?? "{}"); } catch {}
  const hit = cache[key];
  if (hit && hit.len === dataUrl.length) return hit.url; // already published, unchanged

  const blob = dataUrlToBlob(dataUrl);
  if (!blob) return null;
  const path = `${userId}/${key}.${extOf(blob.type)}`;
  const { error } = await sb.storage.from(PUBLIC_BUCKET).upload(path, blob, { upsert: true, contentType: blob.type });
  if (error) return null;
  const { data } = sb.storage.from(PUBLIC_BUCKET).getPublicUrl(path);
  cache[key] = { len: dataUrl.length, url: data.publicUrl };
  try { localStorage.setItem(IMG_CACHE_KEY, JSON.stringify(cache)); } catch {}
  return data.publicUrl;
}

async function tradeImages(tradeId: string): Promise<ImgRef[]> {
  try {
    const imgs = await imgLoadTrade(tradeId);
    const out: ImgRef[] = [];
    const add = async (name: string, key: string, val: string | null | undefined) => {
      if (!val || !val.startsWith("data:")) return;
      const url = await publishImage(key, val);
      if (url) out.push({ name, url });
    };
    await add("Before", `${tradeId}_before`, imgs.imgBefore);
    await add("After",  `${tradeId}_after`,  imgs.imgAfter);
    await add("Proof",  `${tradeId}_proof`,  imgs.chartProof);
    for (const [slot, val] of Object.entries(imgs.chartProofs)) {
      await add(slot, `${tradeId}_${slot}`, val);
    }
    return out;
  } catch { return []; }
}

export const notionConnected = (): boolean =>
  typeof window !== "undefined" &&
  !!localStorage.getItem(NOTION_TOKEN_KEY) &&
  !!localStorage.getItem(NOTION_DB_KEY);

async function api(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await fetch("/api/notion", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string })?.error ?? "Notion request failed");
  return data as Record<string, unknown>;
}

/** Creates the "Sabar Trades" database on the given page and stores the connection. */
export async function notionConnect(token: string, pageLink: string): Promise<void> {
  const data = await api({ action: "setup", token, page: pageLink });
  localStorage.setItem(NOTION_TOKEN_KEY, token);
  localStorage.setItem(NOTION_DB_KEY, String(data.databaseId));
}

export function notionDisconnect(): void {
  localStorage.removeItem(NOTION_TOKEN_KEY);
  localStorage.removeItem(NOTION_DB_KEY);
}

/** Pushes every trade to the Notion database (creates new rows, updates existing). */
export async function notionSyncTrades(state: SabarState): Promise<{ created: number; updated: number }> {
  const token = localStorage.getItem(NOTION_TOKEN_KEY);
  const databaseId = localStorage.getItem(NOTION_DB_KEY);
  if (!token || !databaseId) throw new Error("Notion is not connected yet.");
  const rows = [];
  for (const r of buildNotionRows(state)) {
    rows.push({ ...r, images: await tradeImages(r.id) });
  }
  const data = await api({ action: "sync", token, databaseId, trades: rows });
  return { created: Number(data.created ?? 0), updated: Number(data.updated ?? 0) };
}
