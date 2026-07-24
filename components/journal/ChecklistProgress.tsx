"use client";
import { useSabar } from "@/store/SabarContext";
import { getGrade } from "@/lib/utils";

export function ChecklistProgress() {
  const { state } = useSabar();
  const biasSet = state.biasRules?.[state.currentBias] ?? [];
  const checked = biasSet.filter((r) => r.checked).length;
  const total   = biasSet.length;
  const pct     = total > 0 ? Math.round((checked / total) * 100) : 0;
  const grade   = getGrade(pct);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="font-sans text-sm font-medium" style={{ color: "#D0D0D0" }}>Checklist Progress</p>
        <p className="font-sans text-sm font-bold" style={{ color: grade.color }}>{pct}%</p>
      </div>
      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "#1E1E1E" }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: grade.color,
            boxShadow: `0 0 10px 1px ${grade.color}66`,
          }}
        />
      </div>
    </div>
  );
}
