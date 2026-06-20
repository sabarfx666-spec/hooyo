import { Trade } from "@/store/types";

interface StatsBarProps {
  trades: Trade[];
}

export function StatsBar({ trades }: StatsBarProps) {
  const taken = trades.filter((t) => t.decision === "TAKE");
  const wins = taken.filter((t) => t.outcome === "WIN").length;
  const losses = taken.filter((t) => t.outcome === "LOSS").length;
  const be = taken.filter((t) => t.outcome === "BE").length;
  const totalPnl = trades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
  const winRate = taken.length > 0 ? Math.round((wins / taken.length) * 100) : 0;

  const stats = [
    { label: "Total", value: String(trades.length) },
    { label: "Wins", value: `${wins} (${winRate}%)`, color: "text-[#00FF7F]" },
    { label: "Losses", value: String(losses), color: "text-[#FF3B3B]" },
    { label: "BE", value: String(be), color: "text-[#6AECE1]" },
    { label: "Total PnL", value: `${totalPnl >= 0 ? "+" : ""}$${totalPnl.toFixed(2)}`, color: totalPnl >= 0 ? "text-[#00FF7F]" : "text-[#FF3B3B]" },
  ];

  return (
    <div className="flex flex-wrap gap-4 p-4 bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg">
      {stats.map(({ label, value, color }) => (
        <div key={label} className="flex items-center gap-2">
          <span className="font-mono text-xs text-[#A0A0A0]">{label}:</span>
          <span className={`font-mono text-sm font-bold tabular-nums ${color ?? "text-white"}`}>{value}</span>
        </div>
      ))}
    </div>
  );
}
