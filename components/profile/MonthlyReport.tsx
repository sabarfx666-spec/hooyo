"use client";
import { useMemo, useState } from "react";
import { Trade } from "@/store/types";
import {
  FileText, Printer, TrendingUp, TrendingDown, Target, Brain,
  Shield, ChevronLeft, ChevronRight, Minus,
} from "lucide-react";

const GREEN = "#22C55E";
const RED   = "#EF4444";
const AMBER = "#F5A623";
const TEAL  = "#6AECE1";

const CARD = { background: "#0D0D0D", border: "1px solid #1A1A1A" };
const TILE = { background: "#0A0A0A", border: "1px solid #1A1A1A" };

/** How much of its checklist a trade satisfied, 0–100. */
const tradePct = (t: Trade) =>
  t.totalRules > 0 ? Math.round((t.checkedCount / t.totalRules) * 100) : 0;

const monthKey  = (date: string) => date.slice(0, 7);            // YYYY-MM
const monthName = (key: string) =>
  new Date(key + "-01T12:00:00").toLocaleDateString("en-US", { month: "long", year: "numeric" });

const money = (n: number) => `${n >= 0 ? "+" : "−"}$${Math.abs(n).toFixed(2)}`;

interface MonthStats {
  key: string;
  trades: Trade[];
  taken: Trade[];
  wins: number;
  losses: number;
  winRate: number;
  netPnl: number;
  totalR: number;
  discipline: number;      // % of trades that met 70%+ of the checklist
  avgChecklist: number;    // mean checklist completion
  topSession: string | null;
  topPair: string | null;
  topPsych: string | null;
}

function buildMonth(key: string, trades: Trade[]): MonthStats {
  const taken  = trades.filter(t => t.decision === "TAKE");
  const wins   = taken.filter(t => t.outcome === "WIN").length;
  const losses = taken.filter(t => t.outcome === "LOSS").length;
  const closed = wins + losses;

  const count = <T extends string>(vals: T[]) => {
    const m: Record<string, number> = {};
    vals.forEach(v => { m[v] = (m[v] ?? 0) + 1; });
    const top = Object.entries(m).sort((a, b) => b[1] - a[1])[0];
    return top ? top[0] : null;
  };

  const sessionLabel = (s: Trade["session"]) =>
    s === "ASIAN" ? "Asian" : s === "LONDON" ? "London" : "New York";

  return {
    key, trades, taken, wins, losses,
    winRate: closed > 0 ? Math.round((wins / closed) * 100) : 0,
    netPnl: taken.reduce((s, t) => s + (t.pnl ?? 0), 0),
    totalR: taken.reduce((s, t) =>
      s + (t.outcome === "WIN" ? (t.rr ?? 0) : t.outcome === "LOSS" ? -(t.rr ?? 0) : 0), 0),
    discipline: trades.length > 0
      ? Math.round((trades.filter(t => tradePct(t) >= 70).length / trades.length) * 100) : 0,
    avgChecklist: trades.length > 0
      ? Math.round(trades.reduce((s, t) => s + tradePct(t), 0) / trades.length) : 0,
    topSession: count(taken.map(t => sessionLabel(t.session))),
    topPair:    count(taken.map(t => t.pair)),
    topPsych:   count(trades.flatMap(t => t.psychology ?? [])),
  };
}

/**
 * Written findings for a month, derived from that month's numbers and compared
 * with the month before. These are computed from your own data — no model is
 * called, so nothing here is invented.
 */
function reportLines(m: MonthStats, prev: MonthStats | null) {
  const out: { tag: string; text: string; color: string; Icon: typeof TrendingUp }[] = [];

  if (prev && prev.trades.length > 0) {
    const delta = m.discipline - prev.discipline;
    if (Math.abs(delta) >= 5) {
      out.push({
        tag: "Discipline",
        color: delta > 0 ? GREEN : RED,
        Icon: delta > 0 ? TrendingUp : TrendingDown,
        text: `Discipline ${delta > 0 ? "rose" : "fell"} ${Math.abs(delta)} points versus ${monthName(prev.key)} — ${prev.discipline}% to ${m.discipline}%.`,
      });
    } else {
      out.push({
        tag: "Discipline", color: TEAL, Icon: Minus,
        text: `Discipline held steady around ${m.discipline}%, close to ${monthName(prev.key)}'s ${prev.discipline}%.`,
      });
    }
  } else {
    out.push({
      tag: "Discipline", color: m.discipline >= 70 ? GREEN : AMBER, Icon: Shield,
      text: `${m.discipline}% of trades met 70%+ of your checklist this month.`,
    });
  }

  if (m.discipline < 70 && m.trades.length > 0) {
    out.push({
      tag: "Rule Following", color: AMBER, Icon: Target,
      text: `Average checklist completion was ${m.avgChecklist}%. Trades taken below your own bar are the cheapest losses to remove.`,
    });
  }

  if (m.wins + m.losses > 0) {
    out.push({
      tag: "Results", color: m.netPnl >= 0 ? GREEN : RED,
      Icon: m.netPnl >= 0 ? TrendingUp : TrendingDown,
      text: `${m.wins}W / ${m.losses}L at ${m.winRate}% win rate, ${money(m.netPnl)} and ${m.totalR >= 0 ? "+" : ""}${m.totalR.toFixed(1)}R.`,
    });
  }

  if (m.topSession) {
    out.push({
      tag: "Session", color: TEAL, Icon: Target,
      text: `Most of your activity sat in the ${m.topSession} session.`,
    });
  }

  if (m.topPsych) {
    out.push({
      tag: "Psychology", color: "#A78BFA", Icon: Brain,
      text: `"${m.topPsych}" was your most logged state this month.`,
    });
  }

  return out;
}

/** Discipline % per month, oldest first, as a small bar chart. */
function DisciplineTrend({ months }: { months: MonthStats[] }) {
  if (months.length === 0) {
    return <p className="font-sans text-xs py-6 text-center" style={{ color: "#555" }}>No months logged yet.</p>;
  }

  return (
    <div className="flex items-end gap-2 h-40">
      {months.map(m => {
        const color = m.discipline >= 70 ? GREEN : m.discipline >= 50 ? AMBER : RED;
        return (
          <div key={m.key} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
            <span className="font-sans text-[10px] font-bold" style={{ color }}>{m.discipline}%</span>
            <div className="w-full rounded-t transition-all"
              style={{
                height: `${Math.max(2, m.discipline)}%`,
                background: color,
                boxShadow: `0 0 10px ${color}44`,
              }} />
            <span className="font-sans text-[10px] whitespace-nowrap" style={{ color: "#666" }}>
              {new Date(m.key + "-01T12:00:00").toLocaleDateString("en-US", { month: "short" })}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function MonthlyReport({ trades }: { trades: Trade[] }) {
  // Every month that has trades, oldest first
  const months = useMemo(() => {
    const byMonth = new Map<string, Trade[]>();
    for (const t of trades) {
      const k = monthKey(t.date);
      byMonth.set(k, [...(byMonth.get(k) ?? []), t]);
    }
    return [...byMonth.keys()].sort().map(k => buildMonth(k, byMonth.get(k)!));
  }, [trades]);

  const [index, setIndex] = useState<number | null>(null);
  const active = months.length === 0 ? null : months[index ?? months.length - 1];
  const activeIdx = index ?? months.length - 1;
  const prev = activeIdx > 0 ? months[activeIdx - 1] : null;

  const lines = active ? reportLines(active, prev) : [];

  if (months.length === 0) {
    return (
      <div className="rounded-xl p-5" style={CARD}>
        <div className="flex items-center gap-2.5 mb-3">
          <FileText size={17} style={{ color: RED }} />
          <h3 className="font-sans font-bold text-white text-base">Monthly Report</h3>
        </div>
        <p className="font-sans text-sm py-6 text-center" style={{ color: "#555" }}>
          Log some trades and your monthly report will build itself here.
        </p>
      </div>
    );
  }

  const tiles = active ? [
    { label: "Net P&L",     value: money(active.netPnl), color: active.netPnl >= 0 ? GREEN : RED },
    { label: "Win Rate",    value: `${active.winRate}%`, color: active.winRate >= 50 ? GREEN : AMBER },
    { label: "Discipline",  value: `${active.discipline}%`, color: active.discipline >= 70 ? GREEN : AMBER },
    { label: "Total R",     value: `${active.totalR >= 0 ? "+" : ""}${active.totalR.toFixed(1)}R`, color: active.totalR >= 0 ? GREEN : RED },
  ] : [];

  return (
    <div id="monthly-report" className="rounded-xl p-5" style={CARD}>

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(229,62,62,0.12)", border: "1px solid rgba(229,62,62,0.3)" }}>
            <FileText size={17} style={{ color: RED }} />
          </div>
          <div>
            <h3 className="font-sans font-bold text-white text-base">Monthly Report</h3>
            <p className="font-sans text-[11px]" style={{ color: "#8A8A8A" }}>
              Performance and discipline, month by month
            </p>
          </div>
        </div>

        <button onClick={() => window.print()}
          className="no-print flex items-center gap-2 px-3.5 py-2 rounded-xl font-sans text-sm font-semibold transition-all hover:opacity-90"
          style={{ background: RED, color: "#fff" }}>
          <Printer size={15} /> Export PDF
        </button>
      </div>

      {/* Month picker */}
      <div className="no-print flex items-center justify-center gap-2 mb-4">
        <button onClick={() => setIndex(Math.max(0, activeIdx - 1))} disabled={activeIdx === 0}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: activeIdx === 0 ? "#333" : "#8A8A8A", cursor: activeIdx === 0 ? "not-allowed" : "pointer" }}>
          <ChevronLeft size={17} />
        </button>
        <span className="font-sans font-bold text-white text-sm w-44 text-center">
          {active && monthName(active.key)}
        </span>
        <button onClick={() => setIndex(Math.min(months.length - 1, activeIdx + 1))}
          disabled={activeIdx === months.length - 1}
          className="p-1.5 rounded-lg transition-colors"
          style={{
            color: activeIdx === months.length - 1 ? "#333" : "#8A8A8A",
            cursor: activeIdx === months.length - 1 ? "not-allowed" : "pointer",
          }}>
          <ChevronRight size={17} />
        </button>
      </div>

      {/* Print-only title, so the PDF says which month it covers */}
      <p className="print-only font-sans font-bold text-white text-lg mb-3">
        {active && monthName(active.key)} — Sabar System report
      </p>

      {/* Headline numbers */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {tiles.map(({ label, value, color }) => (
          <div key={label} className="p-3 rounded-xl" style={TILE}>
            <p className="font-mono text-[9px] uppercase tracking-widest mb-1.5" style={{ color: "#444" }}>{label}</p>
            <p className="font-sans font-black text-lg" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Findings */}
      <p className="font-mono text-[10px] uppercase tracking-widest mb-2.5" style={{ color: "#444" }}>
        What the month says
      </p>
      <div className="space-y-2.5 mb-5">
        {lines.map(({ tag, text, color, Icon }) => (
          <div key={tag} className="rounded-xl px-4 py-3"
            style={{ background: `${color}0D`, border: `1px solid ${color}40` }}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Icon size={12} style={{ color }} />
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest" style={{ color }}>{tag}</span>
            </div>
            <p className="font-sans text-[13px] leading-snug" style={{ color: "#D0D0D0" }}>{text}</p>
          </div>
        ))}
      </div>

      {/* Discipline over time */}
      <p className="font-mono text-[10px] uppercase tracking-widest mb-3" style={{ color: "#444" }}>
        Discipline over time
      </p>
      <DisciplineTrend months={months} />

      <p className="font-sans text-[10px] mt-4 leading-relaxed" style={{ color: "#555" }}>
        <span className="font-bold">Note:</span> Every figure here is calculated from your own logged
        trades — nothing is estimated or generated by a model. For self-improvement only; not financial advice.
      </p>
    </div>
  );
}
