import { Trade } from "@/store/types";
import { TradeRow } from "./TradeRow";

interface TradeTableProps {
  trades: Trade[];
}

const headers = ["Date", "Pair", "Session", "Bias", "Decision", "Outcome", "R:R", "PnL", "Rules%", "Psychology", "Chart", ""];

export function TradeTable({ trades }: TradeTableProps) {
  if (trades.length === 0) {
    return (
      <div className="text-center py-16 font-mono text-[#A0A0A0]">
        <p className="text-2xl mb-2">—</p>
        <p className="text-sm">No trades match your filters</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[#2A2A2A]">
            {headers.map((h) => (
              <th key={h} className="px-3 py-2 text-left font-mono text-xs text-[#A0A0A0] uppercase tracking-wider whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1A1A1A]">
          {trades.map((trade) => <TradeRow key={trade.id} trade={trade} />)}
        </tbody>
      </table>
    </div>
  );
}
