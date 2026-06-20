"use client";
import { useState, useEffect, useRef } from "react";
import { useSabar } from "@/store/SabarContext";
import { ChevronDown } from "lucide-react";

function useCountUp(target: number, duration = 600) {
  const [value, setValue] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const start = prev.current;
    const diff  = target - start;
    if (diff === 0) return;
    const startTime = performance.now();
    const step = (now: number) => {
      const t    = Math.min(1, (now - startTime) / duration);
      const ease = 1 - Math.pow(1 - t, 3);
      setValue(start + diff * ease);
      if (t < 1) requestAnimationFrame(step);
      else { prev.current = target; setValue(target); }
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return value;
}

const INSTRUMENTS = ["EURUSD","GBPUSD","USDJPY","USDCHF","AUDUSD","NZDUSD","USDCAD","GBPJPY","EURJPY","XAUUSD","GBPCAD","EURGBP"];
const PIP_VALUES: Record<string,number> = {
  EURUSD:10, GBPUSD:10, AUDUSD:10, NZDUSD:10, USDCAD:10,
  USDJPY:9.1, EURJPY:9.1, GBPJPY:9.1,
  USDCHF:11, XAUUSD:10, GBPCAD:10, EURGBP:10,
};

const RULES_KEY   = "sabar-risk-rules-v2";
const LOCK_KEY    = "sabar-kill-switch";
const ACCOUNT_KEY = "sabar-account-name";

interface Rules {
  maxRiskPct: number;
  tradesPerDay: number;
  consLossPause: number;
  dailyLimitPct: number;
  weeklyLimitPct: number;
}

const DEFAULT_RULES: Rules = {
  maxRiskPct: 2,
  tradesPerDay: 3,
  consLossPause: 3,
  dailyLimitPct: 5,
  weeklyLimitPct: 10,
};

function loadRules(): Rules {
  try { const r = localStorage.getItem(RULES_KEY); if (r) return { ...DEFAULT_RULES, ...JSON.parse(r) }; } catch {}
  return DEFAULT_RULES;
}

function StatCard({ label, value, sub, valueColor }: { label: string; value: string; sub?: string; valueColor?: string }) {
  return (
    <div className="rounded-xl p-5" style={{ background: "#0D0F14", border: "1px solid #1E2430" }}>
      <p className="font-sans text-[10px] uppercase tracking-widest mb-3" style={{ color: "#4A5568" }}>{label}</p>
      <p className="font-mono font-bold text-2xl" style={{ color: valueColor ?? "#fff" }}>{value}</p>
      {sub && <p className="font-mono text-xs mt-1" style={{ color: valueColor ?? "#4A5568" }}>{sub}</p>}
    </div>
  );
}

function SectionCard({ title, titleColor, children }: { title: string; titleColor?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-5 flex flex-col gap-4" style={{ background: "#0D0F14", border: "1px solid #1E2430" }}>
      <p className="font-mono text-xs font-bold uppercase tracking-widest" style={{ color: titleColor ?? "#6AECE1" }}>{title}</p>
      {children}
    </div>
  );
}

export function RiskDashboard() {
  const { state, dispatch } = useSabar();
  const [rules, setRules]           = useState<Rules>(DEFAULT_RULES);
  const [accountName, setAccountName] = useState("ftmo");
  const [editingName, setEditingName] = useState(false);
  const [monthlyOpen, setMonthlyOpen] = useState(false);

  // Position sizer state
  const [instrument, setInstrument] = useState("EURUSD");
  const [instrOpen, setInstrOpen]   = useState(false);
  const [slPips,    setSlPips]      = useState(15);
  const [rr,        setRr]          = useState(2.0);

  useEffect(() => {
    setRules(loadRules());
    const saved = localStorage.getItem(ACCOUNT_KEY);
    if (saved) setAccountName(saved);
  }, []);
  useEffect(() => { localStorage.setItem(RULES_KEY, JSON.stringify(rules)); }, [rules]);
  useEffect(() => { localStorage.setItem(ACCOUNT_KEY, accountName); }, [accountName]);

  // Dates
  const today = new Date().toISOString().split("T")[0];
  const weekStart = (() => { const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1); return d.toISOString().split("T")[0]; })();
  const monthStart = today.slice(0, 7) + "-01";

  const takeTrades = state.trades.filter(t => t.decision === "TAKE");
  const todayPnl   = takeTrades.filter(t => t.date === today).reduce((s,t) => s + (t.pnl ?? 0), 0);
  const weekPnl    = takeTrades.filter(t => t.date >= weekStart).reduce((s,t) => s + (t.pnl ?? 0), 0);
  const monthPnl   = takeTrades.filter(t => t.date >= monthStart).reduce((s,t) => s + (t.pnl ?? 0), 0);
  const acct       = state.accountBalance;
  const risk       = state.riskPercent;

  // Today trades count
  const tradesToday = takeTrades.filter(t => t.date === today).length;
  const weekTrades  = takeTrades.filter(t => t.date >= weekStart).length;

  // Consecutive losses
  const sorted = [...takeTrades].sort((a,b) => b.date.localeCompare(a.date));
  let consLosses = 0;
  for (const t of sorted) { if (t.outcome === "LOSS") consLosses++; else break; }
  let consWins = 0;
  for (const t of sorted) { if (t.outcome === "WIN") consWins++; else break; }

  // Position sizing
  const pipVal  = PIP_VALUES[instrument] ?? 10;
  const riskDol = (acct * risk) / 100;
  const lotSize = slPips > 0 ? riskDol / (slPips * pipVal) : 0;
  const tpPips  = slPips * rr;
  const reward  = riskDol * rr;

  // Drawdown %
  const dailyDD   = acct > 0 ? Math.abs(Math.min(0, todayPnl)) / acct * 100 : 0;
  const weeklyDD  = acct > 0 ? Math.abs(Math.min(0, weekPnl))  / acct * 100 : 0;
  const dailyMax  = acct * rules.dailyLimitPct / 100;
  const weeklyMax = acct * rules.weeklyLimitPct / 100;
  const remaining = dailyMax - Math.abs(Math.min(0, todayPnl));

  const pct = (v: number, max: number) => Math.min(100, max > 0 ? (v / max) * 100 : 0);
  const pnlColor = (v: number) => v > 0 ? "#00FF7F" : v < 0 ? "#FF3B3B" : "#fff";

  // Count-up for interactive cards
  const totalPnl       = state.trades.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const currentBalance = acct + totalPnl;
  const riskAmount     = (currentBalance * risk) / 100;
  const biasColor      = state.currentBias === "BULLISH" ? "#00FF7F" : "#FF3B3B";
  const biasBg         = state.currentBias === "BULLISH" ? "rgba(0,255,127,0.06)" : "rgba(255,59,59,0.06)";
  const biasBorder     = state.currentBias === "BULLISH" ? "rgba(0,255,127,0.2)"  : "rgba(255,59,59,0.2)";
  const biasGlow       = state.currentBias === "BULLISH"
    ? "0 0 18px 3px rgba(0,255,127,0.35)" : "0 0 18px 3px rgba(255,59,59,0.35)";
  const biasAnim       = state.currentBias === "BULLISH" ? "anim-glow-green" : "anim-glow-red";
  const animPnl        = useCountUp(totalPnl, 700);
  const animTodayPnl   = useCountUp(todayPnl, 700);
  const animBalance    = useCountUp(currentBalance, 700);
  const animRisk       = useCountUp(riskAmount, 500);

  const streak = consWins > 0 ? { n: consWins, label: "WIN", color: "#00FF7F" }
               : consLosses > 0 ? { n: consLosses, label: "LOSS", color: "#FF3B3B" }
               : { n: 0, label: "—", color: "#555" };

  // Monthly PnL data
  const byMonth: Record<string, { pnl: number; wins: number; losses: number; trades: number }> = {};
  for (const t of takeTrades) {
    const m = t.date?.slice(0, 7);
    if (!m) continue;
    if (!byMonth[m]) byMonth[m] = { pnl: 0, wins: 0, losses: 0, trades: 0 };
    byMonth[m].pnl    += t.pnl ?? 0;
    byMonth[m].trades += 1;
    if (t.outcome === "WIN")  byMonth[m].wins++;
    if (t.outcome === "LOSS") byMonth[m].losses++;
  }
  const monthKeys = Object.keys(byMonth).sort((a, b) => b.localeCompare(a));
  const maxAbsPnl = Math.max(1, ...monthKeys.map(m => Math.abs(byMonth[m].pnl)));
  const monthLabel = (key: string) => {
    const [y, mo] = key.split("-");
    return new Date(parseInt(y), parseInt(mo) - 1).toLocaleString("en-US", { month: "long", year: "numeric" });
  };
  const totalWins = takeTrades.filter(t => t.outcome === "WIN").length;
  const totalWinRate = takeTrades.length > 0 ? ((totalWins / takeTrades.length) * 100).toFixed(0) : "0";

  return (
    <div className="flex flex-col gap-4">

      {/* ── Interactive: Risk / PnL / Balance ── */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Risk */}
        <div
          className={`shimmer-card card-hover relative overflow-hidden flex flex-col items-center px-4 py-3 rounded-xl min-w-[100px] ${biasAnim}`}
          style={{ background: biasBg, border: `1px solid ${biasBorder}`, boxShadow: biasGlow }}
        >
          <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: biasColor }}>Risk</span>
          <div className="flex items-center gap-1 mt-1">
            <input
              type="number" value={risk} min={0.1} max={10} step={0.1}
              onChange={e => dispatch({ type: "SET_RISK_PERCENT", payload: parseFloat(e.target.value) || 1 })}
              className="w-10 bg-transparent font-mono font-black text-xl text-white text-center focus:outline-none"
            />
            <span className="font-mono text-sm font-bold text-white">%</span>
          </div>
          <span className="font-mono text-[10px]" style={{ color: biasColor }}>${animRisk.toFixed(0)}</span>
        </div>

        {/* PnL */}
        <div
          className={`shimmer-card card-hover relative overflow-hidden flex flex-col items-center px-4 py-3 rounded-xl min-w-[100px] ${biasAnim}`}
          style={{ background: biasBg, border: `1px solid ${biasBorder}`, boxShadow: biasGlow }}
        >
          <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: biasColor }}>Daily PnL</span>
          <span className="font-mono font-black text-xl mt-1" style={{ color: todayPnl >= 0 ? "#00FF7F" : "#FF3B3B" }}>
            {animTodayPnl >= 0 ? "+" : ""}${Math.abs(animTodayPnl).toFixed(0)}
          </span>
          <span className="font-mono text-[10px] text-[#555]">today</span>
        </div>

        {/* Balance */}
        <div
          className={`shimmer-card card-hover relative overflow-hidden flex flex-col items-center px-5 py-3 rounded-xl min-w-[180px] ${biasAnim}`}
          style={{ background: biasBg, border: `1px solid ${biasBorder}`, boxShadow: biasGlow }}
        >
          <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: biasColor }}>Balance Account</span>
          <div className="flex items-center gap-1 mt-1">
            <span className="font-mono text-sm text-[#555]">$</span>
            <input
              type="number" value={acct} min={0} step={100}
              onChange={e => dispatch({ type: "SET_ACCOUNT_BALANCE", payload: parseFloat(e.target.value) || 0 })}
              className="w-24 bg-transparent font-mono font-black text-xl text-white text-center focus:outline-none"
            />
          </div>
          <span className="font-mono text-[10px]" style={{ color: totalPnl >= 0 ? "#00FF7F" : "#FF3B3B" }}>
            current: ${animBalance.toFixed(0)}
          </span>
        </div>
      </div>

      {/* ── Top 4 stat cards ── */}
      <div className="grid grid-cols-3 gap-4">
        {/* Account Balance with editable name */}
        <div className="rounded-xl p-5" style={{ background: "#0D0F14", border: "1px solid #1E2430" }}>
          <div className="flex items-center gap-2 mb-3">
            {editingName ? (
              <input
                autoFocus
                value={accountName}
                onChange={e => setAccountName(e.target.value)}
                onBlur={() => setEditingName(false)}
                onKeyDown={e => { if (e.key === "Enter" || e.key === "Escape") setEditingName(false); }}
                className="font-mono text-xs font-bold uppercase tracking-widest bg-transparent border-b focus:outline-none w-24"
                style={{ color: "#6AECE1", borderColor: "#6AECE1" }}
              />
            ) : (
              <button
                onClick={() => setEditingName(true)}
                className="font-mono text-xs font-bold uppercase tracking-widest hover:opacity-70 transition-opacity"
                style={{ color: "#6AECE1" }}
                title="Click to rename"
              >
                {accountName}
              </button>
            )}
            <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "#4A5568" }}>· Account Balance</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="font-mono text-[10px] text-[#4A5568] uppercase tracking-widest">Current</span>
            <span className="font-mono text-2xl font-bold" style={{ color: totalPnl >= 0 ? "#00FF7F" : "#FF3B3B" }}>
              ${currentBalance.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="font-mono text-[10px] text-[#4A5568] uppercase tracking-widest">PnL</span>
            <span className="font-mono text-sm font-bold" style={{ color: totalPnl >= 0 ? "#00FF7F" : "#FF3B3B" }}>
              {totalPnl >= 0 ? "+" : ""}${totalPnl.toLocaleString()}
            </span>
          </div>
        </div>
        <StatCard label="This Week"   value={`${weekPnl >= 0 ? "+" : ""}$${Math.abs(weekPnl).toFixed(0)}`}
          sub={`${acct > 0 ? ((weekPnl/acct)*100).toFixed(2) : "0.00"}%`} valueColor={pnlColor(weekPnl)} />
        <StatCard label="This Month"  value={`${monthPnl >= 0 ? "+" : ""}$${Math.abs(monthPnl).toFixed(0)}`}
          sub={`${acct > 0 ? ((monthPnl/acct)*100).toFixed(2) : "0.00"}%`} valueColor={pnlColor(monthPnl)} />
      </div>

      {/* ── 3-column layout ── */}
      <div className="grid grid-cols-3 gap-4">

        {/* LEFT — Position Sizer */}
        <SectionCard title="Position Sizer" titleColor="#00FF7F">
          {/* Instrument */}
          <div>
            <p className="font-sans text-xs text-[#4A5568] mb-1.5">Instrument</p>
            <div className="relative">
              <button
                onClick={() => setInstrOpen(v => !v)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-mono text-sm text-white"
                style={{ background: "#0A0C10", border: "1px solid #2A3040" }}
              >
                {instrument} <ChevronDown size={14} className="text-[#4A5568]" />
              </button>
              {instrOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-lg overflow-hidden" style={{ background: "#0D0F14", border: "1px solid #2A3040" }}>
                  {INSTRUMENTS.map(i => (
                    <button key={i} onClick={() => { setInstrument(i); setInstrOpen(false); }}
                      className="w-full text-left px-3 py-2 font-mono text-xs hover:bg-[#1A2030] transition-colors"
                      style={{ color: i === instrument ? "#00FF7F" : "#8A9AB0" }}>
                      {i}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Risk per trade slider */}
          <div>
            <div className="flex justify-between mb-2">
              <p className="font-sans text-xs text-[#4A5568]">Risk per trade</p>
              <p className="font-mono text-xs font-bold" style={{ color: "#F59E0B" }}>{risk.toFixed(1)}%</p>
            </div>
            <input type="range" min={0.1} max={5} step={0.1} value={risk} readOnly
              className="w-full h-1.5 rounded-full appearance-none cursor-default"
              style={{ background: `linear-gradient(to right, #F59E0B ${(risk/5)*100}%, #1E2430 ${(risk/5)*100}%)` }}
            />
            <div className="flex justify-between mt-1">
              <span className="font-mono text-[10px] text-[#2A3040]">0.1%</span>
              <span className="font-mono text-[10px] text-[#2A3040]">5%</span>
            </div>
          </div>

          {/* SL + RR inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="font-sans text-xs text-[#4A5568] mb-1.5">SL Pips</p>
              <input type="number" value={slPips} min={1} onChange={e => setSlPips(parseInt(e.target.value)||1)}
                className="w-full px-3 py-2.5 rounded-lg font-mono text-sm text-white focus:outline-none"
                style={{ background: "#0A0C10", border: "1px solid #2A3040" }} />
            </div>
            <div>
              <p className="font-sans text-xs text-[#4A5568] mb-1.5">R:R Ratio</p>
              <input type="number" value={rr} min={0.5} step={0.5} onChange={e => setRr(parseFloat(e.target.value)||1)}
                className="w-full px-3 py-2.5 rounded-lg font-mono text-sm text-white focus:outline-none"
                style={{ background: "#0A0C10", border: "1px solid #2A3040" }} />
            </div>
          </div>

          {/* Results */}
          <div className="rounded-lg px-3 py-3 space-y-2" style={{ background: "#0A0C10", border: "1px solid #1A2030" }}>
            {[
              { label: "Lot Size",  value: lotSize.toFixed(2),            color: "#6AECE1" },
              { label: "Risk $",    value: `$${riskDol.toFixed(0)}`,      color: "#FF3B3B" },
              { label: "TP Pips",   value: tpPips.toFixed(1),             color: "#6AECE1" },
              { label: "Reward $",  value: `$${reward.toFixed(0)}`,       color: "#F59E0B" },
              { label: "Pip Value", value: `$${pipVal}/lot`,              color: "#fff"    },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex justify-between items-center">
                <span className="font-sans text-xs text-[#4A5568]">{label}</span>
                <span className="font-mono text-sm font-bold" style={{ color }}>{value}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* MIDDLE — Drawdown Monitor */}
        <SectionCard title="Drawdown Monitor" titleColor="#FF3B3B">
          {/* Limit inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="font-sans text-xs text-[#4A5568] mb-1.5">Daily limit %</p>
              <input type="number" value={rules.dailyLimitPct} min={1} max={20} onChange={e => setRules(r => ({...r, dailyLimitPct: parseFloat(e.target.value)||5}))}
                className="w-full px-3 py-2.5 rounded-lg font-mono text-sm text-white focus:outline-none"
                style={{ background: "#0A0C10", border: "1px solid #2A3040" }} />
            </div>
            <div>
              <p className="font-sans text-xs text-[#4A5568] mb-1.5">Weekly limit %</p>
              <input type="number" value={rules.weeklyLimitPct} min={1} max={30} onChange={e => setRules(r => ({...r, weeklyLimitPct: parseFloat(e.target.value)||10}))}
                className="w-full px-3 py-2.5 rounded-lg font-mono text-sm text-white focus:outline-none"
                style={{ background: "#0A0C10", border: "1px solid #2A3040" }} />
            </div>
          </div>

          {/* Daily drawdown bar */}
          <div>
            <div className="flex justify-between mb-1.5">
              <p className="font-sans text-xs text-[#4A5568]">Daily drawdown</p>
              {dailyDD > 0
                ? <p className="font-mono text-xs font-bold" style={{ color: dailyDD > rules.dailyLimitPct * 0.7 ? "#FF3B3B" : "#F59E0B" }}>{dailyDD.toFixed(2)}% / {rules.dailyLimitPct}%</p>
                : <p className="font-mono text-xs font-bold" style={{ color: "#00FF7F" }}>Safe ✓</p>
              }
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "#1A2030" }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct(dailyDD, rules.dailyLimitPct)}%`, background: dailyDD > rules.dailyLimitPct * 0.7 ? "#FF3B3B" : "#6AECE1" }} />
            </div>
            <div className="flex justify-end mt-1">
              <span className="font-mono text-[10px] text-[#2A3040]">${dailyMax.toFixed(0)} max loss</span>
            </div>
          </div>

          {/* Weekly drawdown bar */}
          <div>
            <div className="flex justify-between mb-1.5">
              <p className="font-sans text-xs text-[#4A5568]">Weekly drawdown</p>
              {weeklyDD > 0
                ? <p className="font-mono text-xs font-bold" style={{ color: weeklyDD > rules.weeklyLimitPct * 0.7 ? "#FF3B3B" : "#F59E0B" }}>{weeklyDD.toFixed(2)}% / {rules.weeklyLimitPct}%</p>
                : <p className="font-mono text-xs font-bold" style={{ color: "#00FF7F" }}>Safe ✓</p>
              }
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "#1A2030" }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct(weeklyDD, rules.weeklyLimitPct)}%`, background: weeklyDD > rules.weeklyLimitPct * 0.7 ? "#FF3B3B" : "#6AECE1" }} />
            </div>
            <div className="flex justify-end mt-1">
              <span className="font-mono text-[10px] text-[#2A3040]">${weeklyMax.toFixed(0)} max loss</span>
            </div>
          </div>

          {/* Net P&L + cushion */}
          <div className="rounded-lg px-4 py-3 space-y-2" style={{ background: "#0A0C10", border: "1px solid #1A2030" }}>
            <div className="flex justify-between">
              <span className="font-sans text-xs text-[#4A5568]">Today net P&L</span>
              <span className="font-mono text-sm font-bold" style={{ color: pnlColor(todayPnl) }}>
                {todayPnl >= 0 ? "+" : ""}${todayPnl.toFixed(0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-sans text-xs text-[#4A5568]">Remaining cushion</span>
              <span className="font-mono text-sm font-bold text-white">${Math.max(0, remaining).toFixed(0)}</span>
            </div>
          </div>
        </SectionCard>

        {/* RIGHT — Risk Rules + Performance Pulse */}
        <div className="flex flex-col gap-4">

          {/* Risk Rules */}
          <SectionCard title="Risk Rules" titleColor="#F59E0B">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="font-sans text-xs text-[#4A5568] mb-1.5">Max risk/trade %</p>
                <input type="number" value={rules.maxRiskPct} min={0.5} step={0.5} onChange={e => setRules(r => ({...r, maxRiskPct: parseFloat(e.target.value)||1}))}
                  className="w-full px-3 py-2.5 rounded-lg font-mono text-sm text-white focus:outline-none"
                  style={{ background: "#0A0C10", border: "1px solid #2A3040" }} />
              </div>
              <div>
                <p className="font-sans text-xs text-[#4A5568] mb-1.5">Trades/day limit</p>
                <input type="number" value={rules.tradesPerDay} min={1} onChange={e => setRules(r => ({...r, tradesPerDay: parseInt(e.target.value)||3}))}
                  className="w-full px-3 py-2.5 rounded-lg font-mono text-sm text-white focus:outline-none"
                  style={{ background: "#0A0C10", border: "1px solid #2A3040" }} />
              </div>
            </div>

            <div>
              <p className="font-sans text-xs text-[#4A5568] mb-1.5">Cons. loss pause</p>
              <input type="number" value={rules.consLossPause} min={1} onChange={e => setRules(r => ({...r, consLossPause: parseInt(e.target.value)||3}))}
                className="w-full px-3 py-2.5 rounded-lg font-mono text-sm text-white focus:outline-none"
                style={{ background: "#0A0C10", border: "1px solid #2A3040" }} />
            </div>

            <div className="space-y-2.5 pt-1 border-t" style={{ borderColor: "#1A2030" }}>
              {[
                { label: "Risk per trade",        value: `${risk.toFixed(1)}% / ${rules.maxRiskPct}%`, bar: risk/rules.maxRiskPct, ok: risk <= rules.maxRiskPct },
                { label: "Daily drawdown",        value: `${dailyDD.toFixed(1)}% / ${rules.dailyLimitPct}%`, bar: dailyDD/rules.dailyLimitPct, ok: dailyDD < rules.dailyLimitPct },
                { label: "Trades today",          value: `${tradesToday} trades / ${rules.tradesPerDay} trades`, bar: tradesToday/rules.tradesPerDay, ok: tradesToday < rules.tradesPerDay },
                { label: "Consecutive losses",    value: `${consLosses} / ${rules.consLossPause}`, bar: consLosses/rules.consLossPause, ok: consLosses < rules.consLossPause },
              ].map(({ label, value, bar, ok }) => (
                <div key={label}>
                  <div className="flex justify-between mb-1">
                    <span className="font-sans text-xs text-[#4A5568]">{label}</span>
                    <span className="font-mono text-xs" style={{ color: ok ? "#fff" : "#FF3B3B" }}>{value}</span>
                  </div>
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: "#1A2030" }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, bar*100)}%`, background: ok ? "#00FF7F" : "#FF3B3B" }} />
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Performance Pulse */}
          <SectionCard title="Performance Pulse" titleColor="#6AECE1">
            {/* Streak */}
            <div className="rounded-lg px-4 py-3 flex items-center justify-between" style={{ background: "#0A0C10", border: "1px solid #1A2030" }}>
              <div>
                <p className="font-sans text-[10px] text-[#4A5568] mb-1">Current streak</p>
                <p className="font-mono text-2xl font-bold" style={{ color: streak.color }}>{streak.n}x</p>
              </div>
              {streak.n > 0 && (
                <div className="px-3 py-1.5 rounded-lg font-mono text-xs font-bold" style={{
                  background: streak.label === "WIN" ? "rgba(0,255,127,0.15)" : "rgba(255,59,59,0.15)",
                  border: `1px solid ${streak.label === "WIN" ? "rgba(0,255,127,0.3)" : "rgba(255,59,59,0.3)"}`,
                  color: streak.color,
                }}>
                  {streak.label === "WIN" ? "↗" : "↘"} {streak.label}
                </div>
              )}
            </div>

            <div className="space-y-2">
              {[
                { label: "Today trades taken",  value: `${tradesToday} / ${rules.tradesPerDay}` },
                { label: "Week trades taken",   value: `${weekTrades}` },
                { label: "Consecutive losses",  value: `${consLosses} / ${rules.consLossPause}` },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between">
                  <span className="font-sans text-xs text-[#4A5568]">{label}</span>
                  <span className="font-mono text-xs font-bold text-white">{value}</span>
                </div>
              ))}
            </div>
          </SectionCard>

        </div>
      </div>

      {/* ── Monthly PnL Breakdown ── */}
      <div className="rounded-xl overflow-hidden" style={{ background: "#0D0F14", border: "1px solid #1E2430" }}>
        <button
          onClick={() => setMonthlyOpen(v => !v)}
          className="w-full px-5 py-3 flex items-center gap-2 text-left hover:bg-[#0A0C10] transition-colors"
          style={{ borderBottom: monthlyOpen ? "1px solid #1E2430" : "none" }}
        >
          <p className="font-mono text-xs font-bold uppercase tracking-widest" style={{ color: "#6AECE1" }}>Monthly PnL</p>
          <span className="font-mono text-[10px] text-[#4A5568] ml-2">{monthKeys.length} months</span>
          <ChevronDown
            size={14}
            className="ml-auto transition-transform duration-300"
            style={{ color: "#444", transform: monthlyOpen ? "rotate(180deg)" : "rotate(0deg)" }}
          />
        </button>

        {monthlyOpen && monthKeys.length === 0 && (
          <div className="px-5 py-10 text-center">
            <p className="font-mono text-xs text-[#333]">No trade data yet</p>
            <p className="font-mono text-[10px] text-[#222] mt-1">Log trades in History to see monthly PnL</p>
          </div>
        )}

        {monthlyOpen && monthKeys.length > 0 && (
          <div className="divide-y" style={{ borderColor: "#1A2030" }}>
            <div className="grid grid-cols-5 px-5 py-2" style={{ background: "#0A0C10" }}>
              {["Month", "PnL", "Trades", "Win Rate", "Bar"].map(h => (
                <span key={h} className="font-mono text-[10px] uppercase tracking-widest text-[#2A3040]">{h}</span>
              ))}
            </div>
            {monthKeys.map(mk => {
              const d = byMonth[mk];
              const winRate = d.trades > 0 ? (d.wins / d.trades) * 100 : 0;
              const barPct  = Math.abs(d.pnl) / maxAbsPnl * 100;
              const pos     = d.pnl >= 0;
              return (
                <div key={mk} className="grid grid-cols-5 items-center px-5 py-3 hover:bg-[#0A0C10] transition-colors">
                  <span className="font-mono text-xs text-white">{monthLabel(mk)}</span>
                  <span className="font-mono text-sm font-bold" style={{ color: pos ? "#00FF7F" : "#FF3B3B" }}>
                    {pos ? "+" : ""}${Math.abs(d.pnl).toFixed(0)}
                  </span>
                  <span className="font-mono text-xs text-[#8A9AB0]">{d.trades} trades</span>
                  <span className="font-mono text-xs font-bold" style={{ color: winRate >= 50 ? "#00FF7F" : "#FF3B3B" }}>
                    {winRate.toFixed(0)}%
                  </span>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "#1A2030" }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${barPct}%`, background: pos ? "#00FF7F" : "#FF3B3B" }} />
                  </div>
                </div>
              );
            })}
            <div className="grid grid-cols-5 items-center px-5 py-3" style={{ background: "#0A0C10" }}>
              <span className="font-mono text-xs font-bold text-white">Total</span>
              <span className="font-mono text-sm font-bold" style={{ color: totalPnl >= 0 ? "#00FF7F" : "#FF3B3B" }}>
                {totalPnl >= 0 ? "+" : ""}${Math.abs(totalPnl).toFixed(0)}
              </span>
              <span className="font-mono text-xs text-[#8A9AB0]">{takeTrades.length} trades</span>
              <span className="font-mono text-xs font-bold" style={{ color: parseInt(totalWinRate) >= 50 ? "#00FF7F" : "#FF3B3B" }}>
                {totalWinRate}%
              </span>
              <span />
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
