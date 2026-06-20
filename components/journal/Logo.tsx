"use client";

export function Logo() {
  return (
    <div className="flex items-center gap-4">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
        style={{
          background: "rgba(180,30,30,0.25)",
          border: "1px solid rgba(255,59,59,0.4)",
          boxShadow: "0 0 28px rgba(255,59,59,0.3), inset 0 0 18px rgba(255,59,59,0.08)",
        }}
      >
        <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
          <circle cx="17" cy="17" r="10" stroke="#FF3B3B" strokeWidth="2" />
          <circle cx="17" cy="17" r="4" fill="#FF3B3B" />
          <line x1="17" y1="3" x2="17" y2="8" stroke="#FF3B3B" strokeWidth="2" strokeLinecap="round" />
          <line x1="17" y1="26" x2="17" y2="31" stroke="#FF3B3B" strokeWidth="2" strokeLinecap="round" />
          <line x1="3" y1="17" x2="8" y2="17" stroke="#FF3B3B" strokeWidth="2" strokeLinecap="round" />
          <line x1="26" y1="17" x2="31" y2="17" stroke="#FF3B3B" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <div>
        <div className="font-mono font-black text-4xl leading-none tracking-tight" style={{ color: "#FF3B3B" }}>
          SBO-plas
        </div>
        <div className="font-sans text-xs mt-1.5" style={{ color: "#555" }}>
          Confirm your trade setup before entry
        </div>
      </div>
    </div>
  );
}
