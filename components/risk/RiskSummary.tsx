interface RiskSummaryProps {
  riskAmount: number;
  slPips: number;
  lotSize: number;
  rr: number;
  maxGain: number;
}

export function RiskSummary({ riskAmount, slPips, lotSize, rr, maxGain }: RiskSummaryProps) {
  const rows = [
    { label: "Risk Amount", value: `$${riskAmount.toFixed(2)}` },
    { label: "Stop Loss Pips", value: slPips > 0 ? `${slPips} pips` : "—" },
    { label: "Lot Size", value: lotSize > 0 ? lotSize.toFixed(2) : "—" },
    { label: "Risk : Reward", value: rr > 0 ? `1 : ${rr}` : "—" },
    { label: "Max Loss", value: `$${riskAmount.toFixed(2)}` },
    { label: "Max Gain", value: maxGain > 0 ? `$${maxGain.toFixed(2)}` : "—" },
  ];

  return (
    <div className="bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg p-5">
      <h3 className="font-mono text-xs text-[#6AECE1] uppercase tracking-widest mb-4">Risk Summary</h3>
      <div className="space-y-2">
        {rows.map(({ label, value }) => (
          <div key={label} className="flex justify-between items-center py-1.5 border-b border-[#1A1A1A] last:border-0">
            <span className="font-mono text-sm text-[#A0A0A0]">{label}</span>
            <span className="font-mono text-sm font-bold text-white tabular-nums">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
