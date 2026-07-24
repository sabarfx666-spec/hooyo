"use client";
import { useState, useEffect } from "react";
import { useSabar } from "@/store/SabarContext";
import { PsychologyTag } from "@/store/types";
import { BrainCircuit, Plus } from "lucide-react";

export const PSYCH_NOTE_KEY = "sabar-psych-note";

const tags: { value: PsychologyTag; label: string }[] = [
  { value: "FOMO",          label: "FOMO"          },
  { value: "CALM",          label: "Calm"          },
  { value: "FEAR",          label: "Fear"          },
  { value: "GREED",         label: "Greed"         },
  { value: "OVERCONFIDENT", label: "Overconfident" },
  { value: "HESITATION",    label: "Hesitation"    },
  { value: "REVENGE",       label: "Revenge"       },
  { value: "IMPATIENT",     label: "Impatient"     },
  { value: "FOCUSED",       label: "Focused"       },
  { value: "UNCERTAIN",     label: "Uncertain"     },
];

const GOOD: PsychologyTag[] = ["CALM", "FOCUSED"];

export function PsychologySelector() {
  const { state, dispatch } = useSabar();
  const [note, setNote] = useState("");

  useEffect(() => {
    try { setNote(localStorage.getItem(PSYCH_NOTE_KEY) ?? ""); } catch {}
  }, []);

  const updateNote = (val: string) => {
    setNote(val);
    try { localStorage.setItem(PSYCH_NOTE_KEY, val); } catch {}
  };

  return (
    <div className="rounded-2xl p-5" style={{ background: "rgba(20,20,20,0.6)", border: "1px solid #262626" }}>
      <div className="flex items-center gap-2.5 mb-4">
        <BrainCircuit size={19} strokeWidth={2} style={{ color: "#EF4444" }} />
        <h3 className="font-sans font-bold text-white text-base">Psychology (Before Entry)</h3>
      </div>

      <div className="flex flex-wrap gap-2.5">
        {tags.map(({ value, label }) => {
          const active = state.currentPsychology.includes(value);
          const color  = GOOD.includes(value) ? "#22C55E" : "#EF4444";
          return (
            <button
              key={value}
              onClick={() => dispatch({ type: "TOGGLE_PSYCHOLOGY", payload: value })}
              className="px-4 py-2 rounded-full font-sans text-sm font-medium border transition-all duration-200"
              style={active
                ? { color, borderColor: color, background: `${color}14`, boxShadow: `0 0 12px 1px ${color}33` }
                : { color: "#B0B0B0", borderColor: "#2E2E2E", background: "#161616" }}
            >
              {label}
            </button>
          );
        })}

        <button
          onClick={() => dispatch({ type: "TOGGLE_PSYCHOLOGY", payload: "CUSTOM" })}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full font-sans text-sm font-medium border border-dashed transition-all duration-200"
          style={state.currentPsychology.includes("CUSTOM")
            ? { color: "#B0B0B0", borderColor: "#666", background: "#1E1E1E" }
            : { color: "#8A8A8A", borderColor: "#333", background: "transparent" }}
        >
          <Plus size={13} /> Custom
        </button>
      </div>

      <input
        value={note}
        onChange={e => updateNote(e.target.value)}
        placeholder="Optional note (1 line)..."
        className="mt-4 w-full font-sans text-sm text-white px-4 py-3 rounded-xl focus:outline-none placeholder-[#555]"
        style={{ background: "#101010", border: "1px solid #262626" }}
      />
    </div>
  );
}
