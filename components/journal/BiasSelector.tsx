"use client";
import { useSabar } from "@/store/SabarContext";
import { Bias } from "@/store/types";
import { TrendingUp, TrendingDown } from "lucide-react";

const options: { value: Bias; label: string; color: string; bg: string; glowAnim: string; Icon: typeof TrendingUp }[] = [
  {
    value: "BULLISH", label: "Bullish", color: "#00FF7F",
    bg: "rgba(0,255,127,0.10)", glowAnim: "anim-glow-green",
    Icon: TrendingUp,
  },
  {
    value: "BEARISH", label: "Bearish", color: "#FF3B3B",
    bg: "rgba(255,59,59,0.10)", glowAnim: "anim-glow-red",
    Icon: TrendingDown,
  },
];

export function BiasSelector() {
  const { state, dispatch } = useSabar();

  return (
    <div className="shimmer-card card-hover relative overflow-hidden rounded-xl p-4" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>
      <p className="font-mono text-[10px] uppercase tracking-widest text-[#444] mb-3">Direction</p>
      <div className="flex gap-2">
        {options.map(({ value, label, color, bg, glowAnim, Icon }) => {
          const active = state.currentBias === value;
          return (
            <button
              key={value}
              onClick={() => dispatch({ type: "SET_BIAS", payload: value })}
              className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl font-sans font-bold text-sm transition-all duration-300 border ${active ? glowAnim : ""}`}
              style={{
                color:       active ? color : "#333",
                borderColor: active ? color + "55" : "#1A1A1A",
                background:  active ? bg : "rgba(255,255,255,0.02)",
              }}
            >
              <Icon
                size={18}
                strokeWidth={2.5}
                className={active ? "anim-float" : ""}
                style={{ color: active ? color : "#333" }}
              />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
