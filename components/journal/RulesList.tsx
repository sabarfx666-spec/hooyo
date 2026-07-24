"use client";
import { useState, useRef } from "react";
import { useSabar } from "@/store/SabarContext";
import { Rule } from "@/store/types";
import { Plus, Trash2, GripVertical, ChevronRight, Check, Circle } from "lucide-react";

interface RulesListProps {
  category: "BASIS" | "ENTRY";
}

const PANEL = {
  BASIS: { title: "HTF Bias",        subtitle: "Daily & 4-Hour Timeframe" },
  ENTRY: { title: "LTF Entry Model", subtitle: "New York Session" },
};

const ACCENT = "#22C55E";
const DELAYS = ["0ms","60ms","120ms","180ms","240ms","300ms","360ms","420ms","480ms","540ms"];

export function RulesList({ category }: RulesListProps) {
  const { state, dispatch } = useSabar();
  const [adding, setAdding]   = useState(false);
  const [input, setInput]     = useState("");
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [justChecked, setJustChecked] = useState<string | null>(null);
  const dragIndex = useRef<number | null>(null);

  const bias      = state.currentBias;
  const isBull    = bias === "BULLISH";
  const biasColor = isBull ? "#22C55E" : "#EF4444";
  const biasBg    = isBull ? "rgba(34,197,94,0.07)" : "rgba(239,68,68,0.07)";

  const biasSet   = state.biasRules?.[bias] ?? [];
  const rules     = biasSet.filter(r => r.category === category);
  const checked   = rules.filter(r => r.checked).length;
  const total     = rules.length;
  const pct       = total > 0 ? Math.round((checked / total) * 100) : 0;

  const handleToggle = (id: string) => {
    setJustChecked(id);
    setTimeout(() => setJustChecked(null), 400);
    dispatch({ type: "TOGGLE_BIAS_RULE", payload: { bias, id } });
  };

  const handleAdd = () => {
    if (input.trim()) {
      dispatch({ type: "ADD_BIAS_RULE", payload: { bias, label: input.trim(), category } });
      setInput(""); setAdding(false);
    }
  };

  const onDragStart = (i: number) => { dragIndex.current = i; };
  const onDragOver  = (e: React.DragEvent, i: number) => { e.preventDefault(); setDragOver(i); };
  const onDrop      = (toIndex: number) => {
    if (dragIndex.current !== null && dragIndex.current !== toIndex)
      dispatch({ type: "REORDER_BIAS_RULES", payload: { bias, category, fromIndex: dragIndex.current, toIndex } });
    dragIndex.current = null; setDragOver(null);
  };
  const onDragEnd = () => { dragIndex.current = null; setDragOver(null); };

  return (
    <div className="rounded-2xl p-5 h-full"
      style={{ background: "rgba(20,20,20,0.6)", border: "1px solid #262626" }}>

      {/* Header */}
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-center gap-2">
          <ChevronRight size={18} strokeWidth={3} style={{ color: ACCENT }} />
          <h3 className="font-sans font-bold text-white text-lg">{PANEL[category].title}</h3>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className="font-sans text-base font-bold" style={{ color: ACCENT }}>{checked}/{total}</span>
          <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "#1E1E1E" }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, background: ACCENT, boxShadow: `0 0 8px 2px ${ACCENT}88` }} />
          </div>
        </div>
      </div>

      <p className="font-sans text-sm mb-4 pl-6" style={{ color: "#777" }}>
        {PANEL[category].subtitle}
      </p>

      {/* Rules */}
      <div className="space-y-1.5">
        {rules.map((rule: Rule, index: number) => (
          <div key={rule.id} draggable
            onDragStart={() => onDragStart(index)}
            onDragOver={e => onDragOver(e, index)}
            onDrop={() => onDrop(index)}
            onDragEnd={onDragEnd}
            className={`group relative anim-fade-up ${rule.indent ? "ml-5" : ""}`}
            style={{ animationDelay: DELAYS[index] ?? "500ms", animationFillMode: "both" }}>

            {dragOver === index && (
              <div className="absolute -top-0.5 left-0 right-0 h-0.5 rounded-full" style={{ backgroundColor: ACCENT }} />
            )}

            <div className="flex flex-col">
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border-l-4 transition-all duration-200"
                style={rule.checked
                  ? { borderLeftColor: biasColor, background: biasBg }
                  : { borderLeftColor: rule.indent ? "#222" : "transparent", background: "transparent" }}>

                {/* Indent bar */}
                {rule.indent && <div className="w-px h-4 rounded-full flex-shrink-0" style={{ background: "#2A2A2A" }} />}

                {/* Drag grip */}
                <span className="opacity-0 group-hover:opacity-30 cursor-grab active:cursor-grabbing text-[#A0A0A0] shrink-0 -ml-1">
                  <GripVertical size={12} />
                </span>

                {/* Checkbox */}
                <button onClick={() => handleToggle(rule.id)} className="shrink-0"
                  style={{
                    transform: justChecked === rule.id ? "scale(1.4)" : "scale(1)",
                    transition: "transform 0.2s cubic-bezier(0.34,1.56,0.64,1)",
                    filter: rule.checked ? `drop-shadow(0 0 6px ${biasColor})` : "none",
                  }}>
                  {rule.checked
                    ? <span className="rounded-full flex items-center justify-center"
                        style={{ width: rule.indent ? 19 : 23, height: rule.indent ? 19 : 23, background: biasColor }}>
                        <Check size={rule.indent ? 11 : 13} strokeWidth={3.5} color="#FFFFFF" />
                      </span>
                    : <Circle size={rule.indent ? 19 : 23} strokeWidth={1.5} color="#4A4A4A" />}
                </button>

                {/* Label */}
                <button onClick={() => handleToggle(rule.id)}
                  className="flex-1 text-left font-sans transition-all duration-200"
                  style={{ fontSize: rule.indent ? "13px" : "15px", color: rule.checked ? "#fff" : "#9A9A9A", fontWeight: rule.checked ? 600 : 400 }}>
                  {rule.label}
                </button>

                {/* Either/Or badge */}
                {rule.tag === "EITHER_OR" && (
                  <span className="shrink-0 px-2 py-0.5 rounded-md font-sans text-[11px] font-semibold italic"
                    style={{ background: "rgba(34,197,94,0.1)", color: ACCENT, border: "1px solid rgba(34,197,94,0.3)" }}>
                    Either/Or
                  </span>
                )}

                {/* Delete */}
                <button onClick={() => dispatch({ type: "REMOVE_BIAS_RULE", payload: { bias, id: rule.id } })}
                  className="opacity-0 group-hover:opacity-100 shrink-0 text-[#333] hover:text-[#EF4444] transition-all duration-150" title="Delete rule">
                  <Trash2 size={12} />
                </button>
              </div>

              {/* Sub-note */}
              {rule.note && (
                <p className="ml-14 mt-0.5 font-sans text-xs" style={{ color: rule.checked ? biasColor : "#666" }}>
                  {rule.note}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add rule */}
      <div className="mt-4 pt-3 border-t" style={{ borderColor: "#222" }}>
        {adding ? (
          <div className="flex gap-1.5 anim-fade-up">
            <input autoFocus value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") { setAdding(false); setInput(""); } }}
              placeholder="Rule label..."
              className="flex-1 text-white font-sans text-sm px-2.5 py-2 rounded-lg focus:outline-none placeholder-[#555]"
              style={{ background: "#161616", border: `1px solid ${ACCENT}44` }} />
            <button onClick={handleAdd} className="px-3 py-2 rounded-lg font-sans text-sm font-bold text-black" style={{ background: ACCENT }}>+</button>
            <button onClick={() => { setAdding(false); setInput(""); }} className="px-3 py-2 text-[#555] rounded-lg text-sm" style={{ border: "1px solid #2A2A2A" }}>✕</button>
          </div>
        ) : (
          <button onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 text-sm font-sans transition-colors duration-200"
            style={{ color: "#666" }}
            onMouseEnter={e => (e.currentTarget.style.color = ACCENT)}
            onMouseLeave={e => (e.currentTarget.style.color = "#666")}>
            <Plus size={13} /> Add Rule
          </button>
        )}
      </div>
    </div>
  );
}
