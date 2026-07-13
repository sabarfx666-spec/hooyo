// Server-side bridge to the Notion API (the browser can't call Notion
// directly because of CORS). The user's integration token is sent per
// request and never stored server-side.

import { NextRequest, NextResponse } from "next/server";

const NOTION = "https://api.notion.com/v1";
const VERSION = "2022-06-28";

interface NotionRow {
  id: string;
  date: string;
  pair: string;
  session: string;
  bias: string;
  decision: string;
  outcome: string;
  r: number;
  pnl: number;
  grade: string;
  checklist: string;
  notes: string;
  images?: { name: string; url: string }[];
}

async function notion(token: string, path: string, method: string, body?: unknown) {
  const res = await fetch(`${NOTION}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": VERSION,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { message?: string })?.message ?? `Notion error ${res.status}`);
  return data;
}

// Accepts a raw page id or any Notion page URL and returns a dashed UUID.
function extractPageId(input: string): string {
  const hex = input.replace(/-/g, "").match(/[0-9a-f]{32}(?![0-9a-f])/gi);
  if (!hex) throw new Error("Could not find a page id in that link. Paste the full Notion page link.");
  const id = hex[hex.length - 1];
  return `${id.slice(0,8)}-${id.slice(8,12)}-${id.slice(12,16)}-${id.slice(16,20)}-${id.slice(20)}`;
}

const rt = (s: string) => [{ type: "text", text: { content: s.slice(0, 1990) } }];
const sel = (s: string) => (s ? { select: { name: s.slice(0, 90) } } : { select: null });

function tradeProperties(t: NotionRow) {
  return {
    Pair:      { title: rt(t.pair || "—") },
    Date:      t.date ? { date: { start: t.date } } : { date: null },
    Session:   sel(t.session),
    Bias:      sel(t.bias),
    Decision:  sel(t.decision),
    Outcome:   sel(t.outcome),
    R:         { number: t.r },
    "P/L":     { number: t.pnl },
    Grade:     sel(t.grade),
    Checklist: { rich_text: rt(t.checklist) },
    Notes:     { rich_text: rt(t.notes) },
    TradeID:   { rich_text: rt(t.id) },
    Charts:    { files: (t.images ?? []).slice(0, 20).map(i => ({
      name: (i.name || "chart").slice(0, 90),
      type: "external",
      external: { url: i.url },
    })) },
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token: string = body.token;
    if (!token) return NextResponse.json({ error: "Missing Notion token" }, { status: 400 });

    if (body.action === "setup") {
      const pageId = extractPageId(String(body.page ?? ""));
      const db = await notion(token, "/databases", "POST", {
        parent: { type: "page_id", page_id: pageId },
        title: [{ type: "text", text: { content: "Sabar Trades" } }],
        properties: {
          Pair:      { title: {} },
          Date:      { date: {} },
          Session:   { select: {} },
          Bias:      { select: {} },
          Decision:  { select: {} },
          Outcome:   { select: {} },
          R:         { number: { format: "number" } },
          "P/L":     { number: { format: "number" } },
          Grade:     { select: {} },
          Checklist: { rich_text: {} },
          Notes:     { rich_text: {} },
          TradeID:   { rich_text: {} },
          Charts:    { files: {} },
        },
      });
      return NextResponse.json({ databaseId: (db as { id: string }).id });
    }

    if (body.action === "sync") {
      const databaseId: string = body.databaseId;
      const rows: NotionRow[] = body.trades ?? [];
      if (!databaseId) return NextResponse.json({ error: "Not connected yet" }, { status: 400 });

      // Databases created before the Charts column existed get it added here
      try {
        await notion(token, `/databases/${databaseId}`, "PATCH", { properties: { Charts: { files: {} } } });
      } catch {}

      let created = 0, updated = 0;
      for (const t of rows) {
        const found = await notion(token, `/databases/${databaseId}/query`, "POST", {
          filter: { property: "TradeID", rich_text: { equals: t.id } },
          page_size: 1,
        }) as { results: { id: string }[] };
        if (found.results.length > 0) {
          await notion(token, `/pages/${found.results[0].id}`, "PATCH", { properties: tradeProperties(t) });
          updated++;
        } else {
          await notion(token, "/pages", "POST", {
            parent: { database_id: databaseId },
            properties: tradeProperties(t),
          });
          created++;
        }
        await new Promise(r => setTimeout(r, 250)); // stay under Notion's rate limit
      }
      return NextResponse.json({ created, updated });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Notion request failed" }, { status: 500 });
  }
}
