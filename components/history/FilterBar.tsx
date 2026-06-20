"use client";

interface FilterBarProps {
  pair: string;
  session: string;
  bias: string;
  outcome: string;
  search: string;
  onChange: (key: string, val: string) => void;
}

const selectCls = "bg-[#1A1A1A] border border-[#2A2A2A] text-white font-mono text-xs px-3 py-2 rounded focus:outline-none focus:border-[#6AECE1]";

export function FilterBar({ pair, session, bias, outcome, search, onChange }: FilterBarProps) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <select className={selectCls} value={pair} onChange={(e) => onChange("pair", e.target.value)}>
        <option value="">All Pairs</option>
        {["EUR/USD", "GBP/USD", "GBP/JPY"].map((p) => <option key={p}>{p}</option>)}
      </select>
      <select className={selectCls} value={session} onChange={(e) => onChange("session", e.target.value)}>
        <option value="">All Sessions</option>
        <option value="LONDON">London</option>
        <option value="NEW_YORK">New York</option>
      </select>
      <select className={selectCls} value={bias} onChange={(e) => onChange("bias", e.target.value)}>
        <option value="">All Bias</option>
        <option value="BULLISH">Bullish</option>
        <option value="BEARISH">Bearish</option>
      </select>
      <select className={selectCls} value={outcome} onChange={(e) => onChange("outcome", e.target.value)}>
        <option value="">All Outcomes</option>
        <option value="WIN">Win</option>
        <option value="LOSS">Loss</option>
        <option value="BE">BE</option>
        <option value="SKIP">Skip</option>
      </select>
      <input
        value={search}
        onChange={(e) => onChange("search", e.target.value)}
        placeholder="Search notes..."
        className="bg-[#1A1A1A] border border-[#2A2A2A] text-white font-mono text-xs px-3 py-2 rounded focus:outline-none focus:border-[#6AECE1] placeholder-[#A0A0A0] min-w-[150px]"
      />
    </div>
  );
}
