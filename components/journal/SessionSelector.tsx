"use client";
import { useSabar } from "@/store/SabarContext";
import { Session } from "@/store/types";
import { MapPin } from "lucide-react";

const options: { value: Session; label: string }[] = [
  { value: "ASIAN",    label: "Asian"    },
  { value: "LONDON",   label: "London"   },
  { value: "NEW_YORK", label: "New York" },
];

const ACTIVE = "#F59E0B";

export function SessionSelector() {
  const { state, dispatch } = useSabar();

  return (
    <div>
      <p className="font-sans text-sm font-medium mb-2.5" style={{ color: "#A0A0A0" }}>Session</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {options.map(({ value, label }) => {
          const active = state.currentSession === value;
          return (
            <button
              key={value}
              onClick={() => dispatch({ type: "SET_SESSION", payload: value })}
              className="relative overflow-hidden flex items-center justify-center gap-2 py-3.5 rounded-xl font-sans font-semibold text-base transition-all duration-300 border"
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
              <MapPin size={17} strokeWidth={2.5} className="relative z-10" style={{ color: active ? ACTIVE : "#8A8A8A" }} />
              <span className="relative z-10">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
