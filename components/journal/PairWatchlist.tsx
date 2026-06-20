"use client";
import { useState } from "react";
import { useSabar } from "@/store/SabarContext";
import { X } from "lucide-react";

export function PairWatchlist() {
  const { state, dispatch } = useSabar();
  const [adding, setAdding] = useState(false);
  const [input, setInput]   = useState("");

  const activePairs  = state.pairs.filter(p => p.active);
  const isBull       = state.currentBias === "BULLISH";
  const activeColor  = isBull ? "#00FF7F" : "#FF3B3B";
  const activeBg     = isBull ? "rgba(0,255,127,0.10)" : "rgba(255,59,59,0.10)";
  const activeGlow   = isBull
    ? "0 0 14px 2px rgba(0,255,127,0.45), inset 0 0 10px rgba(0,255,127,0.06)"
    : "0 0 14px 2px rgba(255,59,59,0.45), inset 0 0 10px rgba(255,59,59,0.06)";
  const glowAnim     = isBull ? "anim-glow-green" : "anim-glow-red";

  const handleAdd = () => {
    if (input.trim()) {
      dispatch({ type: "ADD_PAIR", payload: input.trim() });
      setInput(""); setAdding(false);
    }
  };

  return (
    <div className="shimmer-card card-hover relative overflow-hidden rounded-xl p-4" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>
      <p className="font-mono text-[10px] uppercase tracking-widest text-[#444] mb-3">Pair Watchlist</p>

      <div className="flex flex-wrap gap-2">
        {activePairs.map((pair, i) => {
          const active = state.currentPair === pair.symbol;
          return (
            <div key={pair.id} className="relative group">
              <button
                onClick={() => dispatch({ type: "SET_PAIR", payload: pair.symbol })}
                className={`px-4 py-2.5 rounded-xl font-mono font-bold text-sm transition-all duration-200 border ${active ? glowAnim : ""}`}
                style={active
                  ? { color: activeColor, borderColor: activeColor + "55", background: activeBg, boxShadow: activeGlow }
                  : { color: "#444", borderColor: "#1A1A1A", background: "rgba(255,255,255,0.02)" }
                }
              >
                {pair.symbol}
              </button>
              {pair.custom && (
                <button
                  onClick={() => dispatch({ type: "REMOVE_PAIR", payload: pair.id })}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                  style={{ background: "#1A1A1A", border: "1px solid #2A2A2A", color: "#555" }}
                >
                  <X size={9} />
                </button>
              )}
            </div>
          );
        })}

        {adding ? (
          <div className="flex gap-2 items-center">
            <input
              autoFocus value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") { setAdding(false); setInput(""); } }}
              placeholder="e.g. USDCAD"
              className="font-mono text-sm text-white px-3 py-2.5 rounded-xl focus:outline-none placeholder-[#333] w-28"
              style={{ background: "#111", border: "1px solid #2A2A2A" }}
            />
            <button onClick={handleAdd} className="px-3 py-2.5 rounded-xl font-mono font-bold text-sm" style={{ background: "#FF3B3B", color: "#fff" }}>Add</button>
            <button onClick={() => { setAdding(false); setInput(""); }} className="px-3 py-2.5 rounded-xl font-mono text-sm text-[#555]" style={{ background: "#111", border: "1px solid #1A1A1A" }}>✕</button>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="px-4 py-2.5 rounded-xl font-mono text-sm border transition-all duration-200 hover:border-[#333] hover:text-[#666]"
            style={{ color: "#2A2A2A", borderColor: "#1A1A1A", background: "rgba(255,255,255,0.02)" }}
          >
            Custom…
          </button>
        )}
      </div>
    </div>
  );
}
