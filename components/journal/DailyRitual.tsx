"use client";
import { useState, useEffect } from "react";
import { Sun, Moon, Shield, CheckCircle2, X, AlertTriangle } from "lucide-react";

const RITUAL_KEY = "sabar-daily-ritual";
const SKIP_KEY   = "sabar-ritual-skip";

const GREEN = "#22C55E";
const RED   = "#EF4444";
const AMBER = "#F59E0B";

const QUESTIONS = [
  {
    icon: Sun,
    so: "Ma hubtaa inaad sameesay Pre-market analysis inta aanad maanta trade uso diyaar Garoowin?",
    en: "Did you check the market and complete your Pre-market Analysis?",
  },
  {
    icon: Moon,
    so: "Si wacan xalay ma u seexatay oo wax dag-dag ah kuguma furno soomahn?",
    en: "Did you sleep well and feel mentally clear?",
  },
  {
    icon: Shield,
    so: "Dhab ahaantii Diyaar ma utahay inaad maanta aqbashid khasaare iyo faa'io Labadaba?",
    en: "Are you truly ready to accept loss if you trade today?",
  },
];

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="relative w-12 h-7 rounded-full shrink-0 transition-colors duration-200"
      style={{
        background: on ? GREEN : "#2A2A2A",
        boxShadow: on ? `0 0 12px 2px ${GREEN}55` : "inset 0 1px 3px rgba(0,0,0,0.5)",
      }}>
      <span className="absolute top-1 w-5 h-5 rounded-full bg-white transition-all duration-200"
        style={{ left: on ? "26px" : "4px" }} />
    </button>
  );
}

export function DailyRitual() {
  const [open, setOpen]     = useState(false);
  const [checks, setChecks] = useState<boolean[]>([false, false, false]);
  const [toast, setToast]   = useState(false);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RITUAL_KEY);
      const saved = raw ? JSON.parse(raw) as { date: string; checks: boolean[]; completed: boolean } : null;
      const skippedToday = sessionStorage.getItem(SKIP_KEY) === today;
      if (saved?.date === today && saved.completed) return;   // already done today
      if (skippedToday) return;                               // skipped this session
      if (saved?.date === today && Array.isArray(saved.checks)) setChecks(saved.checks);
      setOpen(true);
      setToast(true);
      setTimeout(() => setToast(false), 4000);
    } catch {}
  }, [today]);

  const done  = checks.filter(Boolean).length;
  const pct   = Math.round((done / QUESTIONS.length) * 100);
  const color = pct === 100 ? GREEN : pct > 0 ? AMBER : RED;

  const toggle = (i: number) => {
    const next = checks.map((c, j) => (j === i ? !c : c));
    setChecks(next);
    try { localStorage.setItem(RITUAL_KEY, JSON.stringify({ date: today, checks: next, completed: false })); } catch {}
  };

  const complete = () => {
    try { localStorage.setItem(RITUAL_KEY, JSON.stringify({ date: today, checks, completed: true })); } catch {}
    setOpen(false);
  };

  const skip = () => {
    try { sessionStorage.setItem(SKIP_KEY, today); } catch {}
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)" }}>

      <div className="w-full max-w-lg rounded-2xl p-6 my-8 anim-pop"
        style={{ background: "#111", border: "1px solid #262626", boxShadow: "0 0 60px rgba(239,68,68,0.08)" }}>

        {/* Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3"
            style={{
              background: "rgba(239,68,68,0.08)",
              border: `1px solid ${RED}55`,
              boxShadow: `0 0 24px 4px ${RED}33`,
            }}>
            <Sun size={24} style={{ color: RED }} className="anim-spin-slow" />
          </div>
          <h2 className="font-sans font-bold text-white text-xl">Daily Rituals</h2>
          <p className="font-sans text-sm mt-0.5" style={{ color: "#8A8A8A" }}>Pre-market readiness check</p>
        </div>

        {/* Questions */}
        <div className="space-y-3">
          {QUESTIONS.map(({ icon: Icon, so, en }, i) => (
            <div key={i} className="flex items-start gap-3 rounded-xl px-4 py-3.5"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid #222" }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: "#1A1A1A", border: "1px solid #2A2A2A" }}>
                <Icon size={14} style={{ color: checks[i] ? GREEN : "#8A8A8A" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-sans font-bold text-white text-sm leading-snug">{so}</p>
                <p className="font-sans text-xs mt-1" style={{ color: "#777" }}>{en}</p>
              </div>
              <Toggle on={checks[i]} onClick={() => toggle(i)} />
            </div>
          ))}
        </div>

        {/* Readiness Score */}
        <div className="rounded-xl px-4 py-4 mt-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid #222" }}>
          <div className="flex items-center justify-between mb-2">
            <p className="font-sans font-bold text-white text-sm">Readiness Score</p>
            <p className="font-sans font-bold text-base" style={{ color }}>{pct}%</p>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden mb-3" style={{ background: "#1E1E1E" }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, background: color, boxShadow: `0 0 10px 1px ${color}66` }} />
          </div>
          {pct === 100 ? (
            <div className="flex items-center gap-2 rounded-lg px-3 py-2"
              style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)" }}>
              <CheckCircle2 size={13} style={{ color: GREEN }} />
              <p className="font-sans text-xs font-semibold" style={{ color: GREEN }}>You&apos;re ready — trade your plan.</p>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg px-3 py-2"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
              <AlertTriangle size={13} style={{ color: RED }} />
              <p className="font-sans text-xs font-semibold" style={{ color: RED }}>High risk: consider no-trade until you fix readiness.</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-5">
          <button onClick={complete}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-sans font-bold text-base text-white transition-all hover:opacity-90"
            style={{ background: RED, boxShadow: `0 0 20px 3px ${RED}44` }}>
            <CheckCircle2 size={18} /> Complete Ritual
          </button>
          <button onClick={skip}
            className="flex items-center justify-center gap-1.5 px-6 py-3.5 rounded-xl font-sans font-semibold text-sm transition-all hover:bg-[#1A1A1A]"
            style={{ border: "1px solid #2A2A2A", color: "#9A9A9A" }}>
            <X size={15} /> Skip
          </button>
        </div>
      </div>

      {/* Welcome toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 flex items-center gap-2.5 rounded-xl px-5 py-3.5 anim-slide-right"
          style={{ background: "#161616", border: "1px solid #2A2A2A", boxShadow: "0 8px 30px rgba(0,0,0,0.6)" }}>
          <CheckCircle2 size={16} style={{ color: GREEN }} />
          <span className="font-sans font-bold text-white text-sm">Welcome back!</span>
        </div>
      )}
    </div>
  );
}
