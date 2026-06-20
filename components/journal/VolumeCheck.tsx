"use client";
import { useState, useEffect } from "react";
import { BarChart2, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";

const VOLUME_KEY = "sabar-volume-check";

type VolumeStatus = "GREEN" | "RED" | null;

interface VolumeEntry {
  date: string;
  status: VolumeStatus;
}

export function VolumeCheck() {
  const today = new Date().toISOString().split("T")[0];
  const [status, setStatus] = useState<VolumeStatus>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(VOLUME_KEY);
      if (raw) {
        const entry: VolumeEntry = JSON.parse(raw);
        // Only load if it's today's entry
        if (entry.date === today) setStatus(entry.status);
      }
    } catch {}
  }, [today]);

  function pick(s: VolumeStatus) {
    setStatus(s);
    localStorage.setItem(VOLUME_KEY, JSON.stringify({ date: today, status: s }));
  }

  const isRed = status === "RED";
  const isGreen = status === "GREEN";

  return (
    <div className="rounded-xl overflow-hidden" style={{
      border: `1px solid ${isRed ? "rgba(255,59,59,0.5)" : isGreen ? "rgba(0,255,127,0.4)" : "rgba(106,236,225,0.2)"}`,
      background: isRed ? "rgba(255,59,59,0.04)" : isGreen ? "rgba(0,255,127,0.04)" : "#0D0D0D",
    }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: `1px solid ${isRed ? "rgba(255,59,59,0.2)" : isGreen ? "rgba(0,255,127,0.15)" : "#1E1E1E"}` }}>
        <BarChart2 size={13} style={{ color: isRed ? "#FF3B3B" : isGreen ? "#00FF7F" : "#6AECE1" }} />
        <p className="font-mono text-[10px] font-bold uppercase tracking-widest"
          style={{ color: isRed ? "#FF3B3B" : isGreen ? "#00FF7F" : "#6AECE1" }}>
          Market Volume
        </p>
        {status && (
          <span className="ml-auto font-mono text-[9px] font-bold px-2 py-0.5 rounded-full"
            style={{
              background: isRed ? "rgba(255,59,59,0.15)" : "rgba(0,255,127,0.15)",
              color: isRed ? "#FF3B3B" : "#00FF7F",
              border: `1px solid ${isRed ? "rgba(255,59,59,0.3)" : "rgba(0,255,127,0.3)"}`,
            }}>
            {isRed ? "NO TRADE" : "TRADE OK"}
          </span>
        )}
      </div>

      {/* Buttons */}
      <div className="flex gap-2 p-3">
        <button
          onClick={() => pick("GREEN")}
          className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl font-mono transition-all"
          style={{
            background: isGreen ? "rgba(0,255,127,0.12)" : "#111",
            border: `1px solid ${isGreen ? "rgba(0,255,127,0.35)" : "#2A2A2A"}`,
            boxShadow: isGreen ? "0 0 14px 2px rgba(0,255,127,0.15)" : "none",
          }}
        >
          <TrendingUp size={18} style={{ color: isGreen ? "#00FF7F" : "#555" }} strokeWidth={2.5} />
          <span className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: isGreen ? "#00FF7F" : "#888" }}>
            Green
          </span>
          <span className="text-[9px] font-sans" style={{ color: isGreen ? "#00994D" : "#555" }}>
            Volume bullish
          </span>
        </button>

        <button
          onClick={() => pick("RED")}
          className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl font-mono transition-all"
          style={{
            background: isRed ? "rgba(255,59,59,0.12)" : "#111",
            border: `1px solid ${isRed ? "rgba(255,59,59,0.35)" : "#2A2A2A"}`,
            boxShadow: isRed ? "0 0 14px 2px rgba(255,59,59,0.15)" : "none",
          }}
        >
          <TrendingDown size={18} style={{ color: isRed ? "#FF3B3B" : "#555" }} strokeWidth={2.5} />
          <span className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: isRed ? "#FF3B3B" : "#888" }}>
            Red
          </span>
          <span className="text-[9px] font-sans" style={{ color: isRed ? "#CC2200" : "#555" }}>
            No trade today
          </span>
        </button>
      </div>

      {/* NO TRADE banner */}
      {isRed && (
        <div className="mx-3 mb-3 flex items-center gap-2 px-4 py-3 rounded-xl"
          style={{ background: "rgba(255,59,59,0.1)", border: "1px solid rgba(255,59,59,0.3)" }}>
          <AlertTriangle size={14} style={{ color: "#FF3B3B" }} />
          <div>
            <p className="font-mono text-xs font-bold" style={{ color: "#FF3B3B" }}>⛔ NO TRADE TODAY</p>
            <p className="font-sans text-[10px] text-[#555] mt-0.5">Volume is red — stay out of the market</p>
          </div>
        </div>
      )}

      {/* TRADE OK banner */}
      {isGreen && (
        <div className="mx-3 mb-3 flex items-center gap-2 px-4 py-3 rounded-xl"
          style={{ background: "rgba(0,255,127,0.08)", border: "1px solid rgba(0,255,127,0.2)" }}>
          <TrendingUp size={14} style={{ color: "#00FF7F" }} />
          <div>
            <p className="font-mono text-xs font-bold" style={{ color: "#00FF7F" }}>✅ VOLUME OK — GO TRADE</p>
            <p className="font-sans text-[10px] text-[#555] mt-0.5">Volume is green — conditions are good</p>
          </div>
        </div>
      )}
    </div>
  );
}
