export interface TradePayload {
  pair: string;
  bias: string;
  session: string;
  decision: string;
  outcome?: string;
  pnl?: number;
  rr?: number;
  checkedCount: number;
  totalRules: number;
  notes?: string;
  accountBalance?: number;
  riskAmount?: number;
}

const OUTCOME_COLOR: Record<string, number> = {
  WIN:  0x00FF7F,
  LOSS: 0xFF3B3B,
  BE:   0x6AECE1,
};

export async function sendTradeToDiscord(webhookUrl: string, trade: TradePayload) {
  const pct = trade.totalRules > 0 ? Math.round((trade.checkedCount / trade.totalRules) * 100) : 0;
  const color = trade.outcome ? (OUTCOME_COLOR[trade.outcome] ?? 0x6AECE1) : 0xF59E0B;
  const dirArrow = trade.bias === "BULLISH" ? "↑" : "↓";
  const sessionLabel = trade.session === "LONDON" ? "London" : "New York";
  const pnlStr = trade.pnl !== undefined
    ? `${trade.pnl >= 0 ? "+" : ""}$${Math.abs(trade.pnl).toFixed(2)}`
    : "—";

  const embed = {
    title: `${trade.decision === "SKIP" ? "⏭️ Trade Skipped" : trade.outcome === "WIN" ? "✅ Trade WIN" : trade.outcome === "LOSS" ? "❌ Trade LOSS" : "📊 Trade Taken"} — ${trade.pair}`,
    color,
    fields: [
      { name: "Direction",  value: `${dirArrow} ${trade.bias}`,     inline: true  },
      { name: "Session",    value: sessionLabel,                      inline: true  },
      { name: "Outcome",    value: trade.outcome ?? "—",              inline: true  },
      { name: "P&L",        value: pnlStr,                            inline: true  },
      { name: "R:R",        value: trade.rr ? `1:${trade.rr}` : "—", inline: true  },
      { name: "Rules",      value: `${trade.checkedCount}/${trade.totalRules} (${pct}%)`, inline: true },
      ...(trade.accountBalance !== undefined ? [{ name: "Account Balance", value: `$${trade.accountBalance.toFixed(0)}`, inline: true }] : []),
      ...(trade.riskAmount !== undefined ? [{ name: "Risk $", value: `$${trade.riskAmount.toFixed(0)}`, inline: true }] : []),
      ...(trade.notes ? [{ name: "Notes", value: trade.notes, inline: false }] : []),
    ],
    footer: { text: "Sabar System — Trading Journal" },
    timestamp: new Date().toISOString(),
  };

  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ embeds: [embed] }),
  });
}
