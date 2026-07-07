"use client";
import { useState, useEffect } from "react";
import { useSabar } from "@/store/SabarContext";
import { Plus, Trash2, ChevronDown, BarChart2, TrendingUp, ChevronLeft, ChevronRight, ImageOff } from "lucide-react";

/* ── helpers ── */
interface Account { id: string; name: string; balance: number }
const ACCOUNTS_KEY = "sabar-risk-accounts-v3";

function getGrade(pct: number): { label: string; color: string; bg: string } {
  if (pct >= 90) return { label: "A",  color: "#00FF7F", bg: "rgba(0,255,127,0.15)"  };
  if (pct >= 75) return { label: "B",  color: "#6AECE1", bg: "rgba(106,236,225,0.15)"};
  if (pct >= 60) return { label: "C",  color: "#F59E0B", bg: "rgba(245,158,11,0.15)" };
  if (pct >= 40) return { label: "D+", color: "#FF8C00", bg: "rgba(255,140,0,0.15)"  };
  return               { label: "F",  color: "#FF3B3B", bg: "rgba(255,59,59,0.15)"   };
}

function fmtDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}
function fmtPnl(v: number | undefined) {
  if (v === undefined) return "—";
  const abs = Math.abs(v).toFixed(0);
  return (v >= 0 ? "+" : "−") + "$" + Number(abs).toLocaleString();
}
function tradeR(t: { pnl?: number; riskAmount: number; riskPercent: number; rr: number; outcome?: string }) {
  // R = actual PnL divided by the dollar amount risked on the trade
  if (t.pnl !== undefined && t.riskAmount > 0) return t.pnl / t.riskAmount;
  if (!t.outcome || t.outcome === "BE") return 0;
  return t.outcome === "WIN" ? t.riskPercent * t.rr : -t.riskPercent;
}
function fmtR(r: number) {
  return `${r >= 0 ? "+" : "−"}${Math.abs(r).toFixed(1)}R`;
}

const ROWS_OPTIONS = [5, 10, 25];

export function AccountRiskPage() {
  const { state } = useSabar();

  /* accounts */
  const [accounts, setAccounts]     = useState<Account[]>([]);
  const [selId, setSelId]           = useState<string>("");
  const [showAccDrop, setShowAccDrop] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newName, setNewName]       = useState("");
  const [newBal, setNewBal]         = useState("");

  /* table */
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [page, setPage]             = useState(1);
  const [showRowsDrop, setShowRowsDrop] = useState(false);

  useEffect(() => {
    try {
      const saved: Account[] = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? "[]");
      if (saved.length) { setAccounts(saved); setSelId(saved[0].id); }
    } catch {}
  }, []);

  function saveAccounts(arr: Account[]) {
    setAccounts(arr);
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(arr));
  }

  function addAccount() {
    if (!newName.trim()) return;
    const id  = Date.now().toString();
    const bal = parseFloat(newBal) || 10000;
    const next = [...accounts, { id, name: newName.trim(), balance: bal }];
    saveAccounts(next);
    setSelId(id);
    setNewName(""); setNewBal("");
    setShowNewModal(false);
  }

  function deleteAccount() {
    if (!selId) return;
    const next = accounts.filter(a => a.id !== selId);
    saveAccounts(next);
    setSelId(next[0]?.id ?? "");
  }

  const selAccount = accounts.find(a => a.id === selId) ?? null;

  /* stats from all TAKE trades */
  const takeTrades = state.trades.filter(t => t.decision === "TAKE");
  const totalPnl   = takeTrades.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const totalR     = takeTrades.reduce((s, t) => s + tradeR(t), 0);
  const currentBal = (selAccount?.balance ?? state.accountBalance) + totalPnl;

  /* history table (all TAKE trades) */
  const trades = [...takeTrades].sort((a, b) => b.date.localeCompare(a.date));
  const totalPages = Math.max(1, Math.ceil(trades.length / rowsPerPage));
  const pageSlice  = trades.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  /* ── render ── */
  if (!accounts.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "rgba(229,62,62,0.1)", border: "1px solid rgba(229,62,62,0.3)" }}>
          <BarChart2 size={28} style={{ color: "#E53E3E" }} />
        </div>
        <p className="font-mono text-sm text-[#888]">No accounts yet</p>
        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold text-white transition-all hover:opacity-90"
          style={{ background: "#E53E3E", boxShadow: "0 0 16px 4px rgba(229,62,62,0.3)" }}
        >
          <Plus size={15} /> New Account
        </button>
        {showNewModal && <NewAccountModal name={newName} bal={newBal} setName={setNewName} setBal={setNewBal} onAdd={addAccount} onClose={() => setShowNewModal(false)} />}
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Account selector bar ── */}
      <div className="flex items-center gap-3">
        {/* Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowAccDrop(v => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-sm font-semibold text-white transition-all"
            style={{ background: "#111", border: "1px solid #2A2A2A", minWidth: "140px" }}
          >
            <span className="flex-1 text-left truncate">{selAccount?.name ?? "—"}</span>
            <ChevronDown size={14} className="text-[#555]" />
          </button>
          {showAccDrop && (
            <div
              className="absolute top-full left-0 mt-1 z-30 rounded-xl overflow-hidden"
              style={{ background: "#111", border: "1px solid #2A2A2A", minWidth: "160px", boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}
            >
              {accounts.map(a => (
                <button
                  key={a.id}
                  onClick={() => { setSelId(a.id); setShowAccDrop(false); setPage(1); }}
                  className="w-full text-left px-4 py-2.5 font-mono text-sm hover:bg-[#1A1A1A] transition-colors"
                  style={{ color: a.id === selId ? "#00FF7F" : "#fff" }}
                >
                  {a.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Delete */}
        <button
          onClick={deleteAccount}
          className="p-2 rounded-lg transition-all hover:bg-red-500/10"
          style={{ border: "1px solid #2A2A2A" }}
          title="Delete account"
        >
          <Trash2 size={15} style={{ color: "#555" }} />
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* New Account */}
        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold text-white transition-all hover:opacity-90"
          style={{ background: "#E53E3E", boxShadow: "0 0 14px 3px rgba(229,62,62,0.3)" }}
        >
          <Plus size={14} /> New Account
        </button>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Account Balance */}
        <div className="rounded-xl p-4" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>
          <p className="text-xs text-[#666] font-sans mb-2">Account Balance</p>
          <p className="font-mono font-bold text-2xl" style={{ color: "#00FF7F" }}>
            ${currentBal.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
          <p className="font-mono text-xs mt-1" style={{ color: totalPnl >= 0 ? "#00FF7F" : "#FF3B3B" }}>
            {totalPnl >= 0 ? "+" : "−"}${Math.abs(totalPnl).toLocaleString()} ({totalPnl >= 0 ? "+" : "−"}{selAccount ? Math.abs(totalPnl / selAccount.balance * 100).toFixed(1) : "0.0"}%)
          </p>
        </div>

        {/* Total PnL */}
        <div className="rounded-xl p-4" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>
          <p className="text-xs text-[#666] font-sans mb-2">Total PnL ($)</p>
          <div className="flex items-center gap-2">
            <TrendingUp size={18} style={{ color: totalPnl >= 0 ? "#00FF7F" : "#FF3B3B" }} />
            <p className="font-mono font-bold text-2xl" style={{ color: totalPnl >= 0 ? "#00FF7F" : "#FF3B3B" }}>
              {totalPnl >= 0 ? "+" : "−"}${Math.abs(totalPnl).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Total R */}
        <div className="rounded-xl p-4" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>
          <p className="text-xs text-[#666] font-sans mb-2">Total R</p>
          <p className="font-mono font-bold text-2xl" style={{ color: totalR >= 0 ? "#00FF7F" : "#FF3B3B" }}>
            {totalR >= 0 ? "+" : "−"}{Math.abs(totalR).toFixed(1)}R
          </p>
        </div>

        {/* Trades Linked */}
        <div className="rounded-xl p-4" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>
          <p className="text-xs text-[#666] font-sans mb-2">Trades Linked</p>
          <div className="flex items-center gap-2">
            <BarChart2 size={20} style={{ color: "#E53E3E" }} />
            <p className="font-mono font-bold text-2xl text-white">{takeTrades.length}</p>
          </div>
        </div>
      </div>

      {/* ── History table ── */}
      <div className="rounded-xl overflow-hidden" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>

        {/* Table header bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "#1A1A1A" }}>
          <p className="font-sans font-semibold text-white text-base">History</p>
          <div className="flex items-center gap-3">
            {/* Pagination top */}
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1 rounded transition-all disabled:opacity-30 hover:bg-[#1A1A1A]">
              <ChevronLeft size={16} className="text-[#888]" />
            </button>
            <span className="font-mono text-sm text-[#888]">{page}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1 rounded transition-all disabled:opacity-30 hover:bg-[#1A1A1A]">
              <ChevronRight size={16} className="text-[#888]" />
            </button>
            {/* Rows per page */}
            <div className="relative flex items-center gap-2">
              <span className="text-xs text-[#555] font-sans">Rows per page</span>
              <button
                onClick={() => setShowRowsDrop(v => !v)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono text-xs text-white"
                style={{ background: "#1A1A1A", border: "1px solid #2A2A2A" }}
              >
                {rowsPerPage} <ChevronDown size={11} />
              </button>
              {showRowsDrop && (
                <div className="absolute right-0 top-full mt-1 z-30 rounded-lg overflow-hidden" style={{ background: "#111", border: "1px solid #2A2A2A" }}>
                  {ROWS_OPTIONS.map(r => (
                    <button key={r} onClick={() => { setRowsPerPage(r); setPage(1); setShowRowsDrop(false); }}
                      className="block w-full px-4 py-2 font-mono text-xs text-white hover:bg-[#1A1A1A]">
                      {r}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Column headers */}
        <div className="grid px-5 py-3 border-b" style={{ gridTemplateColumns: "40px 1fr 1fr 1fr 80px 1fr 1fr 32px", borderColor: "#1A1A1A" }}>
          {["", "Date", "Pair", "Grade", "", "Charts", "RR", "PnL ($)", ""].map((h, i) => (
            <span key={i} className="font-sans text-xs text-[#555] font-semibold">{h}</span>
          ))}
        </div>

        {/* Rows */}
        {pageSlice.length === 0 ? (
          <div className="py-12 text-center font-mono text-sm text-[#444]">No trades yet</div>
        ) : (
          pageSlice.map(trade => {
            const pct   = trade.totalRules > 0 ? Math.round(trade.checkedCount / trade.totalRules * 100) : 0;
            const grade = getGrade(pct);
            const missing = trade.totalRules - trade.checkedCount;
            const rVal  = tradeR(trade);
            const rrStr = fmtR(rVal);
            const rrPos = rVal >= 0;
            const pnlVal = trade.pnl ?? 0;

            return (
              <div
                key={trade.id}
                className="grid items-center px-5 py-4 border-b transition-colors hover:bg-[#111]"
                style={{ gridTemplateColumns: "40px 1fr 1fr 1fr 80px 1fr 1fr 32px", borderColor: "#1A1A1A" }}
              >
                {/* Dot */}
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: trade.outcome === "WIN" ? "#00FF7F" : trade.outcome === "LOSS" ? "#FF3B3B" : "#F59E0B" }} />

                {/* Date */}
                <span className="font-sans text-sm text-[#A0A0A0]">{fmtDate(trade.date)}</span>

                {/* Pair */}
                <span className="font-mono text-sm text-white font-semibold">{trade.pair.replace("/", "")}</span>

                {/* Grade + tags */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className="font-mono text-xs font-bold px-2 py-0.5 rounded-md"
                    style={{ color: grade.color, background: grade.bg, border: `1px solid ${grade.color}44` }}
                  >
                    {grade.label}
                  </span>
                  {missing > 0 && (
                    <>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded" style={{ background: "#1A1A1A", color: "#888", border: "1px solid #2A2A2A" }}>
                        {missing}
                      </span>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded" style={{ background: "#1A1A1A", color: "#888", border: "1px solid #2A2A2A" }}>
                        rule
                      </span>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded" style={{ background: "#1A1A1A", color: "#888", border: "1px solid #2A2A2A" }}>
                        missing
                      </span>
                    </>
                  )}
                </div>

                {/* spacer */}
                <div />

                {/* Charts */}
                <div className="flex items-center">
                  {trade.chartProofs && Object.values(trade.chartProofs).some(Boolean) ? (
                    <div className="w-8 h-8 rounded overflow-hidden">
                      <img src={Object.values(trade.chartProofs).find(Boolean)} alt="chart" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded flex items-center justify-center" style={{ background: "#1A1A1A", border: "1px solid #2A2A2A" }}>
                      <ImageOff size={13} style={{ color: "#FF3B3B" }} />
                    </div>
                  )}
                </div>

                {/* RR */}
                <span className="font-mono text-sm font-semibold" style={{ color: rrPos ? "#00FF7F" : "#FF3B3B" }}>{rrStr}</span>

                {/* PnL */}
                <span className="font-mono text-sm font-semibold" style={{ color: pnlVal >= 0 ? "#00FF7F" : "#FF3B3B" }}>{fmtPnl(trade.pnl)}</span>

                {/* Chevron */}
                <ChevronDown size={14} className="text-[#444]" />
              </div>
            );
          })
        )}

        {/* Bottom pagination */}
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1 rounded transition-all disabled:opacity-30 hover:bg-[#1A1A1A]">
              <ChevronLeft size={16} className="text-[#888]" />
            </button>
            <span className="font-mono text-sm text-[#888]">{page}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1 rounded transition-all disabled:opacity-30 hover:bg-[#1A1A1A]">
              <ChevronRight size={16} className="text-[#888]" />
            </button>
          </div>
          <span className="font-mono text-xs text-[#555]">
            {trades.length === 0 ? "0 of 0" : `${(page - 1) * rowsPerPage + 1}–${Math.min(page * rowsPerPage, trades.length)} of ${trades.length}`}
          </span>
        </div>
      </div>

      {/* New account modal */}
      {showNewModal && (
        <NewAccountModal
          name={newName} bal={newBal}
          setName={setNewName} setBal={setNewBal}
          onAdd={addAccount} onClose={() => setShowNewModal(false)}
        />
      )}
    </div>
  );
}

/* ── New Account Modal ── */
function NewAccountModal({ name, bal, setName, setBal, onAdd, onClose }: {
  name: string; bal: string;
  setName: (v: string) => void; setBal: (v: string) => void;
  onAdd: () => void; onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)" }} onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl p-6 space-y-4"
        style={{ background: "#111", border: "1px solid #2A2A2A" }}
        onClick={e => e.stopPropagation()}
      >
        <h3 className="font-mono font-bold text-white text-base tracking-widest uppercase">New Account</h3>
        <div>
          <label className="block text-xs text-[#666] font-sans mb-1.5">Account Name</label>
          <input
            value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g. FTMO, My Forex Funds…"
            className="w-full px-3 py-2.5 rounded-lg font-sans text-sm text-white placeholder-[#444] focus:outline-none transition-colors"
            style={{ background: "#1A1A1A", border: "1px solid #2A2A2A" }}
            onFocus={e => (e.target.style.borderColor = "#E53E3E")}
            onBlur={e => (e.target.style.borderColor = "#2A2A2A")}
          />
        </div>
        <div>
          <label className="block text-xs text-[#666] font-sans mb-1.5">Starting Balance ($)</label>
          <input
            type="number" value={bal} onChange={e => setBal(e.target.value)}
            placeholder="10000"
            className="w-full px-3 py-2.5 rounded-lg font-sans text-sm text-white placeholder-[#444] focus:outline-none transition-colors"
            style={{ background: "#1A1A1A", border: "1px solid #2A2A2A" }}
            onFocus={e => (e.target.style.borderColor = "#E53E3E")}
            onBlur={e => (e.target.style.borderColor = "#2A2A2A")}
          />
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg font-mono text-sm text-[#888] transition-all hover:text-white" style={{ background: "#1A1A1A", border: "1px solid #2A2A2A" }}>
            Cancel
          </button>
          <button
            onClick={onAdd}
            disabled={!name.trim()}
            className="flex-1 py-2.5 rounded-lg font-mono text-sm font-bold text-white transition-all disabled:opacity-40"
            style={{ background: "#E53E3E" }}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
