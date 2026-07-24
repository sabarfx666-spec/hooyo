"use client";
import { useState, useMemo, useEffect } from "react";
import { useSabar } from "@/store/SabarContext";
import { Trade } from "@/store/types";
import {
  ArrowLeft, Plus, Trash2, CreditCard, TrendingUp, BarChart2,
  Link2, Camera, X, ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { ChartSnapshotPanel } from "@/components/journal/ChartSnapshotPanel";

type Account = { id: string; name: string; balance: number };

function tradePct(t: Trade) {
  return t.totalRules > 0 ? Math.round((t.checkedCount / t.totalRules) * 100) : 0;
}
// %R uses a fixed reference: 1R = 1% = $1,000  (so $500 = 0.5%R, $1,500 = 1.5%R)
const R_BASE = 100000;
function pctR(pnl: number) {
  return (pnl / R_BASE) * 100;
}
function fmtPctR(v: number) {
  return `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(1)}%R`;
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
function hasCharts(t: Trade) {
  return t.chartProofs && Object.keys(t.chartProofs).length > 0;
}

/* ── Main Page ────────────────────────────────────────── */
export default function AccountsPage() {
  const { state } = useSabar();
  const [accounts,    setAccounts]    = useState<Account[]>([]);
  const [selected,    setSelected]    = useState<string>("");
  const [showNew,     setShowNew]     = useState(false);
  const [newName,     setNewName]     = useState("");
  const [newBal,      setNewBal]      = useState("");
  const [chartTrade,  setChartTrade]  = useState<Trade | null>(null);
  const [page,        setPage]        = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem("sabar-trading-accounts") ?? "[]");
      // Repair any accounts missing an id
      const saved = raw.map((a: Account, i: number) => ({ ...a, id: a.id ?? `acc-repair-${i}` }));
      setAccounts(saved);
      localStorage.setItem("sabar-trading-accounts", JSON.stringify(saved));
      if (saved.length > 0) setSelected(saved[0].id);
    } catch {}
  }, []);

  const saveAccounts = (accs: Account[]) => {
    setAccounts(accs);
    localStorage.setItem("sabar-trading-accounts", JSON.stringify(accs));
  };

  const addAccount = () => {
    if (!newName.trim()) return;
    const acc: Account = { id: `acc-${Date.now()}`, name: newName.trim(), balance: parseFloat(newBal) || 0 };
    const next = [...accounts, acc];
    saveAccounts(next);
    setSelected(acc.id);
    setNewName(""); setNewBal(""); setShowNew(false);
  };

  const deleteAccount = (id: string) => {
    const next = accounts.filter(a => a.id !== id);
    saveAccounts(next);
    if (selected === id) setSelected(next[0]?.id ?? "");
  };

  const account = accounts.find(a => a.id === selected);

  const linkedTrades = useMemo(() => {
    if (!account) return [];
    return [...state.trades]
      .filter(t => t.decision === "TAKE")
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [state.trades, account]);

  const totalPnl   = linkedTrades.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const totalPages = Math.max(1, Math.ceil(linkedTrades.length / rowsPerPage));
  const safePage   = Math.min(page, totalPages);
  const pageStart  = (safePage - 1) * rowsPerPage;
  const pageTrades = linkedTrades.slice(pageStart, pageStart + rowsPerPage);
  const startBal = account?.balance ?? 0;
  const curBal   = startBal + totalPnl;
  const pctGain  = startBal > 0 ? ((totalPnl / startBal) * 100).toFixed(1) : null;

  return (
    <div className="relative">
      <div className="max-w-5xl mx-auto space-y-5 p-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <Link href="/history" className="flex items-center gap-1.5 text-xs font-mono text-[#444] hover:text-white transition-colors">
            <ArrowLeft size={13} /> Back to Journal
          </Link>
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-mono text-xs font-bold text-white transition-all hover:opacity-90"
            style={{ background: "#E53E3E" }}>
            <Plus size={13} /> New Account
          </button>
        </div>

        {/* Account selector */}
        {accounts.length > 0 && (
          <div className="flex items-center gap-2">
            <select value={selected} onChange={e => setSelected(e.target.value)}
              className="px-3 py-2 rounded-lg font-mono text-sm text-white focus:outline-none"
              style={{ background: "#0D0D0D", border: "1px solid #2A2A2A" }}>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <button onClick={() => selected && deleteAccount(selected)}
              className="p-2 rounded-lg text-[#444] hover:text-[#FF3B3B] transition-colors"
              style={{ border: "1px solid #1A1A1A" }}>
              <Trash2 size={14} />
            </button>
          </div>
        )}

        {/* New account form */}
        {showNew && (
          <div className="p-4 rounded-xl space-y-3" style={{ background: "#0D0D0D", border: "1px solid #2A2A2A" }}>
            <p className="font-mono text-xs font-bold text-white">New Account</p>
            <div className="flex gap-2">
              <input value={newName} onChange={e => setNewName(e.target.value)}
                placeholder="Account name (e.g. funded next)"
                className="flex-1 px-3 py-2 rounded-lg font-mono text-xs text-white placeholder-[#333] focus:outline-none"
                style={{ background: "#0A0A0A", border: "1px solid #2A2A2A" }} />
              <input value={newBal} onChange={e => setNewBal(e.target.value)}
                placeholder="Starting balance ($)" type="number"
                className="w-44 px-3 py-2 rounded-lg font-mono text-xs text-white placeholder-[#333] focus:outline-none"
                style={{ background: "#0A0A0A", border: "1px solid #2A2A2A" }} />
            </div>
            <div className="flex gap-2">
              <button onClick={addAccount}
                className="px-4 py-2 rounded-lg font-mono text-xs font-bold text-white"
                style={{ background: "#E53E3E" }}>Create</button>
              <button onClick={() => setShowNew(false)}
                className="px-4 py-2 rounded-lg font-mono text-xs text-[#555]"
                style={{ border: "1px solid #1A1A1A" }}>Cancel</button>
            </div>
          </div>
        )}

        {account ? (
          <>
            {/* Stats */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "Account Balance", value: `$${curBal.toLocaleString()}`, sub: pctGain ? `${totalPnl >= 0 ? "+" : ""}$${totalPnl.toLocaleString()} (+${pctGain}%)` : "", color: "#00FF7F", Icon: CreditCard },
                { label: "Total PnL ($)",   value: `${totalPnl >= 0 ? "+" : ""}$${totalPnl.toLocaleString()}`, sub: "", color: totalPnl >= 0 ? "#00FF7F" : "#FF3B3B", Icon: TrendingUp },
                { label: "Total R",         value: fmtPctR(pctR(totalPnl)), sub: "", color: totalPnl >= 0 ? "#00FF7F" : "#FF3B3B", Icon: BarChart2 },
                { label: "Trades Linked",   value: String(linkedTrades.length), sub: "", color: "#FF3B3B", Icon: Link2 },
              ].map(({ label, value, sub, color, Icon }) => (
                <div key={label} className="p-4 rounded-xl" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>
                  <p className="font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: "#444" }}>{label}</p>
                  <p className="font-mono font-black text-xl" style={{ color }}>{value}</p>
                  {sub && <p className="font-mono text-[10px] mt-0.5" style={{ color: "#555" }}>{sub}</p>}
                </div>
              ))}
            </div>

            {/* History table */}
            <div className="rounded-xl overflow-hidden" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>
              <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: "#1A1A1A" }}>
                <p className="font-mono text-sm font-bold text-white">History</p>
                <p className="font-mono text-[10px] text-[#444]">{linkedTrades.length} trades</p>
              </div>
              {linkedTrades.length === 0 ? (
                <div className="py-12 text-center font-mono text-xs text-[#333]">No trades yet</div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: "1px solid #1A1A1A" }}>
                      {["","Date","Pair","Grade","Charts","RR","PnL ($)",""].map((h, i) => (
                        <th key={i} className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-widest" style={{ color: "#444" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pageTrades.map(t => {
                      const g = gradeInfo(tradePct(t));
                      const hasImg = hasCharts(t);
                      const isOpen = chartTrade?.id === t.id;
                      return (
                        <tr key={t.id}
                          className="transition-colors"
                          style={{ borderBottom: "1px solid #0A0A0A", background: isOpen ? "#111" : "transparent" }}>
                          <td className="pl-4 py-3">
                            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "#00FF7F" }} />
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-[#666]">
                            {new Date(t.date).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" })}
                          </td>
                          <td className="px-4 py-3 font-mono text-sm font-bold text-white">{t.pair}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full font-mono text-xs font-bold"
                              style={{ background: g.bg, color: g.color }}>{g.letter}</span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => setChartTrade(isOpen ? null : t)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:opacity-80"
                              style={hasImg
                                ? { background: "rgba(229,62,62,0.2)", border: "1px solid rgba(229,62,62,0.4)" }
                                : { background: "#111", border: "1px solid #1A1A1A" }}>
                              <Camera size={13} style={{ color: hasImg ? "#E53E3E" : "#333" }} />
                            </button>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs" style={{ color: (t.pnl ?? 0) >= 0 ? "#00FF7F" : "#FF3B3B" }}>{t.pnl !== undefined ? fmtPctR(pctR(t.pnl)) : "—"}</td>
                          <td className="px-4 py-3 font-mono text-xs font-bold" style={{ color: (t.pnl ?? 0) >= 0 ? "#00FF7F" : "#FF3B3B" }}>
                            {t.pnl !== undefined ? `${t.pnl >= 0 ? "+" : "−"}$${Math.abs(t.pnl).toLocaleString()}` : "—"}
                          </td>
                          <td className="pr-4 py-3">
                            <button onClick={() => setChartTrade(isOpen ? null : t)}
                              className="text-[#333] hover:text-white transition-colors">
                              <ChevronRight size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
              {/* Pagination footer */}
              {linkedTrades.length > 0 && (
                <div className="flex items-center justify-between px-5 py-3 border-t" style={{ borderColor: "#1A1A1A" }}>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                      className="w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs transition-all disabled:opacity-30"
                      style={{ background: "#111", border: "1px solid #1A1A1A", color: "#aaa" }}>
                      ‹
                    </button>
                    <span className="font-mono text-xs text-white">{safePage}</span>
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                      className="w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs transition-all disabled:opacity-30"
                      style={{ background: "#111", border: "1px solid #1A1A1A", color: "#aaa" }}>
                      ›
                    </button>
                    <span className="font-mono text-[10px] text-[#444] ml-2">
                      Rows per page
                    </span>
                    <select value={rowsPerPage} onChange={e => { setRowsPerPage(Number(e.target.value)); setPage(1); }}
                      className="px-2 py-1 rounded-lg font-mono text-xs text-white focus:outline-none"
                      style={{ background: "#111", border: "1px solid #1A1A1A" }}>
                      {[5, 10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <span className="font-mono text-[10px] text-[#444]">
                    {pageStart + 1}–{Math.min(pageStart + rowsPerPage, linkedTrades.length)} of {linkedTrades.length}
                  </span>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="py-20 text-center rounded-xl" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>
            <CreditCard size={32} className="mx-auto mb-3" style={{ color: "#222" }} />
            <p className="font-mono text-sm font-bold text-white mb-1">No accounts yet</p>
            <p className="font-mono text-xs text-[#444]">Create your first trading account to track P&L</p>
          </div>
        )}
      </div>

      {/* Chart Snapshots side panel (shared with Journal — has zoom/replace/delete) */}
      {chartTrade && (
        <ChartSnapshotPanel
          key={chartTrade.id}
          trade={chartTrade}
          onClose={() => setChartTrade(null)}
        />
      )}
    </div>
  );
}
