"use client";
import { useState, useMemo, useEffect } from "react";
import { useSabar } from "@/store/SabarContext";
import { Trade } from "@/store/types";
import {
  BookOpen, TrendingUp, TrendingDown, Minus, Search,
  FileText, ArrowLeft, Award, AlertCircle, Brain, XCircle,
  User, CreditCard, Link2, ChevronDown, Plus, Trash2,
  Check, X, Clock, MapPin, CandlestickChart, CheckCircle2, Upload,
} from "lucide-react";
import Link from "next/link";
import { VoiceMic, appendNote } from "@/components/VoiceMic";
import { imgLoadTrade } from "@/lib/db";
import { ChartSnapshotPanel } from "@/components/journal/ChartSnapshotPanel";

const PROOF_SLOTS = [
  { key: "Weekly", label: "Weekly Proof", sub: "1W"         },
  { key: "Daily",  label: "Daily Proof",  sub: "1D"         },
  { key: "4H",     label: "4H Proof",     sub: "4H"         },
  { key: "15M",    label: "Entry Proof",  sub: "5m/15m"     },
  { key: "Result", label: "After",        sub: "TP/SL Result" },
] as const;

type Account = { id: string; name: string; balance: number };

/* ── helpers ─────────────────────────────────────────────── */
function tradePct(t: Trade) {
  return t.totalRules > 0 ? Math.round((t.checkedCount / t.totalRules) * 100) : 0;
}
function gradeInfo(pct: number) {
  if (pct >= 100) return { letter: "A+", color: "#22C55E", bg: "rgba(34,197,94,0.12)" };
  if (pct >= 92)  return { letter: "A",  color: "#4ADE80", bg: "rgba(74,222,128,0.12)" };
  if (pct >= 83)  return { letter: "A-", color: "#A3E635", bg: "rgba(163,230,53,0.12)" };
  if (pct >= 75)  return { letter: "B",  color: "#6AECE1", bg: "rgba(106,236,225,0.12)" };
  if (pct >= 67)  return { letter: "C+", color: "#F59E0B", bg: "rgba(245,158,11,0.12)" };
  if (pct >= 58)  return { letter: "D+", color: "#F97316", bg: "rgba(249,115,22,0.12)" };
  return               { letter: "D-", color: "#EF4444", bg: "rgba(239,68,68,0.12)" };
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
// When the trade was logged: explicit createdAt, else parse the id timestamp, else null (date only).
function tradeTime(t: Trade): Date | null {
  if (t.createdAt) return new Date(t.createdAt);
  const ts = parseInt(t.id.replace("trade-", ""), 10);
  return Number.isFinite(ts) && ts > 1e12 ? new Date(ts) : null;
}
function fmtDateTime(t: Trade) {
  const dt = tradeTime(t);
  return dt
    ? `${fmtDate(t.date)} • ${dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`
    : fmtDate(t.date);
}

/* ── outcome buttons config ──────────────────────────────── */
const OUTCOMES = [
  { key: "WIN",       label: "WIN",       Icon: TrendingUp,   color: "#00FF7F" },
  { key: "LOSS",      label: "LOSS",      Icon: TrendingDown, color: "#FF3B3B" },
  { key: "BE",        label: "BE",        Icon: Minus,        color: "#6AECE1" },
  { key: "MISSED",    label: "MISSED",    Icon: AlertCircle,  color: "#888" },
  { key: "EMOTIONAL", label: "EMOTIONAL", Icon: Brain,        color: "#F5A623" },
  { key: "WITHDRAW",  label: "WITHDRAW",  Icon: XCircle,      color: "#888" },
] as const;

/* ── main page ───────────────────────────────────────────── */
export default function HistoryPage() {
  const { state, dispatch } = useSabar();

  const [search,       setSearch]       = useState("");
  const [gradeFilter,  setGradeFilter]  = useState("All Grades");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [pairFilter,   setPairFilter]   = useState("All Pairs");
  const [timeFilter,   setTimeFilter]   = useState("All Time");
  const [selected,     setSelected]     = useState<Trade | null>(null);
  const [editNotes,    setEditNotes]    = useState("");
  const [editPnl,      setEditPnl]      = useState("");
  const [accounts,     setAccounts]     = useState<Account[]>([]);
  const [tradeLinks,   setTradeLinks]   = useState<Record<string, string>>({});
  const [showLinkDrop, setShowLinkDrop] = useState(false);
  const [modalTrade,   setModalTrade]   = useState<Trade | null>(null);
  const [modalProofs,  setModalProofs]  = useState<Record<string, string>>({});
  const [chartPanel,   setChartPanel]   = useState<Trade | null>(null);

  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem("sabar-trading-accounts") ?? "[]");
      const fixed = raw.map((a: Account, i: number) => ({ ...a, id: a.id ?? `acc-repair-${i}` }));
      setAccounts(fixed);
      setTradeLinks(JSON.parse(localStorage.getItem("sabar-trade-links") ?? "{}"));
    } catch {}
  }, []);

  // Load a trade's chart proofs (IndexedDB) whenever the detail modal opens
  useEffect(() => {
    if (!modalTrade) { setModalProofs({}); return; }
    let alive = true;
    imgLoadTrade(modalTrade.id).then(({ chartProofs }) => {
      if (alive) setModalProofs((chartProofs ?? {}) as Record<string, string>);
    }).catch(() => {});
    return () => { alive = false; };
  }, [modalTrade]);

  const saveLinks = (links: Record<string, string>) => {
    setTradeLinks(links);
    localStorage.setItem("sabar-trade-links", JSON.stringify(links));
  };

  const linkAccount = (tradeId: string, accountId: string) => {
    saveLinks({ ...tradeLinks, [tradeId]: accountId });
    setShowLinkDrop(false);
  };

  const unlinkAccount = (tradeId: string) => {
    const next = { ...tradeLinks };
    delete next[tradeId];
    saveLinks(next);
  };

  const TIME_DAYS: Record<string, number> = {
    "Last 7 days": 7, "Last 14 days": 14, "Last 20 days": 20, "Last 30 days": 30,
  };

  const pairs = useMemo(() =>
    Array.from(new Set(state.trades.map(t => t.pair))),
  [state.trades]);

  const filtered = useMemo(() => {
    const now = Date.now();
    return [...state.trades]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .filter(t => {
        if (timeFilter in TIME_DAYS) {
          if (new Date(t.date).getTime() < now - TIME_DAYS[timeFilter] * 86_400_000) return false;
        }
        if (gradeFilter !== "All Grades" && gradeInfo(tradePct(t)).letter !== gradeFilter) return false;
        if (statusFilter === "Taken"   && t.decision !== "TAKE") return false;
        if (statusFilter === "Skipped" && t.decision !== "SKIP") return false;
        if (pairFilter !== "All Pairs" && t.pair !== pairFilter) return false;
        if (search) {
          const q = search.toLowerCase();
          if (!t.pair.toLowerCase().includes(q) && !(t.notes ?? "").toLowerCase().includes(q)) return false;
        }
        return true;
      });
  }, [state.trades, timeFilter, gradeFilter, statusFilter, pairFilter, search]);

  /* stats */
  const totalTrades = filtered.length;
  const taken       = filtered.filter(t => t.decision === "TAKE").length;
  const skipped     = filtered.filter(t => t.decision === "SKIP").length;
  const aStar       = filtered.filter(t => tradePct(t) >= 90).length;

  const handleSelect = (t: Trade) => {
    setSelected(t);
    setEditNotes(t.notes ?? "");
    setEditPnl(t.pnl !== undefined ? String(Math.abs(t.pnl)) : "");
    setShowLinkDrop(false);
  };

  const setOutcome = (key: string) => {
    if (!selected) return;
    const outcome = key as Trade["outcome"];
    // Tapping an outcome saves everything (outcome + any pending notes)
    dispatch({ type: "UPDATE_TRADE", payload: { id: selected.id, outcome, notes: editNotes } });
    setSelected(prev => prev ? { ...prev, outcome, notes: editNotes } : null);
  };

  const commitNotes = () => {
    if (!selected || editNotes === (selected.notes ?? "")) return;
    dispatch({ type: "UPDATE_TRADE", payload: { id: selected.id, notes: editNotes } });
    setSelected(prev => prev ? { ...prev, notes: editNotes } : null);
  };

  /* ── JSX ── */
  return (
    <div className="max-w-7xl mx-auto space-y-4 p-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(229,62,62,0.15)", border: "1px solid rgba(229,62,62,0.3)" }}>
            <BookOpen size={20} style={{ color: "#E53E3E" }} />
          </div>
          <div>
            <h1 className="font-mono font-bold text-white text-lg tracking-wide">Trade Journal</h1>
            <p className="font-mono text-[10px] text-[#444]">Review your saved trades</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/profile"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all hover:opacity-90"
            style={{ background: "#1A1A1A", border: "1px solid #2A2A2A", color: "#aaa" }}>
            <User size={13} /> Profile
          </Link>
          <Link href="/accounts"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all hover:opacity-90"
            style={{ background: "#1A1A1A", border: "1px solid #2A2A2A", color: "#aaa" }}>
            <CreditCard size={13} /> Accounts
          </Link>
          <Link href="/" className="flex items-center gap-1.5 text-xs font-mono text-[#444] hover:text-white transition-colors ml-2">
            <ArrowLeft size={13} /> Back to Checklist
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Trades", value: totalTrades, Icon: BookOpen,     color: "#fff" },
          { label: "Taken",        value: taken,       Icon: TrendingUp,   color: "#00FF7F" },
          { label: "Skipped",      value: skipped,     Icon: TrendingDown, color: "#FF3B3B" },
          { label: "A+ Trades",    value: aStar,       Icon: Award,        color: "#F5A623" },
        ].map(({ label, value, Icon, color }) => (
          <div key={label} className="p-4 rounded-xl" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>
            <div className="flex items-center gap-2 mb-2">
              <Icon size={12} style={{ color }} />
              <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "#444" }}>{label}</p>
            </div>
            <p className="font-mono font-black text-2xl text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#333]" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by pair or notes..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl font-mono text-xs text-white placeholder-[#333] focus:outline-none"
          style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }} />
      </div>

      {/* Dropdowns */}
      <div className="flex gap-2 flex-wrap">
        {[
          { val: gradeFilter,  set: setGradeFilter,  opts: ["All Grades","A+","B+","C-","D-"] },
          { val: statusFilter, set: setStatusFilter,  opts: ["All Status","Taken","Skipped"] },
          { val: pairFilter,   set: setPairFilter,    opts: ["All Pairs", ...pairs] },
        ].map(({ val, set, opts }) => (
          <select key={opts[0]} value={val} onChange={e => set(e.target.value)}
            className="px-3 py-1.5 rounded-lg font-mono text-xs text-white focus:outline-none"
            style={{ background: "#0D0D0D", border: "1px solid #2A2A2A" }}>
            {opts.map(o => <option key={o}>{o}</option>)}
          </select>
        ))}
      </div>

      {/* Time filters */}
      <div className="flex gap-2 flex-wrap">
        {["All Time","Last 7 days","Last 14 days","Last 20 days","Last 30 days"].map(tf => (
          <button key={tf} onClick={() => setTimeFilter(tf)}
            className="px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all"
            style={timeFilter === tf
              ? { background: "#E53E3E", color: "#fff" }
              : { background: "#0D0D0D", border: "1px solid #1A1A1A", color: "#555" }}>
            {tf}
          </button>
        ))}
      </div>

      {/* Trade list + detail panel */}
      <div className="grid grid-cols-5 gap-4 items-start">

        {/* List */}
        <div className="col-span-3 space-y-2">
          {filtered.length === 0
            ? <p className="text-center py-16 font-mono text-xs text-[#333]">No trades found</p>
            : filtered.map((t, idx) => {
                const g = gradeInfo(tradePct(t));
                const isActive = selected?.id === t.id;
                return (
                  <button key={`${t.id}-${idx}`} onClick={() => handleSelect(t)} onDoubleClick={() => setModalTrade(t)}
                    className="w-full text-left p-4 rounded-xl transition-all"
                    style={{ background: isActive ? "#141414" : "#0D0D0D", border: `1px solid ${isActive ? "#2A2A2A" : "#1A1A1A"}` }}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-mono text-[10px] text-[#444] mb-0.5">{fmtDateTime(t)}</p>
                        <p className="font-mono font-bold text-white text-base">{t.pair}</p>
                        <div className="flex gap-1.5 mt-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold font-mono border"
                            style={t.bias === "BEARISH"
                              ? { background: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.4)", color: "#FF6B6B" }
                              : { background: "rgba(34,197,94,0.08)", borderColor: "rgba(34,197,94,0.4)", color: "#22C55E" }}>
                            {t.bias === "BEARISH" ? "↘ Bearish" : "↗ Bullish"}
                          </span>
                          {(() => {
                            const sc = t.session === "ASIAN"
                              ? { c: "#6AECE1", label: "Asian" }
                              : t.session === "LONDON"
                              ? { c: "#D946A8", label: "London" }
                              : { c: "#F59E0B", label: "New York" };
                            return (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono border"
                                style={{ background: `${sc.c}12`, borderColor: `${sc.c}55`, color: sc.c }}>
                                📍 {sc.label}
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="font-mono font-black text-xl" style={{ color: g.color }}>{g.letter}</span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold font-mono"
                          style={t.decision === "TAKE"
                            ? { background: "rgba(0,255,127,0.08)", color: "#00FF7F", border: "1px solid rgba(0,255,127,0.2)" }
                            : { background: "rgba(255,59,59,0.08)", color: "#FF3B3B", border: "1px solid rgba(255,59,59,0.2)" }}>
                          {t.decision === "TAKE" ? "✓ Taken" : "⊘ Skipped"}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
          }
        </div>

        {/* Detail panel */}
        <div className="col-span-2 sticky top-4">
          {selected ? (
            <div className="rounded-xl p-5 space-y-4" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>

              {/* Trade header — pair, date/time, chips row */}
              <div>
                <h2 className="font-sans font-black text-white text-xl leading-none">{selected.pair.replace("/", "")}</h2>
                {(() => {
                  const dt = tradeTime(selected);
                  const d = dt ?? new Date(selected.date + "T12:00:00");
                  return (
                    <p className="font-sans text-[11px] mt-1.5" style={{ color: "#8A8A8A" }}>
                      {d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      {dt && `, ${dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`}
                    </p>
                  );
                })()}
                <div className="flex items-center gap-2 flex-wrap mt-3">
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold font-sans border"
                    style={selected.bias === "BEARISH"
                      ? { borderColor: "rgba(239,68,68,0.5)", background: "rgba(239,68,68,0.08)", color: "#FF6B6B" }
                      : { borderColor: "rgba(34,197,94,0.5)", background: "rgba(34,197,94,0.08)", color: "#22C55E" }}>
                    {selected.bias === "BEARISH" ? "↓ Bearish" : "↑ Bullish"}
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-sans font-semibold"
                    style={{ background: "#1E1E1E", color: "#D0D0D0" }}>
                    {selected.session === "ASIAN" ? "Asian" : selected.session === "LONDON" ? "London" : "New York"}
                  </span>
                  {(() => { const g = gradeInfo(tradePct(selected)); return (
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black font-sans border"
                      style={{ borderColor: `${g.color}66`, background: g.bg, color: g.color }}>
                      {g.letter}
                    </span>
                  ); })()}
                </div>
              </div>

              {/* Trade Outcome */}
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="w-2 h-2 rounded-full bg-[#E53E3E]" />
                  <p className="font-mono text-xs font-bold text-white">Trade Outcome</p>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {OUTCOMES.map(({ key, label, Icon, color }) => {
                    const active = selected.outcome === key;
                    return (
                      <button key={key} onClick={() => setOutcome(key)}
                        className="flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-[9px] font-bold font-mono transition-all"
                        style={active
                          ? { background: `${color}22`, border: `1px solid ${color}`, color }
                          : { background: "transparent", border: "1px solid #1A1A1A", color: "#444" }}>
                        <Icon size={11} />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Linked Accounts & PnL */}
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: "#E53E3E" }} />
                  <p className="font-mono text-xs font-bold text-white">Linked Accounts & PnL</p>
                </div>

                {/* Link account dropdown — show when no *existing* account is linked (a stale link to a deleted account counts as unlinked) */}
                {!accounts.find(a => a.id === tradeLinks[selected.id]) && (
                  <div className="relative">
                    <button
                      onClick={() => setShowLinkDrop(v => !v)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg font-mono text-xs transition-all"
                      style={{ background: "#0A0A0A", border: "1px solid #2A2A2A", color: "#555" }}>
                      <span className="flex items-center gap-1.5"><Plus size={11} /> Link account</span>
                      <ChevronDown size={11} />
                    </button>
                    {showLinkDrop && (
                      <div className="absolute left-0 right-0 top-full mt-1 rounded-lg z-50 overflow-hidden"
                        style={{ background: "#111", border: "1px solid #2A2A2A", boxShadow: "0 8px 24px rgba(0,0,0,0.6)" }}>
                        {accounts.length === 0 ? (
                          <p className="px-3 py-3 font-mono text-[10px] text-[#444]">No accounts — create one in Accounts page</p>
                        ) : accounts.map(acc => (
                          <button key={acc.id}
                            onClick={() => linkAccount(selected.id, acc.id)}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-left font-mono text-xs text-white hover:bg-[#1A1A1A] transition-colors">
                            <CreditCard size={11} style={{ color: "#E53E3E" }} />
                            {acc.name}
                            <span className="ml-auto font-mono text-[10px] text-[#444]">${(acc.balance ?? 0).toLocaleString()}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Linked account display + PnL input */}
                {tradeLinks[selected.id] && (() => {
                  const acc = accounts.find(a => a.id === tradeLinks[selected.id]);
                  if (!acc) return null;
                  const isLoss = selected.outcome === "LOSS" || selected.outcome === "WITHDRAW";
                  const pnlNum = parseFloat(editPnl) || 0;
                  const pnlColor = isLoss ? "#EF4444" : "#22C55E";
                  return (
                    <div className="space-y-2">
                      {/* Account row */}
                      <div className="flex items-center justify-between px-3 py-2 rounded-lg"
                        style={{ background: "#0A0A0A", border: "1px solid #1A1A1A" }}>
                        <div className="flex items-center gap-2">
                          <Link2 size={11} style={{ color: "#E53E3E" }} />
                          <span className="font-mono text-xs font-bold text-white">{acc.name}</span>
                          <span className="font-mono text-[9px] text-[#444]">(${(acc.balance ?? 0).toLocaleString()})</span>
                        </div>
                        <button onClick={() => unlinkAccount(selected.id)}
                          className="p-1 rounded transition-colors hover:opacity-70" style={{ color: "#E53E3E" }}>
                          <Trash2 size={13} />
                        </button>
                      </div>

                      {/* PnL input — signed amount inside, border follows outcome */}
                      <div className="relative">
                        <input
                          type="number"
                          value={editPnl}
                          onChange={e => {
                            setEditPnl(e.target.value);
                            const val = parseFloat(e.target.value) || 0;
                            const signed = (selected.outcome === "LOSS" || selected.outcome === "WITHDRAW") ? -val : val;
                            dispatch({ type: "UPDATE_TRADE", payload: { id: selected.id, pnl: signed } });
                            setSelected(prev => prev ? { ...prev, pnl: signed } : null);
                          }}
                          placeholder="Enter amount..."
                          className="w-full pl-3 pr-24 py-2.5 rounded-lg font-mono text-sm text-white placeholder-[#333] focus:outline-none"
                          style={{
                            background: "#0A0A0A",
                            border: `1px solid ${pnlNum > 0 ? pnlColor : "#2A2A2A"}`,
                            boxShadow: pnlNum > 0 ? `0 0 10px 1px ${pnlColor}33` : "none",
                          }}
                        />
                        {pnlNum > 0 && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-sm font-bold pointer-events-none"
                            style={{ color: pnlColor }}>
                            {isLoss ? "-" : "+"}${pnlNum.toLocaleString()}
                          </span>
                        )}
                      </div>

                      {/* Hint */}
                      <p className="font-mono text-[9px] text-[#333] leading-relaxed">
                        WIN = + (add to balance) · LOSS/WITHDRAW = − (subtract from balance)
                      </p>
                    </div>
                  );
                })()}
              </div>


              {/* Trade Notes */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#F5A623]" />
                    <p className="font-mono text-xs font-bold text-white">Trade Notes & Lessons</p>
                  </div>
                  <VoiceMic onText={t => setEditNotes(p => appendNote(p, t))} />
                </div>
                <textarea value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  onBlur={commitNotes}
                  placeholder="Mistake made, lesson learned, market condition, psychology notes..."
                  rows={4}
                  className="w-full px-3 py-2.5 rounded-lg font-mono text-xs text-white placeholder-[#333] focus:outline-none resize-none"
                  style={{ background: "#0A0A0A", border: "1px solid #1A1A1A" }} />
                <p className="mt-1.5 font-mono text-[9px]" style={{ color: "#333" }}>Saved automatically</p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl flex flex-col items-center justify-center text-center"
              style={{ background: "#0D0D0D", border: "1px solid #1A1A1A", minHeight: 220, padding: 40 }}>
              <FileText size={30} className="mb-3" style={{ color: "#222" }} />
              <p className="font-mono text-xs" style={{ color: "#333" }}>Select a trade to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Full trade detail modal (double-click a trade) ── */}
      {modalTrade && (() => {
        const t = modalTrade;
        const g = gradeInfo(tradePct(t));
        const isBull = t.bias === "BULLISH";
        const sessionLabel = t.session === "ASIAN" ? "Asian" : t.session === "LONDON" ? "London" : "New York";
        const dt = tradeTime(t);
        const stamp = dt ? dt.toLocaleString("en-US", { month:"numeric", day:"numeric", year:"numeric", hour:"2-digit", minute:"2-digit", second:"2-digit" }) : fmtDate(t.date);
        const ruleSet    = state.biasRules?.[t.bias] ?? [];
        const checkedSet = new Set(t.rulesChecked ?? []);
        const missingSet = new Set(t.missingRules ?? []);
        const hasData    = checkedSet.size + missingSet.size > 0;
        const rowsFor = (cat: "BASIS" | "ENTRY") =>
          ruleSet.filter(r => r.category === cat).map(r => ({ ...r, ok: hasData ? checkedSet.has(r.id) : r.checked }));
        const htf = rowsFor("BASIS");
        const ltf = rowsFor("ENTRY");

        const RuleRow = ({ label, ok, indent, tag }: { label: string; ok: boolean; indent?: boolean; tag?: string }) => (
          <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg ${indent ? "ml-6" : ""}`}
            style={ok
              ? { background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)" }
              : { background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
            {ok ? <Check size={14} strokeWidth={3} className="shrink-0" style={{ color: "#22C55E" }} />
                : <X size={14} strokeWidth={3} className="shrink-0" style={{ color: "#EF4444" }} />}
            <span className="font-sans text-sm" style={{ color: ok ? "#DDD" : "#888" }}>
              {indent && <span style={{ color: "#555" }}>↳ </span>}{label}
            </span>
            {tag === "EITHER_OR" && (
              <span className="ml-auto shrink-0 px-2 py-0.5 rounded-md font-sans text-[10px]" style={{ color: "#888" }}>(Either/Or)</span>
            )}
          </div>
        );

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)" }}
            onClick={() => setModalTrade(null)}>
            <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden anim-pop"
              style={{ background: "#0D0D0D", border: "1px solid #262626" }}
              onClick={e => e.stopPropagation()}>

              {/* Header */}
              <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-4">
                <div>
                  <h2 className="font-sans font-black text-white text-xl">{t.pair.replace("/", "")} Trade</h2>
                  <p className="font-mono text-[11px] mt-1" style={{ color: "#777" }}>{stamp}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-sans font-black text-3xl leading-none" style={{ color: g.color }}>{g.letter}</span>
                  <button onClick={() => setModalTrade(null)} className="text-[#666] hover:text-white transition-colors"><X size={18} /></button>
                </div>
              </div>

              {/* Chips */}
              <div className="flex items-center gap-2 flex-wrap px-6 pb-4">
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold font-sans border"
                  style={isBull
                    ? { borderColor: "rgba(34,197,94,0.5)", background: "rgba(34,197,94,0.08)", color: "#22C55E" }
                    : { borderColor: "rgba(239,68,68,0.5)", background: "rgba(239,68,68,0.08)", color: "#FF6B6B" }}>
                  {isBull ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {isBull ? "Bullish" : "Bearish"}
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold font-sans border"
                  style={{ borderColor: "rgba(245,158,11,0.5)", background: "rgba(245,158,11,0.08)", color: "#F59E0B" }}>
                  <MapPin size={12} /> {sessionLabel}
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold font-sans border"
                  style={{ borderColor: "rgba(106,236,225,0.5)", background: "rgba(106,236,225,0.08)", color: "#6AECE1" }}>
                  <CandlestickChart size={12} /> {t.pair}
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold font-sans border"
                  style={t.decision === "TAKE"
                    ? { borderColor: "rgba(34,197,94,0.5)", background: "rgba(34,197,94,0.08)", color: "#22C55E" }
                    : { borderColor: "rgba(239,68,68,0.5)", background: "rgba(239,68,68,0.08)", color: "#FF6B6B" }}>
                  <CheckCircle2 size={12} /> {t.decision === "TAKE" ? "TAKEN" : "SKIPPED"}
                </span>
              </div>

              {/* Scroll body */}
              <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-5">
                {/* Timestamps */}
                <div className="rounded-xl px-4 py-3.5" style={{ background: "#0A0A0A", border: "1px solid #1A1A1A" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock size={13} style={{ color: "#888" }} />
                    <p className="font-sans text-sm font-bold" style={{ color: "#CCC" }}>Timestamps</p>
                  </div>
                  <p className="font-mono text-[11px]" style={{ color: "#888" }}>Created: <span className="text-white font-bold">{stamp}</span></p>
                  <p className="font-mono text-[11px] mt-1" style={{ color: "#888" }}>
                    {t.decision === "SKIP" ? "Skipped at" : "Taken at"}: <span className="text-white font-bold">{stamp}</span>
                  </p>
                  {t.decision === "SKIP" && t.notes && (
                    <p className="font-mono text-[11px] mt-1" style={{ color: "#888" }}>Reason: <span className="text-white italic">{t.notes}</span></p>
                  )}
                </div>

                {/* HTF Analysis */}
                {htf.length > 0 && (
                  <div>
                    <p className="font-sans font-bold text-white text-base mb-2.5">HTF Analysis</p>
                    <div className="space-y-1.5">
                      {htf.map(r => <RuleRow key={r.id} label={r.label} ok={r.ok} indent={r.indent} tag={r.tag} />)}
                    </div>
                  </div>
                )}

                {/* LTF Entry Model */}
                {ltf.length > 0 && (
                  <div>
                    <p className="font-sans font-bold text-white text-base mb-2.5">LTF Entry Model</p>
                    <div className="space-y-1.5">
                      {ltf.map(r => <RuleRow key={r.id} label={r.label} ok={r.ok} indent={r.indent} tag={r.tag} />)}
                    </div>
                  </div>
                )}

                {!hasData && htf.length === 0 && ltf.length === 0 && (
                  <p className="font-sans text-sm text-center py-6" style={{ color: "#555" }}>No checklist data saved for this trade.</p>
                )}

                {/* Chart Snapshots */}
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <p className="font-sans font-bold text-white text-base">Chart Snapshots</p>
                    <button onClick={() => setChartPanel(t)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-sans text-xs font-bold transition-all hover:opacity-90"
                      style={{ background: "rgba(239,68,68,0.12)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.3)" }}>
                      <Upload size={12} /> Upload / Edit
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    {PROOF_SLOTS.map(({ key, label, sub }) => {
                      const img = modalProofs[key];
                      return (
                        <button key={key} onClick={() => setChartPanel(t)}
                          className="rounded-xl overflow-hidden flex flex-col items-center justify-center text-center p-2 transition-all hover:border-[#EF4444]/50"
                          style={{ background: "#0A0A0A", border: `1px ${img ? "solid" : "dashed"} #262626`, minHeight: 92 }}>
                          {img ? (
                            <img src={img} alt={label} className="w-full h-20 object-cover rounded-lg" />
                          ) : (
                            <>
                              <CandlestickChart size={18} style={{ color: "#3A3A3A" }} />
                              <p className="font-sans text-[10px] font-bold mt-1 text-white/80">{label}</p>
                              <p className="font-mono text-[9px]" style={{ color: "#555" }}>{sub}</p>
                            </>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Trade Comment */}
                <div className="rounded-xl px-4 py-3.5" style={{ background: "#0A0A0A", border: "1px solid #1A1A1A" }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="font-sans text-sm font-bold" style={{ color: "#CCC" }}>Trade Comment</p>
                    <button
                      onClick={() => { handleSelect(t); setModalTrade(null); }}
                      className="flex items-center gap-1.5 font-sans text-xs font-semibold transition-colors hover:text-white"
                      style={{ color: "#8A8A8A" }}>
                      <FileText size={12} /> Edit
                    </button>
                  </div>
                  <p className="font-sans text-sm" style={{ color: t.notes ? "#DDD" : "#555" }}>
                    {t.notes ? t.notes : "No comment"}
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between gap-3 px-6 py-4 border-t" style={{ borderColor: "#1A1A1A" }}>
                <button
                  onClick={() => {
                    dispatch({ type: "DELETE_TRADE", payload: t.id });
                    if (selected?.id === t.id) setSelected(null);
                    setModalTrade(null);
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-sans text-sm font-bold text-white transition-all hover:opacity-90"
                  style={{ background: "#EF4444" }}>
                  <Trash2 size={15} /> Delete Trade
                </button>
                <button onClick={() => setModalTrade(null)}
                  className="px-5 py-2.5 rounded-xl font-sans text-sm font-semibold transition-all hover:bg-[#1A1A1A]"
                  style={{ border: "1px solid #2A2A2A", color: "#CCC" }}>
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Full chart-snapshot editor (upload + per-chart notes) ── */}
      {chartPanel && (
        <ChartSnapshotPanel
          trade={chartPanel}
          onClose={() => {
            const id = chartPanel.id;
            setChartPanel(null);
            // refresh the modal's thumbnails with whatever was just saved
            imgLoadTrade(id).then(({ chartProofs }) => setModalProofs((chartProofs ?? {}) as Record<string, string>)).catch(() => {});
          }}
        />
      )}
    </div>
  );
}
