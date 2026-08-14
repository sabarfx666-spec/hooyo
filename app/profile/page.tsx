"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSabar } from "@/store/SabarContext";
import { Trade } from "@/store/types";
import { ArrowLeft, User, TrendingUp, Target, BarChart2, Activity, Brain, Clock, BookOpen, Layers, ChevronLeft, ChevronRight, Calendar, ClipboardCopy, Check, RefreshCw, Link2, Unlink, Sparkles, Info, CreditCard, ImagePlus, X, Sun } from "lucide-react";
import { RITUAL_HISTORY_KEY, RitualHistory } from "@/components/journal/DailyRitual";
import Link from "next/link";
import { useAuth } from "@/store/AuthContext";
import { buildNotionMarkdown } from "@/lib/notionExport";
import { notionConnected, notionConnect, notionDisconnect, notionSyncTrades } from "@/lib/notionSync";

/**
 * Daily Rituals summary: today's readiness plus the last 7 days.
 *
 * History only exists from the day this was added — earlier days have nothing
 * recorded and show a dash rather than a guess.
 */
function DailyRitualCard() {
  const [today, setToday]     = useState<{ done: number; total: number; completed: boolean } | null>(null);
  const [history, setHistory] = useState<RitualHistory>({});
  const [mounted, setMounted] = useState(false);

  const todayKey = new Date().toISOString().split("T")[0];

  useEffect(() => {
    setMounted(true);
    try {
      const hist: RitualHistory = JSON.parse(localStorage.getItem(RITUAL_HISTORY_KEY) ?? "{}");
      setHistory(hist);
      const raw = localStorage.getItem("sabar-daily-ritual");
      const saved = raw ? JSON.parse(raw) as { date: string; checks: boolean[]; completed: boolean } : null;
      if (saved?.date === todayKey) {
        setToday({
          done: saved.checks.filter(Boolean).length,
          total: saved.checks.length,
          completed: saved.completed,
        });
      }
    } catch {}
  }, [todayKey]);

  if (!mounted) return null;

  const done  = today?.done ?? 0;
  const total = today?.total ?? 0;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
  const barColor = pct === 100 ? "#22C55E" : pct > 0 ? "#F59E0B" : "#EF4444";

  // Last 7 days, oldest first
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().split("T")[0];
    return {
      key,
      label: d.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2),
      entry: history[key],
    };
  });

  return (
    <div className="rounded-xl p-5" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "rgba(245,166,35,0.12)", border: "1px solid rgba(245,166,35,0.3)" }}>
          <Sun size={17} style={{ color: "#F5A623" }} />
        </div>
        <div>
          <h3 className="font-sans font-bold text-white text-base">Daily Rituals</h3>
          <p className="font-sans text-[11px]" style={{ color: "#8A8A8A" }}>Your pre-market routine</p>
        </div>
      </div>

      {/* Today */}
      <div className="flex items-center justify-between mb-2">
        <p className="font-sans text-sm" style={{ color: "#D0D0D0" }}>Today&apos;s Readiness</p>
        <p className="font-sans text-sm font-semibold"
          style={{ color: today?.completed ? "#22C55E" : total > 0 ? "#F59E0B" : "#8A8A8A" }}>
          {total === 0 ? "Not completed" : today?.completed ? "Completed" : `${done}/${total} done`}
        </p>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden mb-5" style={{ background: "#1C1C1C" }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: barColor }} />
      </div>

      {/* Last 7 days */}
      <p className="font-sans text-xs mb-2.5" style={{ color: "#8A8A8A" }}>Last 7 days</p>
      <div className="grid grid-cols-7 gap-1">
        {days.map(({ key, label, entry }) => {
          const state = !entry ? "none" : entry.completed ? "done" : entry.done > 0 ? "partial" : "missed";
          const color = state === "done" ? "#22C55E"
                      : state === "partial" ? "#F59E0B"
                      : state === "missed" ? "#EF4444" : "#3A3A3A";
          return (
            <div key={key} className="flex flex-col items-center gap-1.5">
              <div className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ border: `1.5px solid ${color}`, background: state === "none" ? "transparent" : `${color}1A` }}>
                {state === "done"    && <Check size={13} style={{ color }} strokeWidth={3} />}
                {state === "partial" && <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />}
                {state === "missed"  && <X size={12} style={{ color }} strokeWidth={3} />}
                {state === "none"    && <span className="font-sans text-xs" style={{ color }}>–</span>}
              </div>
              <span className="font-sans text-[10px]" style={{ color: "#666" }}>{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function fmt(n: number) {
  const abs = Math.abs(n);
  const s = abs >= 1000 ? `${(abs / 1000).toFixed(1)}K` : abs.toFixed(0);
  return (n < 0 ? "-$" : "+$") + s;
}

function TradeCalendar({ trades }: { trades: Trade[] }) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthName = viewDate.toLocaleString("default", { month: "long", year: "numeric" });

  // Group taken trades by date
  const dayData = useMemo(() => {
    const map: Record<string, { pnl: number; count: number }> = {};
    trades.filter(t => t.decision === "TAKE").forEach(t => {
      if (!map[t.date]) map[t.date] = { pnl: 0, count: 0 };
      map[t.date].pnl   += t.pnl ?? 0;
      map[t.date].count += 1;
    });
    return map;
  }, [trades]);

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  // Monthly stats
  const monthlyTrades = trades.filter(t => {
    const d = new Date(t.date);
    return t.decision === "TAKE" && d.getFullYear() === year && d.getMonth() === month;
  });
  const monthlyPnl   = monthlyTrades.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const tradingDays  = new Set(monthlyTrades.map(t => t.date)).size;

  const isThisMonth = year === today.getFullYear() && month === today.getMonth();

  function prevMonth() { setViewDate(new Date(year, month - 1, 1)); }
  function nextMonth() { setViewDate(new Date(year, month + 1, 1)); }
  function goToday()   { setViewDate(new Date(today.getFullYear(), today.getMonth(), 1)); }

  const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="rounded-xl p-4" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" style={{ color: "#555" }}>
            <ChevronLeft size={15} />
          </button>
          <span className="font-mono text-sm font-bold text-white">{monthName}</span>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" style={{ color: "#555" }}>
            <ChevronRight size={15} />
          </button>
          {!isThisMonth && (
            <button onClick={goToday} className="px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold transition-colors"
              style={{ background: "rgba(106,236,225,0.1)", border: "1px solid rgba(106,236,225,0.2)", color: "#6AECE1" }}>
              This month
            </button>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="font-mono text-[10px] text-[#444] uppercase tracking-widest">Monthly P&L</p>
            <p className="font-mono text-sm font-bold" style={{ color: monthlyPnl >= 0 ? "#00FF7F" : "#FF3B3B" }}>
              {monthlyPnl === 0 ? "$0" : fmt(monthlyPnl)}
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-[10px] text-[#444] uppercase tracking-widest">Trading Days</p>
            <p className="font-mono text-sm font-bold text-white">{tradingDays}</p>
          </div>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-8 gap-1 mb-1">
        {DAY_HEADERS.map(d => (
          <div key={d} className="text-center font-mono text-[10px] uppercase tracking-widest py-1" style={{ color: "#333" }}>{d}</div>
        ))}
        <div className="font-mono text-[10px] uppercase tracking-widest py-1 text-center" style={{ color: "#333" }}>Week</div>
      </div>

      {/* Calendar weeks */}
      <div className="space-y-1">
        {weeks.map((week, wi) => {
          const weekPnl   = week.reduce<number>((s, day) => {
            if (!day) return s;
            const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            return s + (dayData[key]?.pnl ?? 0);
          }, 0);
          const weekDays  = week.filter(d => d !== null && (() => {
            const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d!).padStart(2, "0")}`;
            return (dayData[key]?.count ?? 0) > 0;
          })()).length;

          return (
            <div key={wi} className="grid grid-cols-8 gap-1">
              {week.map((day, di) => {
                if (!day) return <div key={di} className="rounded-lg h-14" style={{ background: "#080808" }} />;
                const key  = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const data = dayData[key];
                const isToday = isThisMonth && day === today.getDate();
                const bg = !data ? "#0D0D0D"
                  : data.pnl > 0 ? "rgba(0,255,127,0.12)"
                  : data.pnl < 0 ? "rgba(255,59,59,0.18)"
                  : "rgba(106,236,225,0.08)";
                const border = isToday ? "1px solid rgba(106,236,225,0.5)"
                  : !data ? "1px solid #141414"
                  : data.pnl > 0 ? "1px solid rgba(0,255,127,0.2)"
                  : data.pnl < 0 ? "1px solid rgba(255,59,59,0.25)"
                  : "1px solid rgba(106,236,225,0.15)";
                const pnlColor = data?.pnl != null
                  ? data.pnl > 0 ? "#00FF7F" : data.pnl < 0 ? "#FF5555" : "#6AECE1"
                  : "#333";

                return (
                  <div key={di} className="rounded-lg h-14 p-1.5 flex flex-col justify-between" style={{ background: bg, border }}>
                    <span className="font-mono text-[9px]" style={{ color: isToday ? "#6AECE1" : "#444" }}>{day}</span>
                    {data ? (
                      <>
                        <span className="font-mono text-[10px] font-bold leading-none" style={{ color: pnlColor }}>
                          {fmt(data.pnl)}
                        </span>
                        <span className="font-mono text-[9px]" style={{ color: "#444" }}>{data.count} trade{data.count !== 1 ? "s" : ""}</span>
                      </>
                    ) : null}
                  </div>
                );
              })}
              {/* Week summary */}
              <div className="rounded-lg h-14 p-1.5 flex flex-col justify-center items-center gap-0.5" style={{ background: "#080808", border: "1px solid #141414" }}>
                <span className="font-mono text-[9px]" style={{ color: "#333" }}>Wk {wi + 1}</span>
                {weekDays > 0 ? (
                  <>
                    <span className="font-mono text-[10px] font-bold" style={{ color: weekPnl >= 0 ? "#00FF7F" : "#FF5555" }}>
                      {fmt(weekPnl)}
                    </span>
                    <span className="font-mono text-[9px]" style={{ color: "#333" }}>{weekDays}d</span>
                  </>
                ) : <span className="font-mono text-[9px]" style={{ color: "#222" }}>—</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function tradePct(t: Trade) {
  return t.totalRules > 0 ? Math.round((t.checkedCount / t.totalRules) * 100) : 0;
}

function SectionHeader({ icon: Icon, title, sub, color = "#6AECE1" }: { icon: any; title: string; sub: string; color?: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}18`, border: `1px solid ${color}33` }}>
        <Icon size={16} style={{ color }} />
      </div>
      <div>
        <p className="font-mono font-bold text-white text-sm">{title}</p>
        <p className="font-mono text-[10px]" style={{ color: "#444" }}>{sub}</p>
      </div>
    </div>
  );
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "#1A1A1A" }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

/** Compact money label for the axis: $56K, $1.2M, -$800. */
function axisMoney(n: number) {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)     return `${sign}$${Math.round(abs / 1_000)}K`;
  return `${sign}$${Math.round(abs)}`;
}

/**
 * Equity curve over the account's starting size: a dashed baseline at the
 * starting balance, the line green above it and red below, with a $ / % toggle.
 *
 * Without a starting size (the "All Accounts" view) the curve is plain
 * cumulative P&L from zero and percent is unavailable — there is nothing
 * truthful to take a percentage of.
 */
function EquityCurveCard({ trades, accountSize }: { trades: Trade[]; accountSize: number | null }) {
  const [mode, setMode] = useState<"$" | "%">("$");

  const sorted = useMemo(() =>
    [...trades].filter(t => t.decision === "TAKE" && t.pnl != null)
      .sort((a, b) => a.date.localeCompare(b.date)), [trades]);

  const base = accountSize ?? 0;
  const pct  = mode === "%" && accountSize !== null && accountSize > 0;

  // Baseline first, then the balance after each trade
  const series = useMemo(() => {
    let cum = 0;
    return [base, ...sorted.map(t => { cum += t.pnl ?? 0; return base + cum; })];
  }, [sorted, base]);

  const netPnl = series[series.length - 1] - base;
  const toDisplay = (v: number) => pct ? ((v - base) / base) * 100 : v;
  const fmtAxis = (v: number) => pct ? `${v >= 0 ? "" : "-"}${Math.abs(v).toFixed(1)}%` : axisMoney(v);

  if (sorted.length < 2) {
    return (
      <div className="rounded-xl p-5" style={{ background: "#0A0A0A", border: "1px solid #1A1A1A" }}>
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp size={17} style={{ color: "#FF3B3B" }} />
          <h4 className="font-sans font-bold text-white text-base">Equity Curve</h4>
        </div>
        <div className="flex items-center justify-center h-40" style={{ color: "#444" }}>
          <p className="font-sans text-sm">Need 2+ closed trades to show the curve</p>
        </div>
      </div>
    );
  }

  const dvals = series.map(toDisplay);
  const dbase = toDisplay(base);
  const lo = Math.min(...dvals, dbase);
  const hi = Math.max(...dvals, dbase);
  const spanRaw = hi - lo || Math.abs(dbase) * 0.1 || 1;
  const padV = spanRaw * 0.35;                 // headroom so the line isn't flush
  const min = lo - padV, max = hi + padV;
  const span = max - min;

  const W = 720, H = 260, padL = 62, padR = 16, padT = 16, padB = 30;
  const x = (i: number) => padL + (i / (series.length - 1)) * (W - padL - padR);
  const y = (v: number) => padT + (1 - (v - min) / span) * (H - padT - padB);

  const pts = dvals.map((v, i) => ({ x: x(i), y: y(v) }));
  const baseY = y(dbase);

  // Split the path where it crosses the baseline so each part takes its colour
  const segments: { d: string; up: boolean }[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = dvals[i], b = dvals[i + 1];
    const aUp = a >= dbase, bUp = b >= dbase;
    if (aUp === bUp) {
      segments.push({ d: `M ${pts[i].x} ${pts[i].y} L ${pts[i + 1].x} ${pts[i + 1].y}`, up: aUp });
    } else {
      const t = (dbase - a) / (b - a);          // crossing point
      const cx = pts[i].x + (pts[i + 1].x - pts[i].x) * t;
      segments.push({ d: `M ${pts[i].x} ${pts[i].y} L ${cx} ${baseY}`, up: aUp });
      segments.push({ d: `M ${cx} ${baseY} L ${pts[i + 1].x} ${pts[i + 1].y}`, up: bUp });
    }
  }

  const ticks = Array.from({ length: 5 }, (_, i) => max - (i / 4) * span);
  const day = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div className="rounded-xl p-5" style={{ background: "#0A0A0A", border: "1px solid #1A1A1A" }}>
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-center gap-2">
          <TrendingUp size={17} style={{ color: "#FF3B3B" }} />
          <h4 className="font-sans font-bold text-white text-base">Equity Curve</h4>
          <span title="Account balance after each closed trade. The dashed line is your starting size.">
            <Info size={13} style={{ color: "#555" }} />
          </span>
        </div>
        <div className="flex rounded-lg overflow-hidden shrink-0" style={{ border: "1px solid #262626" }}>
          {(["$", "%"] as const).map(m => {
            const active = mode === m;
            const usable = m === "$" || (accountSize !== null && accountSize > 0);
            return (
              <button key={m} onClick={() => usable && setMode(m)}
                title={usable ? undefined : "Pick a single account to see percentages"}
                className="px-3.5 py-1.5 font-sans text-sm font-semibold transition-all"
                style={{
                  background: active ? "#EF4444" : "transparent",
                  color: active ? "#fff" : usable ? "#8A8A8A" : "#3A3A3A",
                  cursor: usable ? "pointer" : "not-allowed",
                }}>
                {m}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <p className="font-sans text-sm" style={{ color: "#8A8A8A" }}>
          Account size: <span className="font-semibold" style={{ color: "#E0E0E0" }}>
            {accountSize !== null ? axisMoney(accountSize) : "None"}
          </span>
        </p>
        <p className="font-sans text-lg font-bold" style={{ color: netPnl >= 0 ? "#22C55E" : "#EF4444" }}>
          {netPnl >= 0 ? "+" : "−"}{pct
            ? `${Math.abs((netPnl / base) * 100).toFixed(2)}%`
            : `$${Math.abs(netPnl).toFixed(2)}`}
        </p>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 260 }}>
        {ticks.map((t, i) => (
          <text key={i} x={padL - 10} y={y(t) + 4} textAnchor="end"
            className="font-sans" fontSize="11" fill="#8A8A8A">
            {fmtAxis(t)}
          </text>
        ))}

        {/* Starting balance */}
        <line x1={padL} y1={baseY} x2={W - padR} y2={baseY}
          stroke="#5A5A5A" strokeWidth="1.5" strokeDasharray="7 6" />

        {segments.map((s, i) => (
          <path key={i} d={s.d} fill="none" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"
            stroke={s.up ? "#22C55E" : "#EF4444"} />
        ))}

        <text x={padL} y={H - 8} className="font-sans" fontSize="11" fill="#8A8A8A">
          {day(sorted[0].date)}
        </text>
        <text x={W - padR} y={H - 8} textAnchor="end" className="font-sans" fontSize="11" fill="#8A8A8A">
          {day(sorted[sorted.length - 1].date)}
        </text>
      </svg>
    </div>
  );
}

function OutcomeDonut({ wins, losses, bes }: { wins: number; losses: number; bes: number }) {
  const total = wins + losses + bes || 1;
  const data = [
    { label: "WIN",  count: wins,   color: "#00FF7F", pct: Math.round((wins   / total) * 100) },
    { label: "LOSS", count: losses, color: "#FF3B3B", pct: Math.round((losses / total) * 100) },
    { label: "BE",   count: bes,    color: "#6AECE1", pct: Math.round((bes    / total) * 100) },
  ];
  return (
    <div className="flex flex-col gap-2">
      {data.map(({ label, count, color, pct }) => (
        <div key={label} className="flex items-center gap-2">
          <span className="font-mono text-[9px] uppercase w-8" style={{ color: "#555" }}>{label}</span>
          <MiniBar value={count} max={total} color={color} />
          <span className="font-mono text-xs font-bold w-6 text-right" style={{ color }}>{pct}%</span>
          <span className="font-mono text-[10px] w-4 text-right" style={{ color: "#444" }}>{count}</span>
        </div>
      ))}
    </div>
  );
}

function NotionSyncCard() {
  const { state } = useSabar();
  const [connected, setConnected] = useState(false);
  const [token, setToken] = useState("");
  const [page, setPage]   = useState("");
  const [busy, setBusy]   = useState(false);
  const [msg, setMsg]     = useState<string | null>(null);

  useEffect(() => { setConnected(notionConnected()); }, []);

  const connect = async () => {
    if (!token.trim() || !page.trim()) { setMsg("Paste both the secret key and the page link first."); return; }
    setBusy(true); setMsg("Connecting…");
    try {
      await notionConnect(token.trim(), page.trim());
      setConnected(true);
      setMsg("Connected! Sending your trades…");
      const r = await notionSyncTrades(state);
      setMsg(`✓ Done — ${r.created + r.updated} trades are in Notion`);
      setToken(""); setPage("");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Connection failed");
    }
    setBusy(false);
  };

  const syncNow = async () => {
    setBusy(true); setMsg("Syncing…");
    try {
      const r = await notionSyncTrades(state);
      setMsg(`✓ Synced — ${r.created} new, ${r.updated} updated`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Sync failed");
    }
    setBusy(false);
  };

  const disconnect = () => { notionDisconnect(); setConnected(false); setMsg(null); };

  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 size={13} style={{ color: connected ? "#00FF7F" : "#666" }} />
          <span className="font-mono text-xs font-bold text-white">Notion Sync</span>
          <span className="font-mono text-[9px] px-2 py-0.5 rounded"
            style={connected
              ? { background: "rgba(0,255,127,0.1)", color: "#00FF7F" }
              : { background: "rgba(255,255,255,0.05)", color: "#666" }}>
            {connected ? "CONNECTED — trades sync automatically" : "NOT CONNECTED"}
          </span>
        </div>
        {connected && (
          <div className="flex items-center gap-2">
            <button onClick={syncNow} disabled={busy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-[10px] text-[#6AECE1] hover:bg-white/5 transition-all disabled:opacity-50"
              style={{ border: "1px solid rgba(106,236,225,0.3)" }}>
              <RefreshCw size={11} className={busy ? "animate-spin" : ""} /> Sync now
            </button>
            <button onClick={disconnect}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-[10px] text-[#666] hover:text-[#FF3B3B] hover:bg-white/5 transition-all">
              <Unlink size={11} /> Disconnect
            </button>
          </div>
        )}
      </div>
      {!connected && (
        <div className="space-y-2">
          <p className="font-mono text-[10px] text-[#555]">
            1. Create a key at <span className="text-[#6AECE1]">notion.so/my-integrations</span> →
            2. Share your Notion page with it →
            3. Paste both below.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <input type="password" value={token} onChange={e => setToken(e.target.value)}
              placeholder="Notion secret key (ntn_… or secret_…)"
              className="px-3 py-2 rounded-lg font-mono text-[11px] text-white bg-black outline-none"
              style={{ border: "1px solid #1A1A1A" }} />
            <input type="text" value={page} onChange={e => setPage(e.target.value)}
              placeholder="Notion page link (https://notion.so/…)"
              className="px-3 py-2 rounded-lg font-mono text-[11px] text-white bg-black outline-none"
              style={{ border: "1px solid #1A1A1A" }} />
          </div>
          <button onClick={connect} disabled={busy}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-mono text-xs font-bold transition-all disabled:opacity-50"
            style={{ background: "rgba(229,62,62,0.12)", color: "#E53E3E", border: "1px solid rgba(229,62,62,0.3)" }}>
            <Link2 size={12} /> Connect Notion
          </button>
        </div>
      )}
      {msg && <p className="font-mono text-[10px]" style={{ color: msg.startsWith("✓") ? "#00FF7F" : "#F5A623" }}>{msg}</p>}
    </div>
  );
}

type ProfileAccount = { id: string; name: string; balance: number };

const AVATAR_KEY = "sabar-profile-avatar";

const DAYS_FULL: Record<string, string> = {
  Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday",
};

const TIME_RANGES: Record<string, number> = {
  "Last 7 days": 7, "Last 14 days": 14, "Last 30 days": 30, "Last 90 days": 90,
};

export default function ProfilePage() {
  const { state } = useSabar();
  const { user } = useAuth();
  const [copiedNotion, setCopiedNotion] = useState(false);

  // ── Filters: time range + linked trading account ──
  const [timeRange,   setTimeRange]   = useState("All Time");
  const [accountId,   setAccountId]   = useState("All Accounts");
  const [accounts,    setAccounts]    = useState<ProfileAccount[]>([]);
  const [tradeLinks,  setTradeLinks]  = useState<Record<string, string>>({});

  // Starting balance of the account in view. "All Accounts" mixes several
  // sizes, so there is no single figure to plot the curve against.
  const selectedAccountSize = useMemo(() => {
    if (accountId === "All Accounts") return null;
    return accounts.find(a => a.id === accountId)?.balance ?? null;
  }, [accountId, accounts]);

  // Profile picture (stored locally as a data URL)
  const [avatar, setAvatar] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      setAccounts(JSON.parse(localStorage.getItem("sabar-trading-accounts") ?? "[]"));
      setTradeLinks(JSON.parse(localStorage.getItem("sabar-trade-links") ?? "{}"));
      setAvatar(localStorage.getItem(AVATAR_KEY));
    } catch {}
  }, []);

  const pickAvatar = (file?: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const url = ev.target?.result as string;
      setAvatar(url);
      try { localStorage.setItem(AVATAR_KEY, url); } catch {}
    };
    reader.readAsDataURL(file);
  };

  const clearAvatar = () => {
    setAvatar(null);
    try { localStorage.removeItem(AVATAR_KEY); } catch {}
  };

  // Every stat below is derived from this filtered set.
  const trades = useMemo(() => {
    const now = Date.now();
    return state.trades.filter(t => {
      if (timeRange in TIME_RANGES &&
          new Date(t.date).getTime() < now - TIME_RANGES[timeRange] * 86_400_000) return false;
      if (accountId !== "All Accounts" && tradeLinks[t.id] !== accountId) return false;
      return true;
    });
  }, [state.trades, timeRange, accountId, tradeLinks]);

  const copyForNotion = async () => {
    try {
      await navigator.clipboard.writeText(buildNotionMarkdown(state));
      setCopiedNotion(true);
      setTimeout(() => setCopiedNotion(false), 2500);
    } catch {
      alert("Could not copy — please allow clipboard access and try again.");
    }
  };

  const taken = useMemo(() => trades.filter(t => t.decision === "TAKE"), [trades]);
  const wins   = taken.filter(t => t.outcome === "WIN");
  const losses = taken.filter(t => t.outcome === "LOSS");
  const bes    = taken.filter(t => t.outcome === "BE");

  const winRate    = taken.length > 0 ? Math.round((wins.length / taken.length) * 100) : 0;
  const avgR       = wins.length > 0 ? (wins.reduce((s, t) => s + (t.rr ?? 0), 0) / wins.length) : 0;
  const totalPnl   = taken.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const totalR     = taken.reduce((s, t) => s + (wins.includes(t) ? (t.rr ?? 0) : losses.includes(t) ? -(t.rr ?? 0) : 0), 0);

  const avgWinPnl  = wins.length > 0  ? wins.reduce((s, t) => s + (t.pnl ?? 0), 0) / wins.length   : 0;
  const avgLossPnl = losses.length > 0 ? losses.reduce((s, t) => s + (t.pnl ?? 0), 0) / losses.length : 0;
  const profitFactor = losses.length > 0 && avgLossPnl !== 0
    ? Math.abs((wins.reduce((s, t) => s + (t.pnl ?? 0), 0)) / (losses.reduce((s, t) => s + (t.pnl ?? 0), 0))).toFixed(2)
    : wins.length > 0 ? "∞" : "0.00";

  const bestTrade  = taken.reduce<Trade | null>((best, t) => (!best || (t.pnl ?? 0) > (best.pnl ?? 0)) ? t : best, null);
  const worstTrade = taken.reduce<Trade | null>((worst, t) => (!worst || (t.pnl ?? 0) < (worst.pnl ?? 0)) ? t : worst, null);

  // Max consecutive wins/losses
  let maxWinStreak = 0, maxLossStreak = 0, curWin = 0, curLoss = 0;
  [...taken].sort((a, b) => a.date.localeCompare(b.date)).forEach(t => {
    if (t.outcome === "WIN") { curWin++; curLoss = 0; maxWinStreak = Math.max(maxWinStreak, curWin); }
    else if (t.outcome === "LOSS") { curLoss++; curWin = 0; maxLossStreak = Math.max(maxLossStreak, curLoss); }
    else { curWin = 0; curLoss = 0; }
  });

  // Psychology tag frequency
  const psychCount: Record<string, number> = {};
  trades.forEach(t => t.psychology?.forEach(p => { psychCount[p] = (psychCount[p] ?? 0) + 1; }));
  const topPsych = Object.entries(psychCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Discipline
  const discipline = trades.length > 0
    ? Math.round((trades.filter(t => tradePct(t) >= 70).length / trades.length) * 100)
    : 0;

  // Session breakdown
  const sessionMap = taken.reduce((acc, t) => {
    const s = t.session === "ASIAN" ? "Asian" : t.session === "LONDON" ? "London" : "New York";
    if (!acc[s]) acc[s] = { wins: 0, losses: 0, total: 0, r: 0 };
    acc[s].total++;
    if (t.outcome === "WIN")  { acc[s].wins++;   acc[s].r += (t.rr ?? 0); }
    if (t.outcome === "LOSS") { acc[s].losses++; acc[s].r -= (t.rr ?? 0); }
    return acc;
  }, {} as Record<string, { wins: number; losses: number; total: number; r: number }>);
  const sessionBreakdown = Object.entries(sessionMap);

  // Day of week
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayMap: Record<string, { wins: number; losses: number; total: number; pnl: number }> = {};
  taken.forEach(t => {
    const d = DAYS[new Date(t.date).getDay()];
    if (!dayMap[d]) dayMap[d] = { wins: 0, losses: 0, total: 0, pnl: 0 };
    dayMap[d].total++;
    if (t.outcome === "WIN")  dayMap[d].wins++;
    if (t.outcome === "LOSS") dayMap[d].losses++;
    dayMap[d].pnl += t.pnl ?? 0;
  });
  const tradingDays = ["Mon", "Tue", "Wed", "Thu", "Fri"].map(d => ({ day: d, ...(dayMap[d] ?? { wins: 0, losses: 0, total: 0, pnl: 0 }) }));
  const maxDayTotal = Math.max(...tradingDays.map(d => d.total), 1);

  // Top pairs
  const pairMap: Record<string, { r: number; count: number }> = {};
  wins.forEach(t => {
    if (!pairMap[t.pair]) pairMap[t.pair] = { r: 0, count: 0 };
    pairMap[t.pair].r += t.rr ?? 0;
    pairMap[t.pair].count++;
  });
  const topPairs = Object.entries(pairMap).sort((a, b) => b[1].r - a[1].r).slice(0, 3);

  // Grade distribution (matches the app grade scale: A+ A A- B C+ D+)
  const grades = [
    { grade: "A+", color: "#22C55E", bg: "rgba(34,197,94,0.08)",  count: trades.filter(t => tradePct(t) >= 100).length },
    { grade: "A",  color: "#4ADE80", bg: "rgba(74,222,128,0.08)", count: trades.filter(t => tradePct(t) >= 92 && tradePct(t) < 100).length },
    { grade: "A-", color: "#4ADE80", bg: "rgba(74,222,128,0.08)", count: trades.filter(t => tradePct(t) >= 83 && tradePct(t) < 92).length },
    { grade: "B",  color: "#6AECE1", bg: "rgba(106,236,225,0.08)", count: trades.filter(t => tradePct(t) >= 75 && tradePct(t) < 83).length },
    { grade: "C+", color: "#F59E0B", bg: "rgba(245,158,11,0.08)", count: trades.filter(t => tradePct(t) >= 67 && tradePct(t) < 75).length },
    { grade: "D+", color: "#F97316", bg: "rgba(249,115,22,0.08)", count: trades.filter(t => tradePct(t) < 67).length },
  ];

  const topSession = Object.entries(sessionMap).sort((a, b) => b[1].total - a[1].total)[0]?.[0] ?? "—";
  const initials = user?.name?.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2) ?? "?";

  // ── AI Review: coaching insights derived from the filtered trades ──
  const insights: { tag: string; text: string; color: string; Icon: typeof TrendingUp }[] = [];
  const bestSession = Object.entries(sessionMap)
    .filter(([, d]) => d.total > 0)
    .sort((a, b) => (b[1].r / b[1].total) - (a[1].r / a[1].total))[0];
  if (bestSession) {
    const [name, d] = bestSession;
    insights.push({
      tag: "Session", color: "#22C55E", Icon: TrendingUp,
      text: `Your best performance comes from ${name} session with an average of ${(d.r / d.total).toFixed(1)}R per trade.`,
    });
  }
  const bestDay = [...tradingDays].filter(d => d.total > 0).sort((a, b) => b.pnl - a.pnl)[0];
  if (bestDay) {
    insights.push({
      tag: "Timing", color: "#60A5FA", Icon: Info,
      text: `${DAYS_FULL[bestDay.day] ?? bestDay.day} tends to be your best trading day. Consider focusing your energy on these days.`,
    });
  }
  if (discipline < 70 && trades.length > 0) {
    insights.push({
      tag: "Discipline", color: "#F59E0B", Icon: Target,
      text: `Only ${discipline}% of your trades met 70%+ of your checklist. Tightening rule-following is your fastest edge.`,
    });
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5 p-4 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href="/history" className="flex items-center gap-1.5 text-xs font-mono text-[#444] hover:text-white transition-colors">
          <ArrowLeft size={13} /> Back to Journal
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/history" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs text-[#555] hover:text-white hover:bg-white/5 transition-all">
            <BookOpen size={12} /> Journal
          </Link>
          <Link href="/accounts" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs text-[#555] hover:text-white hover:bg-white/5 transition-all">
            <Layers size={12} /> Accounts
          </Link>
          <button onClick={copyForNotion}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs transition-all"
            style={copiedNotion
              ? { background: "rgba(0,255,127,0.12)", color: "#00FF7F", border: "1px solid rgba(0,255,127,0.3)" }
              : { background: "rgba(229,62,62,0.12)", color: "#E53E3E", border: "1px solid rgba(229,62,62,0.3)" }}>
            {copiedNotion ? <Check size={12} /> : <ClipboardCopy size={12} />}
            {copiedNotion ? "Copied! Paste in Notion" : "Copy for Notion"}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(229,62,62,0.15)", border: "1px solid rgba(229,62,62,0.3)" }}>
          <User size={20} style={{ color: "#E53E3E" }} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-mono font-bold text-white text-lg tracking-wide">Trader Profile</h1>
            {user?.role === "admin" && (
              <span className="px-2 py-0.5 rounded font-mono text-[9px] font-bold" style={{ background: "rgba(229,62,62,0.15)", color: "#E53E3E" }}>Admin</span>
            )}
          </div>
          <p className="font-mono text-[10px] text-[#444]">Self-analysis & performance intelligence</p>
        </div>
      </div>

      {/* Filters — time range + linked account */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>
          <Calendar size={14} style={{ color: "#666" }} />
          <select value={timeRange} onChange={e => setTimeRange(e.target.value)}
            className="bg-transparent font-sans text-sm text-white focus:outline-none cursor-pointer">
            {["All Time", ...Object.keys(TIME_RANGES)].map(r => (
              <option key={r} value={r} style={{ background: "#0D0D0D" }}>{r}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>
          <CreditCard size={14} style={{ color: "#666" }} />
          <select value={accountId} onChange={e => setAccountId(e.target.value)}
            className="bg-transparent font-sans text-sm text-white focus:outline-none cursor-pointer">
            <option value="All Accounts" style={{ background: "#0D0D0D" }}>All Accounts</option>
            {accounts.map(a => (
              <option key={a.id} value={a.id} style={{ background: "#0D0D0D" }}>{a.name}</option>
            ))}
          </select>
        </div>
        {(timeRange !== "All Time" || accountId !== "All Accounts") && (
          <span className="font-sans text-xs" style={{ color: "#666" }}>
            {trades.length} trade{trades.length !== 1 ? "s" : ""} in view
          </span>
        )}
      </div>

      {/* Trader Snapshot + AI Review */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 rounded-xl p-5 space-y-4" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>
          <div className="flex items-center gap-3">
            {/* Avatar — click to upload a profile picture */}
            <div className="relative group shrink-0">
              <button
                onClick={() => avatarInputRef.current?.click()}
                title="Click to change profile picture"
                className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center font-mono font-black text-lg transition-all"
                style={avatar
                  ? { border: "1px solid rgba(229,62,62,0.5)" }
                  : { background: "#E53E3E", color: "#fff" }}>
                {avatar
                  ? <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
                  : initials}
              </button>
              {/* Hover overlay */}
              <div onClick={() => avatarInputRef.current?.click()}
                className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                style={{ background: "rgba(0,0,0,0.6)" }}>
                <ImagePlus size={16} style={{ color: "#fff" }} />
              </div>
              {avatar && (
                <button onClick={clearAvatar} title="Remove picture"
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity"
                  style={{ background: "#1A1A1A", border: "1px solid #2A2A2A", color: "#999" }}>
                  <X size={10} />
                </button>
              )}
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden"
                onChange={e => { pickAvatar(e.target.files?.[0]); e.target.value = ""; }} />
            </div>
            <div>
              <p className="font-mono font-bold text-white">{user?.name ?? "Trader"}</p>
              <p className="font-mono text-[10px] text-[#444]">{trades.length} total trades</p>
              <p className="font-mono text-[9px] mt-0.5" style={{ color: "#333" }}>Hover avatar to change</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Primary Session", value: topSession, sub: "Most traded session",  Icon: Target,    color: "#6AECE1" },
              { label: "AVG R/Trade",     value: `+${avgR.toFixed(2)}R`, sub: "Per completed trade", Icon: TrendingUp, color: "#00FF7F" },
              { label: "Win Rate",        value: `${winRate}%`, sub: `${wins.length}W / ${losses.length}L`, Icon: BarChart2, color: "#00FF7F" },
              { label: "Discipline",      value: `${discipline}%`, sub: discipline >= 70 ? "Good" : discipline >= 50 ? "Average" : "Needs work", Icon: Target, color: discipline >= 70 ? "#00FF7F" : "#F5A623" },
            ].map(({ label, value, sub, Icon, color }) => (
              <div key={label} className="p-3 rounded-xl" style={{ background: "#0A0A0A", border: "1px solid #1A1A1A" }}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Icon size={11} style={{ color }} />
                  <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: "#444" }}>{label}</p>
                </div>
                <p className="font-mono font-black text-sm" style={{ color }}>{value}</p>
                <p className="font-mono text-[9px] mt-0.5" style={{ color: "#444" }}>{sub}</p>
              </div>
            ))}
          </div>
          {topPairs.length > 0 && (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest mb-2" style={{ color: "#444" }}>Top Performing Pairs</p>
              <div className="flex gap-2 flex-wrap">
                {topPairs.map(([pair, { r, count }]) => (
                  <span key={pair} className="px-3 py-1 rounded-full font-mono text-xs font-bold"
                    style={{ background: "rgba(229,62,62,0.12)", color: "#E53E3E", border: "1px solid rgba(229,62,62,0.2)" }}>
                    {pair} +{r.toFixed(1)}R ({Math.round((count / taken.length) * 100)}%)
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">

        {/* Daily Rituals */}
        <DailyRitualCard />

        {/* AI Review */}
        <div className="rounded-xl p-5" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.3)" }}>
              <Brain size={17} style={{ color: "#A78BFA" }} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-sans font-bold text-white text-base">AI Review</h3>
                <Sparkles size={13} style={{ color: "#A78BFA" }} />
              </div>
              <p className="font-sans text-[11px]" style={{ color: "#8A8A8A" }}>Coaching insights based on your trading data</p>
            </div>
          </div>

          {insights.length === 0 ? (
            <p className="font-sans text-xs py-6 text-center" style={{ color: "#555" }}>
              Log a few trades and your coaching insights will appear here.
            </p>
          ) : (
            <div className="space-y-3">
              {insights.map(({ tag, text, color, Icon }) => (
                <div key={tag} className="rounded-xl px-4 py-3"
                  style={{ background: `${color}0D`, border: `1px solid ${color}40` }}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Icon size={12} style={{ color }} />
                    <span className="font-sans text-[10px] font-bold uppercase tracking-widest" style={{ color }}>{tag}</span>
                  </div>
                  <p className="font-sans text-[13px] leading-snug" style={{ color: "#D0D0D0" }}>{text}</p>
                </div>
              ))}
            </div>
          )}

          <p className="font-sans text-[10px] text-center mt-4 leading-relaxed" style={{ color: "#555" }}>
            <span className="font-bold">Note:</span> These insights are based on your historical trading data.
            They are for self-improvement only and do not constitute financial advice.
          </p>
        </div>
        </div>
      </div>

      {/* Session Breakdown */}
      <div className="rounded-xl p-5" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>
        <p className="font-mono text-xs font-bold text-white mb-3">Session Breakdown</p>
        {sessionBreakdown.length === 0 ? (
          <p className="font-mono text-[10px] text-[#333]">No data yet</p>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {sessionBreakdown.map(([session, data]) => (
              <div key={session} className="p-3 rounded-lg" style={{ background: "#0A0A0A", border: "1px solid #1A1A1A" }}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="font-mono text-xs font-bold text-white">{session}</p>
                  <span className="font-mono text-[10px]" style={{ color: data.r >= 0 ? "#00FF7F" : "#FF3B3B" }}>
                    {data.r >= 0 ? "+" : ""}{data.r.toFixed(1)}R
                  </span>
                </div>
                <MiniBar value={data.wins} max={data.total} color="#00FF7F" />
                <p className="font-mono text-[9px] mt-1" style={{ color: "#444" }}>{data.wins}W / {data.losses}L</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Trade Calendar */}
      <div className="rounded-xl p-5" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>
        <SectionHeader icon={Calendar} title="Trade Calendar" sub="Monthly P&L heatmap by trading day" color="#6AECE1" />
        <TradeCalendar trades={trades} />
      </div>

      {/* Visual Analytics */}
      <div className="rounded-xl p-5" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>
        <SectionHeader icon={Activity} title="Visual Analytics" sub="Performance charts and distribution" color="#6AECE1" />
        {/* Equity Curve — full width above the split */}
        <div className="mb-5">
          <EquityCurveCard trades={trades} accountSize={selectedAccountSize} />
        </div>

        {/* Outcome Distribution */}
        <div className="rounded-xl p-4" style={{ background: "#0A0A0A", border: "1px solid #1A1A1A" }}>
          <p className="font-mono text-[10px] uppercase tracking-widest mb-3" style={{ color: "#444" }}>Outcome Split</p>
          <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-5 items-center">
            <OutcomeDonut wins={wins.length} losses={losses.length} bes={bes.length} />
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {grades.map(({ grade, color, bg, count }) => (
                <div key={grade} className="p-2 rounded-lg text-center" style={{ background: bg, border: `1px solid ${color}22` }}>
                  <p className="font-sans font-black text-base" style={{ color }}>{grade}</p>
                  <p className="font-sans text-xs text-white font-bold">{count}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Risk & Behavior Metrics */}
      <div className="rounded-xl p-5" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>
        <SectionHeader icon={Brain} title="Risk & Behavior Metrics" sub="Psychology patterns and discipline tracking" color="#F5A623" />
        <div className="grid grid-cols-3 gap-4">
          {/* Psychology tags */}
          <div className="rounded-xl p-4 space-y-3" style={{ background: "#0A0A0A", border: "1px solid #1A1A1A" }}>
            <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "#444" }}>Psychology Frequency</p>
            {topPsych.length === 0 ? (
              <p className="font-mono text-[10px] text-[#333]">No data yet</p>
            ) : topPsych.map(([tag, count]) => {
              const color = tag === "FOMO" ? "#FF3B3B" : tag === "CALM" ? "#00FF7F" : tag === "FEAR" ? "#F5A623" : tag === "GREED" ? "#FF3B3B" : "#6AECE1";
              return (
                <div key={tag} className="flex items-center gap-2">
                  <span className="font-mono text-[9px] uppercase w-14 flex-shrink-0" style={{ color: "#555" }}>{tag}</span>
                  <MiniBar value={count} max={Math.max(...topPsych.map(([, c]) => c))} color={color} />
                  <span className="font-mono text-xs font-bold w-4 text-right" style={{ color }}>{count}</span>
                </div>
              );
            })}
          </div>

          {/* Streak & discipline */}
          <div className="rounded-xl p-4 space-y-3" style={{ background: "#0A0A0A", border: "1px solid #1A1A1A" }}>
            <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "#444" }}>Streaks</p>
            <div className="flex flex-col gap-3">
              <div className="p-3 rounded-lg" style={{ background: "rgba(0,255,127,0.06)", border: "1px solid rgba(0,255,127,0.15)" }}>
                <p className="font-mono text-[9px] uppercase" style={{ color: "#444" }}>Best Win Streak</p>
                <p className="font-mono font-black text-2xl" style={{ color: "#00FF7F" }}>{maxWinStreak}</p>
                <p className="font-mono text-[9px]" style={{ color: "#444" }}>consecutive wins</p>
              </div>
              <div className="p-3 rounded-lg" style={{ background: "rgba(255,59,59,0.06)", border: "1px solid rgba(255,59,59,0.15)" }}>
                <p className="font-mono text-[9px] uppercase" style={{ color: "#444" }}>Max Loss Streak</p>
                <p className="font-mono font-black text-2xl" style={{ color: "#FF3B3B" }}>{maxLossStreak}</p>
                <p className="font-mono text-[9px]" style={{ color: "#444" }}>consecutive losses</p>
              </div>
            </div>
          </div>

          {/* Rule adherence */}
          <div className="rounded-xl p-4 space-y-3" style={{ background: "#0A0A0A", border: "1px solid #1A1A1A" }}>
            <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "#444" }}>Rule Adherence</p>
            <div className="flex flex-col gap-2">
              {grades.map(({ grade, color, bg, count }) => {
                const pct = trades.length > 0 ? Math.round((count / trades.length) * 100) : 0;
                return (
                  <div key={grade} className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold w-5" style={{ color }}>{grade}</span>
                    <MiniBar value={count} max={trades.length || 1} color={color} />
                    <span className="font-mono text-[10px] w-8 text-right" style={{ color: "#444" }}>{pct}%</span>
                  </div>
                );
              })}
              <div className="pt-2 border-t mt-1" style={{ borderColor: "#1A1A1A" }}>
                <p className="font-mono text-[9px]" style={{ color: "#444" }}>Discipline score</p>
                <p className="font-mono font-black text-xl" style={{ color: discipline >= 70 ? "#00FF7F" : "#F5A623" }}>{discipline}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Statistics */}
      <div className="rounded-xl p-5" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>
        <SectionHeader icon={BarChart2} title="Performance Statistics" sub="Detailed trade metrics and key ratios" color="#00FF7F" />
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total R",       value: `${totalR >= 0 ? "+" : ""}${totalR.toFixed(1)}R`, color: totalR >= 0 ? "#00FF7F" : "#FF3B3B" },
            { label: "Total P&L",     value: `${totalPnl >= 0 ? "+" : ""}$${totalPnl.toFixed(2)}`, color: totalPnl >= 0 ? "#00FF7F" : "#FF3B3B" },
            { label: "Profit Factor", value: profitFactor, color: "#6AECE1" },
            { label: "Win Rate",      value: `${winRate}%`, color: "#00FF7F" },
            { label: "Avg Win",       value: wins.length > 0 ? `+$${avgWinPnl.toFixed(2)}` : "—", color: "#00FF7F" },
            { label: "Avg Loss",      value: losses.length > 0 ? `$${avgLossPnl.toFixed(2)}` : "—", color: "#FF3B3B" },
            { label: "Best Trade",    value: bestTrade?.pnl != null ? `+$${bestTrade.pnl.toFixed(2)}` : "—", color: "#00FF7F" },
            { label: "Worst Trade",   value: worstTrade?.pnl != null ? `$${worstTrade.pnl.toFixed(2)}` : "—", color: "#FF3B3B" },
          ].map(({ label, value, color }) => (
            <div key={label} className="p-4 rounded-xl" style={{ background: "#0A0A0A", border: "1px solid #1A1A1A" }}>
              <p className="font-mono text-[9px] uppercase tracking-widest mb-2" style={{ color: "#444" }}>{label}</p>
              <p className="font-mono font-black text-base" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Time-based Analysis */}
      <div className="rounded-xl p-5" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>
        <SectionHeader icon={Clock} title="Time-based Analysis" sub="Performance patterns by day and session" color="#A78BFA" />
        <div className="grid grid-cols-2 gap-5">
          {/* Day of week */}
          <div className="rounded-xl p-4" style={{ background: "#0A0A0A", border: "1px solid #1A1A1A" }}>
            <p className="font-mono text-[10px] uppercase tracking-widest mb-4" style={{ color: "#444" }}>Performance by Day</p>
            <div className="space-y-2.5">
              {tradingDays.map(({ day, wins: w, losses: l, total, pnl }) => {
                const wr = total > 0 ? Math.round((w / total) * 100) : 0;
                const barColor = wr >= 60 ? "#00FF7F" : wr >= 40 ? "#F5A623" : total > 0 ? "#FF3B3B" : "#2A2A2A";
                return (
                  <div key={day} className="flex items-center gap-3">
                    <span className="font-mono text-[10px] font-bold w-7 flex-shrink-0" style={{ color: "#555" }}>{day}</span>
                    <MiniBar value={total} max={maxDayTotal} color={barColor} />
                    <span className="font-mono text-[10px] w-8 text-right" style={{ color: "#444" }}>{total > 0 ? `${total}T` : "—"}</span>
                    <span className="font-mono text-[10px] w-12 text-right" style={{ color: total > 0 ? (pnl >= 0 ? "#00FF7F" : "#FF3B3B") : "#333" }}>
                      {total > 0 ? `${pnl >= 0 ? "+" : ""}$${pnl.toFixed(0)}` : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Session vs session */}
          <div className="rounded-xl p-4" style={{ background: "#0A0A0A", border: "1px solid #1A1A1A" }}>
            <p className="font-mono text-[10px] uppercase tracking-widest mb-4" style={{ color: "#444" }}>Session Performance</p>
            {sessionBreakdown.length === 0 ? (
              <p className="font-mono text-[10px] text-[#333]">No session data yet</p>
            ) : (
              <div className="space-y-4">
                {sessionBreakdown.map(([session, data]) => {
                  const wr = data.total > 0 ? Math.round((data.wins / data.total) * 100) : 0;
                  return (
                    <div key={session} className="p-4 rounded-xl space-y-2" style={{ background: "#111", border: "1px solid #1A1A1A" }}>
                      <div className="flex items-center justify-between">
                        <p className="font-mono text-sm font-bold text-white">{session}</p>
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded"
                          style={{ background: wr >= 50 ? "rgba(0,255,127,0.12)" : "rgba(255,59,59,0.12)", color: wr >= 50 ? "#00FF7F" : "#FF3B3B" }}>
                          {wr}% WR
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="font-mono text-[9px] uppercase" style={{ color: "#444" }}>Trades</p>
                          <p className="font-mono font-bold text-white">{data.total}</p>
                        </div>
                        <div>
                          <p className="font-mono text-[9px] uppercase" style={{ color: "#444" }}>W/L</p>
                          <p className="font-mono font-bold" style={{ color: "#00FF7F" }}>{data.wins}W / {data.losses}L</p>
                        </div>
                        <div>
                          <p className="font-mono text-[9px] uppercase" style={{ color: "#444" }}>Total R</p>
                          <p className="font-mono font-bold" style={{ color: data.r >= 0 ? "#00FF7F" : "#FF3B3B" }}>
                            {data.r >= 0 ? "+" : ""}{data.r.toFixed(1)}R
                          </p>
                        </div>
                      </div>
                      <MiniBar value={data.wins} max={data.total || 1} color="#00FF7F" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notion connection */}
      <NotionSyncCard />
    </div>
  );
}
