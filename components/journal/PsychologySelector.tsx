"use client";
import { useSabar } from "@/store/SabarContext";
import { PsychologyTag } from "@/store/types";

const tags: PsychologyTag[] = ["FOMO", "CALM", "FEAR", "GREED", "CUSTOM"];

const TAG_META: Record<PsychologyTag, { color: string; bg: string; glow: string }> = {
  FOMO:   { color: "#FF3B3B", bg: "rgba(255,59,59,0.12)",   glow: "0 0 12px 2px rgba(255,59,59,0.4)"   },
  CALM:   { color: "#6AECE1", bg: "rgba(106,236,225,0.12)", glow: "0 0 12px 2px rgba(106,236,225,0.4)" },
  FEAR:   { color: "#FF9900", bg: "rgba(255,153,0,0.12)",   glow: "0 0 12px 2px rgba(255,153,0,0.4)"   },
  GREED:  { color: "#FF0066", bg: "rgba(255,0,102,0.12)",   glow: "0 0 12px 2px rgba(255,0,102,0.4)"   },
  CUSTOM: { color: "#A0A0A0", bg: "rgba(160,160,160,0.10)", glow: "0 0 12px 2px rgba(160,160,160,0.3)" },
};

export function PsychologySelector() {
  const { state, dispatch } = useSabar();

  return (
    <div className="shimmer-card card-hover relative overflow-hidden rounded-xl p-4" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>
      <p className="font-mono text-[10px] uppercase tracking-widest text-[#444] mb-3">Psychology</p>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag, i) => {
          const active = state.currentPsychology.includes(tag);
          const { color, bg, glow } = TAG_META[tag];
          return (
            <button
              key={tag}
              onClick={() => dispatch({ type: "TOGGLE_PSYCHOLOGY", payload: tag })}
              className="px-3 py-2 rounded-lg font-mono text-xs font-bold border transition-all duration-200"
              style={active
                ? { color, borderColor: color + "66", background: bg, boxShadow: glow, animationDelay: `${i * 0.05}s` }
                : { color: "#333", borderColor: "#1A1A1A", background: "rgba(255,255,255,0.02)" }
              }
            >
              {tag}
            </button>
          );
        })}
      </div>
    </div>
  );
}
