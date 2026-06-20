"use client";

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: string;
  className?: string;
  showLabel?: boolean;
}

export function ProgressBar({ value, max = 100, color = "#6AECE1", className = "", showLabel = true }: ProgressBarProps) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-3 bg-[#1A1A1A] rounded-full overflow-hidden border border-[#2A2A2A]">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${pct}%`, backgroundColor: color }}
          />
        </div>
        {showLabel && (
          <span className="font-mono text-sm text-white min-w-[2.5rem] text-right">{pct}%</span>
        )}
      </div>
    </div>
  );
}
