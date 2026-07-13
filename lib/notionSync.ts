// Client helpers for the automatic Notion connection. The integration
// token and database id live in localStorage (and ride along in the
// cloud-synced extras, so the connection follows the account).

import { SabarState } from "@/store/types";
import { buildNotionRows } from "./notionExport";

export const NOTION_TOKEN_KEY = "sabar-notion-token";
export const NOTION_DB_KEY    = "sabar-notion-db";

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
  const data = await api({ action: "sync", token, databaseId, trades: buildNotionRows(state) });
  return { created: Number(data.created ?? 0), updated: Number(data.updated ?? 0) };
}
