"use client";
import { useSabar } from "@/store/SabarContext";
import { Session } from "@/store/types";
import { MapPin } from "lucide-react";

const options: { value: Session; label: string; color: string; bg: string; glowAnim: string }[] = [
  {
    value: "LONDON",   label: "London",   color: "#D946A8",
    bg: "rgba(217,70,168,0.10)", glowAnim: "anim-glow-amber",
  },
  {
    value: "NEW_YORK", label: "New York", color: "#F59E0B",
    bg: "rgba(245,158,11,0.10)", glowAnim: "anim-glow-orange",
  },
];

export function SessionSelector() {
  const { state, dispatch } = useSabar();

  return (
    <div className="shimmer-card card-hover relative overflow-hidden rounded-xl p-4" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>
      <p className="font-mono text-[10px] uppercase tracking-widest text-[#444] mb-3">Session</p>
      <div className="flex gap-2">
        {options.map(({ value, label, color, bg, glowAnim }) => {
          const active = state.currentSession === value;
          return (
            <button
              key={value}
              onClick={() => dispatch({ type: "SET_SESSION", payload: value })}
              className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl font-sans font-bold text-sm transition-all duration-300 border ${active ? glowAnim : ""}`}
              style={{
                color:       active ? color : "#333",
                borderColor: active ? color + "55" : "#1A1A1A",
                background:  active ? bg : "rgba(255,255,255,0.02)",
              }}
            >
              <MapPin
                size={16}
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
