"use client";
import { useSabar } from "@/store/SabarContext";
import { useEffect, useState, useRef } from "react";

function useCountUp(target: number, duration = 600) {
  const [value, setValue] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const start = prev.current;
    const diff  = target - start;
    if (diff === 0) return;
    const startTime = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration);
      const ease = 1 - Math.pow(1 - t, 3);
      setValue(start + diff * ease);
      if (t < 1) requestAnimationFrame(step);
      else { prev.current = target; setValue(target); }
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return value;
}

export function DashboardStats() {
  const { state, dispatch } = useSabar();

  const totalPnl       = state.trades.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const currentBalance = state.accountBalance + totalPnl;
  const riskAmount     = (currentBalance * state.riskPercent) / 100;

  const animPnl     = useCountUp(totalPnl, 700);
  const animBalance = useCountUp(currentBalance, 700);
  const animRisk    = useCountUp(riskAmount, 500);

  const biasColor  = state.currentBias === "BULLISH" ? "#00FF7F" : "#FF3B3B";
  const biasGlow   = state.currentBias === "BULLISH"
    ? "0 0 18px 3px rgba(0,255,127,0.35)"
    : "0 0 18px 3px rgba(255,59,59,0.35)";
  const biasBg     = state.currentBias === "BULLISH" ? "rgba(0,255,127,0.06)" : "rgba(255,59,59,0.06)";
  const biasBorder = state.currentBias === "BULLISH" ? "rgba(0,255,127,0.2)"  : "rgba(255,59,59,0.2)";
  const biasAnim   = state.currentBias === "BULLISH" ? "anim-glow-green"       : "anim-glow-red";

  return (
    <div className="flex items-center gap-3">

      {/* Risk */}
      <div
        className={`shimmer-card card-hover relative overflow-hidden flex flex-col items-center px-4 py-2.5 rounded-xl min-w-[90px] ${biasAnim}`}
        style={{ background: biasBg, border: `1px solid ${biasBorder}`, boxShadow: biasGlow }}
      >
        <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: biasColor }}>Risk</span>
        <div className="flex items-center gap-1 mt-0.5">
          <input
            type="number"
            value={state.riskPercent}
            min={0.1} max={10} step={0.1}
            onChange={e => dispatch({ type: "SET_RISK_PERCENT", payload: parseFloat(e.target.value) || 1 })}
            className="w-10 bg-transparent font-mono font-black text-lg text-white text-center focus:outline-none"
          />
          <span className="font-mono text-sm font-bold text-white">%</span>
        </div>
        <span className="font-mono text-[10px] anim-count" style={{ color: biasColor }}>
          ${animRisk.toFixed(0)}
        </span>
      </div>

      {/* PnL */}
      <div
        className={`shimmer-card card-hover relative overflow-hidden flex flex-col items-center px-4 py-2.5 rounded-xl min-w-[90px] ${biasAnim}`}
        style={{ background: biasBg, border: `1px solid ${biasBorder}`, boxShadow: biasGlow }}
      >
        <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: biasColor }}>PnL</span>
        <span className="font-mono font-black text-lg mt-0.5 anim-count" style={{ color: totalPnl >= 0 ? "#00FF7F" : "#FF3B3B" }}>
          {animPnl >= 0 ? "+" : ""}${Math.abs(animPnl).toFixed(0)}
        </span>
        <span className="font-mono text-[10px] text-[#555]">all trades</span>
      </div>

      {/* Balance */}
      <div
        className={`shimmer-card card-hover relative overflow-hidden flex flex-col items-center px-5 py-2.5 rounded-xl min-w-[170px] ${biasAnim}`}
        style={{ background: biasBg, border: `1px solid ${biasBorder}`, boxShadow: biasGlow }}
      >
        <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: biasColor }}>Balance Account</span>
        <div className="flex items-center gap-1 mt-0.5">
          <span className="font-mono text-sm text-[#555]">$</span>
          <input
            type="number"
            value={state.accountBalance}
            min={0} step={100}
            onChange={e => dispatch({ type: "SET_ACCOUNT_BALANCE", payload: parseFloat(e.target.value) || 0 })}
            className="w-24 bg-transparent font-mono font-black text-lg text-white text-center focus:outline-none"
          />
        </div>
        <span className="font-mono text-[10px] anim-count" style={{ color: totalPnl >= 0 ? "#00FF7F" : "#FF3B3B" }}>
          current: ${animBalance.toFixed(0)}
        </span>
      </div>

    </div>
  );
}
