"use client";
import { useSabar } from "@/store/SabarContext";

function getGrade(pct: number) {
  if (pct >= 90) return { letter: "A", color: "#00FF7F" };
  if (pct >= 75) return { letter: "B", color: "#6AECE1" };
  if (pct >= 60) return { letter: "C", color: "#F59E0B" };
  if (pct >= 40) return { letter: "D", color: "#FF8C00" };
  return { letter: "F", color: "#FF3B3B" };
}

export function ChecklistProgress() {
  const { state } = useSabar();
  const checked = state.rules.filter((r) => r.checked).length;
  const total   = state.rules.length;
  const pct     = total > 0 ? Math.round((checked / total) * 100) : 0;
  const grade   = getGrade(pct);

  return (
    <div
      className="relative flex items-center justify-between overflow-hidden"
      style={{
        background: "#0A0A0A",
        border: "1px solid #1A1A1A",
        borderRadius: "12px",
        padding: "14px 20px 0px 20px",
        minHeight: "64px",
      }}
    >
      {/* Left: rule count */}
      <span className="font-mono text-xs pb-4" style={{ color: "#2A2A2A" }}>
        {checked}/{total} rules
      </span>

      {/* Right: percentage + grade */}
      <div className="flex items-center gap-3 pb-4">
        <div className="text-right">
          <p className="font-mono font-bold text-xl leading-none" style={{ color: grade.color }}>{pct}%</p>
          <p className="font-sans text-[10px] mt-0.5" style={{ color: "#444" }}>Completion</p>
        </div>
        {/* Grade badge */}
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center font-mono font-black text-lg"
          style={{
            background: `${grade.color}18`,
            border: `1px solid ${grade.color}55`,
            color: grade.color,
            boxShadow: `0 0 12px 2px ${grade.color}33`,
          }}
        >
          {grade.letter}
        </div>
      </div>

      {/* Bottom progress bar — flush to edges */}
      <div className="absolute bottom-0 left-0 right-0 h-1.5" style={{ background: "#1A1A1A" }}>
        <div
          className="h-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: grade.color,
            boxShadow: `0 0 8px 1px ${grade.color}66`,
          }}
        />
      </div>
    </div>
  );
}
