// Builds a Markdown export of the journal that pastes cleanly into Notion:
// headings, a trades table, and per-trade checklists become Notion blocks.

import { SabarState, Trade } from "@/store/types";

const gradeOf = (t: Trade): string => {
  const pct = t.totalRules > 0 ? (t.checkedCount / t.totalRules) * 100 : 0;
  return pct >= 90 ? "A+" : pct >= 70 ? "B+" : pct >= 50 ? "C-" : "D-";
};

const money = (n: number | undefined): string =>
  n === undefined ? "—" : `${n < 0 ? "-" : "+"}$${Math.abs(n).toFixed(2)}`;

const signedR = (t: Trade): string => {
  if (t.outcome === "WIN")  return `+${(t.rr ?? 0).toFixed(1)}R`;
  if (t.outcome === "LOSS") return `-${(t.rr ?? 0).toFixed(1)}R`;
  return "—";
};

export function buildNotionMarkdown(state: SabarState): string {
  const ruleMap = new Map<string, string>();
  [
    ...(state.rules ?? []),
    ...(state.biasRules?.BULLISH ?? []),
    ...(state.biasRules?.BEARISH ?? []),
  ].forEach(r => ruleMap.set(r.id, r.label));
  const resolve = (id: string) => ruleMap.get(id) ?? id;

  const trades = [...state.trades].sort((a, b) => b.date.localeCompare(a.date));
  const taken  = trades.filter(t => t.decision === "TAKE");
  const wins   = taken.filter(t => t.outcome === "WIN");
  const losses = taken.filter(t => t.outcome === "LOSS");
  const winRate  = taken.length > 0 ? Math.round((wins.length / taken.length) * 100) : 0;
  const totalPnl = taken.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const totalR   = taken.reduce((s, t) =>
    s + (t.outcome === "WIN" ? (t.rr ?? 0) : t.outcome === "LOSS" ? -(t.rr ?? 0) : 0), 0);

  const lines: string[] = [];
  lines.push(`# Sabar Trading Journal`);
  lines.push(`Exported: ${new Date().toLocaleString()}`);
  lines.push(``);
  lines.push(`## Summary`);
  lines.push(`- Trades taken: **${taken.length}** (${wins.length} wins / ${losses.length} losses)`);
  lines.push(`- Win rate: **${winRate}%**`);
  lines.push(`- Total P/L: **${money(totalPnl)}**`);
  lines.push(`- Total R: **${totalR >= 0 ? "+" : ""}${totalR.toFixed(1)}R**`);
  lines.push(``);
  lines.push(`## Trades`);
  lines.push(``);
  lines.push(`| Date | Pair | Session | Bias | Decision | Outcome | R | P/L | Grade |`);
  lines.push(`| --- | --- | --- | --- | --- | --- | --- | --- | --- |`);
  for (const t of trades) {
    lines.push(`| ${t.date} | ${t.pair} | ${t.session === "LONDON" ? "London" : "New York"} | ${t.bias} | ${t.decision} | ${t.outcome ?? "—"} | ${signedR(t)} | ${money(t.pnl)} | ${gradeOf(t)} |`);
  }
  lines.push(``);
  lines.push(`## Trade Details`);

  for (const t of trades) {
    lines.push(``);
    lines.push(`### ${t.date} — ${t.pair} (${t.decision === "TAKE" ? t.outcome ?? "open" : "SKIPPED"})`);
    lines.push(`- Bias: **${t.bias}** · Session: **${t.session === "LONDON" ? "London" : "New York"}**`);
    lines.push(`- Risk: **${t.riskPercent}%** ($${(t.riskAmount ?? 0).toFixed(2)}) · Lot: **${t.lotSize}** · SL: **${t.stopLossPips} pips**`);
    lines.push(`- Result: **${signedR(t)}** · **${money(t.pnl)}** · Grade: **${gradeOf(t)}**`);
    if (t.psychology?.length) lines.push(`- Psychology: ${t.psychology.join(", ")}`);
    if (t.notes) lines.push(`- Notes: ${t.notes}`);
    const checked = t.rulesChecked ?? [];
    const missing = t.missingRules ?? [];
    if (checked.length || missing.length) {
      lines.push(``);
      lines.push(`**Checklist (${t.checkedCount}/${t.totalRules}):**`);
      checked.forEach(id => lines.push(`- [x] ${resolve(id)}`));
      missing.forEach(id => lines.push(`- [ ] ${resolve(id)}`));
    }
  }

  lines.push(``);
  lines.push(`---`);
  lines.push(`*Chart images are not included in this export — view them in the Sabar app.*`);
  return lines.join("\n");
}

// ── Rows for the automatic Notion database sync ────────────────

export interface NotionRow {
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
}

export function buildNotionRows(state: SabarState): NotionRow[] {
  const ruleMap = new Map<string, string>();
  [
    ...(state.rules ?? []),
    ...(state.biasRules?.BULLISH ?? []),
    ...(state.biasRules?.BEARISH ?? []),
  ].forEach(r => ruleMap.set(r.id, r.label));
  const resolve = (id: string) => ruleMap.get(id) ?? id;

  return state.trades.map(t => ({
    id: t.id,
    date: t.date,
    pair: t.pair,
    session: t.session === "LONDON" ? "London" : "New York",
    bias: t.bias,
    decision: t.decision,
    outcome: t.outcome ?? "",
    r: t.outcome === "WIN" ? (t.rr ?? 0) : t.outcome === "LOSS" ? -(t.rr ?? 0) : 0,
    pnl: t.pnl ?? 0,
    grade: gradeOf(t),
    checklist: [
      ...(t.rulesChecked ?? []).map(id => `✓ ${resolve(id)}`),
      ...(t.missingRules ?? []).map(id => `✗ ${resolve(id)}`),
    ].join("  ·  "),
    notes: t.notes ?? "",
  }));
}
