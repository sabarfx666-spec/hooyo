"use client";
import { useSabar } from "@/store/SabarContext";
import { Trash2 } from "lucide-react";
import { Trade } from "@/store/types";

const OUTCOME_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  WIN:  { color: "#00FF7F", bg: "rgba(0,255,127,0.1)",  label: "WIN"  },
  LOSS: { color: "#FF3B3B", bg: "rgba(255,59,59,0.1)",  label: "LOSS" },
  BE:   { color: "#6AECE1", bg: "rgba(106,236,225,0.1)", label: "BE"  },
};

const SESSION_LABEL: Record<string, string> = {
  ASIAN:    "Asian",
  LONDON:   "London",
  NEW_YORK: "New York",
};

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function TradeHistory() {
  const { state, dispatch } = useSabar();
  const trades = [...state.trades].reverse();

  return (
    <div className="bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-mono text-xs text-[#A0A0A0] uppercase tracking-widest">Trade History</h3>
        <span className="font-mono text-xs text-[#444]">{trades.length} trades</span>
      </div>

      {trades.length === 0 ? (
        <p className="font-mono text-xs text-[#333] text-center py-8">No trades recorded yet.</p>
      ) : (
        <div className="space-y-2">
          {trades.map((trade: Trade) => {
            const outcome = trade.outcome ? OUTCOME_STYLE[trade.outcome] : null;
            const isSkip = trade.decision === "SKIP";
            const pct = trade.totalRules > 0 ? Math.round((trade.checkedCount / trade.totalRules) * 100) : 0;

            return (
              <div
                key={trade.id}
                className="group flex items-center gap-3 px-3 py-3 rounded-lg border border-[#1A1A1A] hover:border-[#2A2A2A] transition-all duration-150"
              >
                {/* Outcome / Skip badge */}
                <div className="shrink-0 w-14 text-center">
                  {isSkip ? (
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded" style={{ color: "#555", background: "rgba(80,80,80,0.15)" }}>SKIP</span>
                  ) : outcome ? (
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded" style={{ color: outcome.color, background: outcome.bg }}>{outcome.label}</span>
                  ) : (
                    <span className="font-mono text-xs text-[#444]">—</span>
                  )}
                </div>

                {/* Pair */}
                <span className="font-mono text-sm font-bold text-white w-20 shrink-0">{trade.pair}</span>

                {/* Session */}
                <span className="font-sans text-xs text-[#555] w-20 shrink-0">{SESSION_LABEL[trade.session] ?? trade.session}</span>

                {/* Bias */}
                <span
                  className="font-mono text-xs font-bold w-16 shrink-0"
                  style={{ color: trade.bias === "BULLISH" ? "#00FF7F" : "#FF3B3B" }}
                >
                  {trade.bias === "BULLISH" ? "↑ BULL" : "↓ BEAR"}
                </span>

                {/* Rules pct */}
                <span className="font-mono text-xs text-[#555] hidden sm:block">{trade.checkedCount}/{trade.totalRules} <span className="text-[#444]">({pct}%)</span></span>

                {/* Notes */}
                {trade.notes && (
                  <span className="font-sans text-xs text-[#444] truncate flex-1 hidden md:block">{trade.notes}</span>
                )}

                {/* Date */}
                <span className="font-mono text-xs text-[#333] ml-auto shrink-0 hidden sm:block">{formatTime(trade.date)}</span>

                {/* Delete */}
                <button
                  onClick={() => dispatch({ type: "DELETE_TRADE", payload: trade.id })}
                  className="shrink-0 opacity-0 group-hover:opacity-100 text-[#333] hover:text-[#FF3B3B] transition-all duration-150 ml-2"
                  title="Delete trade"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
