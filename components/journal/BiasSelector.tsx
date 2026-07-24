"use client";
import { useSabar } from "@/store/SabarContext";
import { Bias } from "@/store/types";
import { TrendingUp, TrendingDown } from "lucide-react";

const options: { value: Bias; label: string; color: string; Icon: typeof TrendingUp }[] = [
  { value: "BULLISH", label: "Bullish", color: "#22C55E", Icon: TrendingUp },
  { value: "BEARISH", label: "Bearish", color: "#EF4444", Icon: TrendingDown },
];

export function BiasSelector() {
  const { state, dispatch } = useSabar();

  return (
    <div>
      <p className="font-sans text-sm font-medium mb-2.5" style={{ color: "#A0A0A0" }}>Direction</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {options.map(({ value, label, color, Icon }) => {
          const active = state.currentBias === value;
          return (
            <button
              key={value}
              onClick={() => dispatch({ type: "SET_BIAS", payload: value })}
              className="relative overflow-hidden flex items-center justify-center gap-2.5 py-4 rounded-xl font-sans font-semibold text-base transition-all duration-300 border"
              style={active
                ? {
                    color: "#fff",
                    borderColor: color,
                    background: `${color}14`,
                    boxShadow: `0 0 18px 2px ${color}33, inset 0 0 24px ${color}14`,
                  }
                : {
                    color: "#8A8A8A",
                    borderColor: "#2A2A2A",
                    background: "rgba(255,255,255,0.02)",
                  }}
            >
              {/* sweeping gradient on the active side */}
              {active && (
                <span
                  className="absolute inset-y-0 anim-sweep pointer-events-none"
                  style={{
                    left: "-50%",
                    width: "200%",
                    background: `linear-gradient(90deg, transparent, ${color}1A 35%, ${color}45 50%, ${color}1A 65%, transparent)`,
                  }}
                />
              )}
              <Icon size={20} strokeWidth={2.5} className="relative z-10" style={{ color: active ? color : "#8A8A8A" }} />
              <span className="relative z-10">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
