"use client";
import { useState } from "react";
import { useSabar } from "@/store/SabarContext";
import { X } from "lucide-react";

const ACTIVE = "#EF4444";

export function PairWatchlist() {
  const { state, dispatch } = useSabar();
  const [adding, setAdding] = useState(false);
  const [input, setInput]   = useState("");

  const activePairs = state.pairs.filter(p => p.active);

  const handleAdd = () => {
    if (input.trim()) {
      dispatch({ type: "ADD_PAIR", payload: input.trim() });
      setInput(""); setAdding(false);
    }
  };

  return (
    <div>
      <p className="font-sans text-sm font-medium mb-2.5" style={{ color: "#A0A0A0" }}>Pair Watchlist</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {activePairs.map((pair) => {
          const active = state.currentPair === pair.symbol;
          return (
            <div key={pair.id} className="relative group">
              <button
                onClick={() => dispatch({ type: "SET_PAIR", payload: pair.symbol })}
                className="relative overflow-hidden w-full py-3 rounded-xl font-sans font-semibold text-base transition-all duration-200 border"
                style={active
                  ? {
                      color: ACTIVE,
                      borderColor: ACTIVE,
                      background: `${ACTIVE}14`,
                      boxShadow: `0 0 18px 2px ${ACTIVE}33, inset 0 0 24px ${ACTIVE}0F`,
                    }
                  : {
                      color: "#8A8A8A",
                      borderColor: "#2A2A2A",
                      background: "rgba(255,255,255,0.02)",
                    }}
              >
                {active && (
                  <span
                    className="absolute inset-y-0 anim-sweep pointer-events-none"
                    style={{
                      left: "-50%",
                      width: "200%",
                      background: `linear-gradient(90deg, transparent, ${ACTIVE}17 35%, ${ACTIVE}40 50%, ${ACTIVE}17 65%, transparent)`,
                    }}
                  />
                )}
                <span className="relative z-10">{pair.symbol}</span>
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
          <div className="flex gap-2 items-center col-span-2">
            <input
              autoFocus value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") { setAdding(false); setInput(""); } }}
              placeholder="e.g. USDCAD"
              className="font-sans text-sm text-white px-3 py-3 rounded-xl focus:outline-none placeholder-[#555] w-full min-w-0"
              style={{ background: "#141414", border: "1px solid #2A2A2A" }}
            />
            <button onClick={handleAdd} className="px-4 py-3 rounded-xl font-sans font-bold text-sm shrink-0" style={{ background: ACTIVE, color: "#fff" }}>Add</button>
            <button onClick={() => { setAdding(false); setInput(""); }} className="px-3 py-3 rounded-xl font-sans text-sm text-[#555] shrink-0" style={{ background: "#141414", border: "1px solid #2A2A2A" }}>✕</button>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="py-3 rounded-xl font-sans text-base border transition-all duration-200 hover:border-[#444] hover:text-[#999]"
            style={{ color: "#666", borderColor: "#2A2A2A", background: "rgba(255,255,255,0.02)" }}
          >
            Custom…
          </button>
        )}
      </div>
    </div>
  );
}
