"use client";
import { Trade } from "@/store/types";

interface DayCellProps {
  day: number | null;
  date: string;
  trades: Trade[];
  isToday: boolean;
  isSelected: boolean;
  isCurrentMonth: boolean;
  onClick: () => void;
}

export function DayCell({ day, date, trades, isToday, isSelected, isCurrentMonth, onClick }: DayCellProps) {
  if (!day) {
    return <div className="min-h-[90px] rounded-lg" style={{ background: "#0A0A0A", border: "1px solid #111" }} />;
  }

  const taken = trades.filter((t) => t.decision === "TAKE");
  const pnl = taken.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
  const hasTrades = trades.length > 0;
  const isPositive = pnl > 0;
  const isNegative = pnl < 0;

  const bg = !hasTrades
    ? "#0D0D0D"
    : isPositive
    ? "rgba(0,255,127,0.07)"
    : isNegative
    ? "rgba(255,59,59,0.07)"
    : "rgba(106,236,225,0.05)";

  const border = isSelected
    ? "#6AECE1"
    : isToday
    ? "rgba(106,236,225,0.4)"
    : hasTrades
    ? isPositive
      ? "rgba(0,255,127,0.25)"
      : isNegative
      ? "rgba(255,59,59,0.25)"
      : "rgba(106,236,225,0.2)"
    : "#1A1A1A";

  const pnlColor = isPositive ? "#00FF7F" : isNegative ? "#FF3B3B" : "#6AECE1";

  return (
    <button
      onClick={onClick}
      className="min-h-[90px] rounded-lg p-2.5 flex flex-col justify-between w-full text-left transition-all duration-150 hover:brightness-125"
      style={{ background: bg, border: `1px solid ${border}` }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between">
        <span className="font-sans text-[11px] font-medium" style={{ color: hasTrades ? "#888" : "#333" }}>
          {hasTrades ? `${trades.length} trade${trades.length > 1 ? "s" : ""}` : ""}
        </span>
        <span
          className="font-mono text-sm font-bold"
          style={{ color: isSelected ? "#6AECE1" : isToday ? "#6AECE1" : isCurrentMonth ? "#888" : "#333" }}
        >
          {day}
        </span>
      </div>

      {/* PnL */}
      {hasTrades && taken.length > 0 && (
        <div className="mt-1">
          <span className="font-mono font-bold text-sm" style={{ color: pnlColor }}>
            {isPositive ? "+" : ""}${Math.abs(pnl).toFixed(2)}
          </span>
        </div>
      )}

      {/* Skip-only indicator */}
      {hasTrades && taken.length === 0 && (
        <span className="font-mono text-[10px] text-[#444]">SKIP</span>
      )}
    </button>
  );
}
