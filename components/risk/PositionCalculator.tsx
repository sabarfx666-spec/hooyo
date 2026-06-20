"use client";
import { useState, useEffect } from "react";
import { useSabar } from "@/store/SabarContext";
import { calcPips, calcRR, calcLotSize, PIP_VALUES } from "@/lib/utils";
import { RiskSummary } from "./RiskSummary";
import { Badge } from "@/components/ui/Badge";

export function PositionCalculator() {
  const { state } = useSabar();
  const [balance, setBalance] = useState("10000");
  const [riskPct, setRiskPct] = useState("1");
  const [entry, setEntry] = useState("");
  const [sl, setSl] = useState("");
  const [tp, setTp] = useState("");
  const [pair, setPair] = useState(state.currentPair);

  const riskAmount = parseFloat(balance) * (parseFloat(riskPct) / 100) || 0;
  const slPips = entry && sl ? calcPips(parseFloat(entry), parseFloat(sl), pair) : 0;
  const pipValue = PIP_VALUES[pair] ?? 10;
  const lotSize = calcLotSize(riskAmount, slPips, pipValue);
  const rr = entry && sl && tp ? calcRR(parseFloat(entry), parseFloat(sl), parseFloat(tp)) : 0;
  const maxGain = riskAmount * rr;

  const warnings: string[] = [];
  if (parseFloat(riskPct) > 2) warnings.push("High Risk");
  if (rr > 0 && rr < 1.5) warnings.push("Poor R:R");

  useEffect(() => { setPair(state.currentPair); }, [state.currentPair]);

  const inputCls = "w-full bg-[#1A1A1A] border border-[#2A2A2A] text-white font-mono text-sm px-3 py-2 rounded focus:outline-none focus:border-[#6AECE1] placeholder-[#A0A0A0]";

  return (
    <div className="space-y-4">
      <div className="bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg p-5">
        <h2 className="font-mono text-sm font-bold text-[#6AECE1] uppercase tracking-widest mb-4">Position Calculator</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-mono text-xs text-[#A0A0A0] block mb-1.5 uppercase tracking-wider">Account Balance ($)</label>
            <input value={balance} onChange={(e) => setBalance(e.target.value)} placeholder="10000" className={inputCls} type="number" />
          </div>
          <div>
            <label className="font-mono text-xs text-[#A0A0A0] block mb-1.5 uppercase tracking-wider">Risk %</label>
            <input value={riskPct} onChange={(e) => setRiskPct(e.target.value)} placeholder="1" className={inputCls} type="number" step="0.1" />
          </div>
          <div>
            <label className="font-mono text-xs text-[#A0A0A0] block mb-1.5 uppercase tracking-wider">Entry Price</label>
            <input value={entry} onChange={(e) => setEntry(e.target.value)} placeholder="1.08000" className={inputCls} type="number" step="0.00001" />
          </div>
          <div>
            <label className="font-mono text-xs text-[#A0A0A0] block mb-1.5 uppercase tracking-wider">Stop Loss Price</label>
            <input value={sl} onChange={(e) => setSl(e.target.value)} placeholder="1.07850" className={inputCls} type="number" step="0.00001" />
          </div>
          <div>
            <label className="font-mono text-xs text-[#A0A0A0] block mb-1.5 uppercase tracking-wider">Take Profit Price</label>
            <input value={tp} onChange={(e) => setTp(e.target.value)} placeholder="1.08375" className={inputCls} type="number" step="0.00001" />
          </div>
          <div>
            <label className="font-mono text-xs text-[#A0A0A0] block mb-1.5 uppercase tracking-wider">Pair</label>
            <select
              value={pair}
              onChange={(e) => setPair(e.target.value)}
              className={inputCls}
            >
              {state.pairs.filter((p) => p.active).map((p) => (
                <option key={p.id} value={p.symbol}>{p.symbol}</option>
              ))}
            </select>
          </div>
        </div>

        {warnings.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {warnings.map((w) => (
              <Badge key={w} variant="warning">⚠ {w}</Badge>
            ))}
          </div>
        )}
      </div>

      <RiskSummary
        riskAmount={riskAmount}
        slPips={slPips}
        lotSize={lotSize}
        rr={rr}
        maxGain={maxGain}
      />
    </div>
  );
}
