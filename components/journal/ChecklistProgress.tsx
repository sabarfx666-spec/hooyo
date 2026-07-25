"use client";
import { useSabar } from "@/store/SabarContext";

export function ChecklistProgress() {
  const { state } = useSabar();
  // Only main rules count — indented "either/or" sub-rules don't.
  const biasSet = (state.biasRules?.[state.currentBias] ?? []).filter((r) => !r.indent);
  const checked = biasSet.filter((r) => r.checked).length;
  const total   = biasSet.length;
  const pct     = total > 0 ? Math.round((checked / total) * 100) : 0;

  // This bar follows the trade direction: green = Bullish, red = Bearish.
  const color = state.currentBias === "BULLISH" ? "#22C55E" : "#EF4444";

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="font-sans text-sm font-medium" style={{ color: "#D0D0D0" }}>Checklist Progress</p>
        <p className="font-sans text-sm font-bold" style={{ color }}>{pct}%</p>
      </div>
      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "#1E1E1E" }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: color,
            boxShadow: `0 0 10px 1px ${color}66`,
          }}
        />
      </div>
    </div>
  );
}
