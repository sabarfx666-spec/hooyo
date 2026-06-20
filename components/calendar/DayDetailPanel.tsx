import { Trade } from "@/store/types";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";

interface DayDetailPanelProps {
  date: string;
  trades: Trade[];
}

export function DayDetailPanel({ date, trades }: DayDetailPanelProps) {
  return (
    <div className="bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg p-5">
      <h3 className="font-mono text-xs text-[#A0A0A0] uppercase tracking-widest mb-3">{formatDate(date)}</h3>
      {trades.length === 0 ? (
        <p className="font-mono text-sm text-[#A0A0A0] text-center py-8">No trades this day</p>
      ) : (
        <div className="space-y-3">
          {trades.map((trade) => (
            <div key={trade.id} className="border border-[#2A2A2A] rounded p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold text-[#FF0000]">{trade.pair}</span>
                <div className="flex gap-1.5">
                  <Badge variant={trade.decision === "SKIP" ? "skip" : "take"}>{trade.decision}</Badge>
                  {trade.outcome && (
                    <Badge variant={trade.outcome === "WIN" ? "win" : trade.outcome === "LOSS" ? "loss" : "be"}>
                      {trade.outcome}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-3 font-mono text-xs text-[#A0A0A0]">
                <span>{trade.session === "LONDON" ? "London" : "New York"}</span>
                <span className={trade.bias === "BULLISH" ? "text-[#6AECE1]" : "text-[#FF3B3B]"}>
                  {trade.bias}
                </span>
                {trade.rr > 0 && <span>1:{trade.rr} R:R</span>}
                {trade.pnl !== undefined && (
                  <span className={trade.pnl >= 0 ? "text-[#00FF7F]" : "text-[#FF3B3B]"}>
                    {trade.pnl >= 0 ? "+" : ""}${trade.pnl}
                  </span>
                )}
              </div>
              <div className="font-mono text-xs text-[#6AECE1]">
                Rules: {trade.checkedCount}/{trade.totalRules} ({trade.totalRules > 0 ? Math.round((trade.checkedCount / trade.totalRules) * 100) : 0}%)
              </div>
              {trade.notes && (
                <p className="font-mono text-xs text-[#A0A0A0] italic">{trade.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
