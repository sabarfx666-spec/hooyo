"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSabar } from "@/store/SabarContext";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { sendTradeToDiscord } from "@/lib/discord";
import { getGrade } from "@/lib/utils";
import { SESSION_LABELS } from "@/store/types";
import { PSYCH_NOTE_KEY } from "@/components/journal/PsychologySelector";
import {
  Send, CheckCircle, XCircle, Settings, Lock, Clock,
  Award, Zap, TrendingUp, TrendingDown, MapPin, CandlestickChart,
  ListChecks, CheckCircle2,
} from "lucide-react";

const WEBHOOK_KEY = "sabar-discord-webhook";
const DAILY_LIMIT = 2;

const GREEN = "#22C55E";
const RED   = "#EF4444";

function useCountdownToMidnight() {
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    function calc() {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      const diff = midnight.getTime() - now.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`);
    }
    calc();
    const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, []);
  return timeLeft;
}

function StatTile({ icon, label, value, valueColor, tint }: {
  icon: React.ReactNode; label: string; value: string;
  valueColor?: string; tint?: string;
}) {
  return (
    <div className="rounded-xl px-4 py-3.5"
      style={{
        background: tint ? `${tint}0D` : "rgba(255,255,255,0.02)",
        border: `1px solid ${tint ? tint + "40" : "#262626"}`,
      }}>
      <div className="flex items-center gap-2 mb-1" style={{ color: tint ?? "#8A8A8A" }}>
        {icon}
        <span className="font-sans text-xs" style={{ color: "#8A8A8A" }}>{label}</span>
      </div>
      <p className="font-sans text-lg font-bold" style={{ color: valueColor ?? "#fff" }}>{value}</p>
    </div>
  );
}

export function TradeSummary() {
  const { state, dispatch } = useSabar();
  const router = useRouter();
  const [showSettings,      setShowSettings]      = useState(false);
  const [webhookUrl,        setWebhookUrl]        = useState("");
  const [webhookInput,      setWebhookInput]      = useState("");
  const [sendStatus,        setSendStatus]        = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [manualUnlock,      setManualUnlock]      = useState(false);
  const [showUnlockConfirm, setShowUnlockConfirm] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(WEBHOOK_KEY) ?? "";
    setWebhookUrl(saved);
    setWebhookInput(saved);
  }, []);

  const countdown        = useCountdownToMidnight();
  const today            = new Date().toISOString().split("T")[0];
  const todayTakes       = state.trades.filter(t => t.decision === "TAKE" && t.date === today);
  const isLocked         = todayTakes.length >= DAILY_LIMIT && !manualUnlock;

  const biasSet          = state.biasRules?.[state.currentBias] ?? [];
  const checkedCount     = biasSet.filter(r => r.checked).length;
  const totalRules       = biasSet.length;
  const missing          = totalRules - checkedCount;
  const pct              = totalRules > 0 ? Math.round((checkedCount / totalRules) * 100) : 0;
  const grade            = getGrade(pct);

  const isBull           = state.currentBias === "BULLISH";
  const biasColor        = isBull ? GREEN : RED;
  const totalPnl         = state.trades.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const currentBalance   = state.accountBalance + totalPnl;

  const handleAction = async (type: "TAKE" | "SKIP") => {
    // Read pre-trade proof snapshots from dashboard's ChartSnapshots section
    const SLOT_TO_TF: Record<string, string> = {
      weekly: "Weekly", daily: "Daily", "4h": "4H", entry: "15M", after: "Result",
    };
    let chartProofs: Record<string, string> | undefined;
    let psychNote: string | undefined;
    try {
      const raw = localStorage.getItem("sabar-proof-images");
      if (raw) {
        const imgs: Record<string, string | null> = JSON.parse(raw);
        const mapped: Record<string, string> = {};
        Object.entries(imgs).forEach(([id, url]) => {
          if (url) mapped[SLOT_TO_TF[id] ?? id] = url;
        });
        if (Object.keys(mapped).length > 0) chartProofs = mapped;
        // clear pending proofs after taking trade
        localStorage.removeItem("sabar-proof-images");
      }
      const note = localStorage.getItem(PSYCH_NOTE_KEY);
      if (note && note.trim()) { psychNote = note.trim(); localStorage.removeItem(PSYCH_NOTE_KEY); }
    } catch {}

    dispatch({
      type: type === "TAKE" ? "TAKE_TRADE" : "SKIP_TRADE",
      payload: {
        rr: 0,
        ...(chartProofs ? { chartProofs } : {}),
        ...(psychNote ? { notes: psychNote } : {}),
      },
    });

    if (webhookUrl && type === "TAKE") {
      setSendStatus("sending");
      try {
        await sendTradeToDiscord(webhookUrl, {
          pair: state.currentPair, bias: state.currentBias, session: state.currentSession,
          decision: type, outcome: undefined,
          pnl: undefined, rr: 0, checkedCount, totalRules,
          notes: psychNote, accountBalance: currentBalance,
          riskAmount: (currentBalance * state.riskPercent) / 100,
        });
        setSendStatus("ok");
      } catch { setSendStatus("error"); }
      setTimeout(() => setSendStatus("idle"), 3000);
    }

    router.push("/history");
  };

  const saveWebhook = () => {
    localStorage.setItem(WEBHOOK_KEY, webhookInput);
    setWebhookUrl(webhookInput);
    setShowSettings(false);
  };

  return (
    <>
      {/* ── Trade Summary card ── */}
      <div
        className="rounded-2xl p-6 space-y-5"
        style={{
          background: "rgba(20,20,20,0.6)",
          border: `1px solid ${isLocked ? "rgba(239,68,68,0.5)" : "rgba(239,68,68,0.35)"}`,
          boxShadow: "0 0 24px 2px rgba(239,68,68,0.08)",
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <Award size={19} strokeWidth={2} style={{ color: RED }} />
            <h3 className="font-sans font-bold text-white text-lg">Trade Summary</h3>
            {isLocked && (
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)" }}>
                <Lock size={10} style={{ color: RED }} />
                <span className="font-sans text-[10px] font-bold" style={{ color: RED }}>LOCKED</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="font-sans font-bold text-2xl leading-none" style={{ color: grade.color }}>{pct}%</p>
              <p className="font-sans text-[11px] mt-0.5" style={{ color: "#8A8A8A" }}>Completion</p>
            </div>
            <span className="font-sans font-black text-4xl leading-none"
              style={{ color: grade.color, textShadow: `0 0 18px ${grade.color}66` }}>
              {grade.letter}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "#1E1E1E" }}>
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: grade.color, boxShadow: `0 0 10px 1px ${grade.color}66` }} />
        </div>

        {/* Discord button */}
        <button
          onClick={() => setShowSettings(true)}
          className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all duration-200 hover:opacity-90"
          style={{
            background: webhookUrl ? "rgba(88,101,242,0.18)" : "rgba(88,101,242,0.06)",
            border: `1px solid ${webhookUrl ? "#5865F266" : "rgba(88,101,242,0.2)"}`,
          }}
        >
          <div className="flex items-center gap-2">
            <Send size={13} style={{ color: "#5865F2" }} />
            <span className="font-sans text-xs font-bold" style={{ color: "#5865F2" }}>
              {webhookUrl ? "Discord Connected" : "Connect Discord"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {sendStatus === "sending" && <span className="font-sans text-[10px] text-[#5865F2] animate-pulse">Sending…</span>}
            {sendStatus === "ok"      && <CheckCircle size={13} style={{ color: GREEN }} />}
            {sendStatus === "error"   && <XCircle size={13} style={{ color: RED }} />}
            <div className="w-2 h-2 rounded-full" style={{ background: webhookUrl ? "#5865F2" : "#222",
              boxShadow: webhookUrl ? "0 0 6px 2px rgba(88,101,242,0.6)" : "none" }} />
            <Settings size={12} style={{ color: "#5865F2" }} />
          </div>
        </button>

        {/* Stat tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <StatTile
            icon={isBull ? <TrendingUp size={15} style={{ color: GREEN }} /> : <TrendingDown size={15} style={{ color: RED }} />}
            label="Direction"
            value={isBull ? "Bullish" : "Bearish"}
            valueColor={biasColor}
          />
          <StatTile
            icon={<MapPin size={15} style={{ color: "#F59E0B" }} />}
            label="Session"
            value={SESSION_LABELS[state.currentSession]}
          />
          <StatTile
            icon={<CandlestickChart size={15} style={{ color: RED }} />}
            label="Pair"
            value={state.currentPair}
            valueColor={RED}
          />
          <StatTile
            icon={<ListChecks size={15} style={{ color: "#8A8A8A" }} />}
            label="Total Rules"
            value={String(totalRules)}
          />
          <StatTile
            icon={<CheckCircle2 size={15} style={{ color: GREEN }} />}
            label="Checked"
            value={String(checkedCount)}
            valueColor="#fff"
            tint={GREEN}
          />
          <StatTile
            icon={<XCircle size={15} style={{ color: RED }} />}
            label="Missing"
            value={String(missing)}
            valueColor="#fff"
            tint={RED}
          />
        </div>

        {state.currentPsychology.length > 0 && (
          <p className="font-sans text-xs" style={{ color: "#8A8A8A" }}>
            Psychology: <span style={{ color: "#D0D0D0" }}>{state.currentPsychology.join(", ")}</span>
          </p>
        )}
      </div>

      {/* ── Trade Decision card ── */}
      <div className="rounded-2xl p-6 mt-5" style={{ background: "rgba(20,20,20,0.6)", border: "1px solid #262626" }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <Zap size={19} strokeWidth={2} style={{ color: RED }} />
            <h3 className="font-sans font-bold text-white text-lg">Trade Decision</h3>
          </div>
          <span className="font-sans text-xs" style={{ color: "#8A8A8A" }}>
            Trades Today{" "}
            <span className="font-bold" style={{ color: todayTakes.length >= DAILY_LIMIT ? RED : todayTakes.length === DAILY_LIMIT - 1 ? "#F59E0B" : GREEN }}>
              {todayTakes.length} / {DAILY_LIMIT}
            </span>
          </span>
        </div>

        {isLocked ? (
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(239,68,68,0.35)" }}>
            <div className="flex flex-col items-center py-4 gap-1.5" style={{ background: "rgba(239,68,68,0.08)" }}>
              <Lock size={24} style={{ color: RED }} />
              <p className="font-sans text-sm font-bold text-white tracking-wide uppercase">Daily Limit Reached</p>
              <p className="font-sans text-xs text-[#8A8A8A]">{DAILY_LIMIT} trades taken today</p>
            </div>
            <div className="flex flex-col items-center py-3 gap-1" style={{ background: "rgba(239,68,68,0.04)" }}>
              <p className="font-sans text-[11px] uppercase tracking-widest text-[#666]">Unlocks in</p>
              <div className="flex items-center gap-2">
                <Clock size={13} style={{ color: RED }} />
                <span className="font-mono text-xl font-bold tracking-widest" style={{ color: RED }}>{countdown}</span>
              </div>
            </div>
            <div className="p-3 space-y-2">
              <button onClick={() => handleAction("SKIP")}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-sans font-bold text-base tracking-wide uppercase border transition-all duration-200 hover:bg-[#EF444414]"
                style={{ background: "transparent", border: `1.5px solid ${RED}`, color: RED }}>
                <XCircle size={18} /> Skip Trade
              </button>
              <button onClick={() => setShowUnlockConfirm(true)}
                className="w-full py-2 rounded-xl font-sans text-xs font-bold tracking-widest hover:opacity-80 transition-opacity"
                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: RED }}>
                🔓 OVERRIDE UNLOCK
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => handleAction("TAKE")}
              className="flex items-center justify-center gap-2 py-4 rounded-xl font-sans font-bold text-base tracking-wide uppercase transition-all duration-200 hover:opacity-90"
              style={{ background: biasColor, color: "#fff", boxShadow: `0 0 20px 3px ${biasColor}55` }}
            >
              <CheckCircle2 size={19} /> Take Trade
            </button>
            <button
              onClick={() => handleAction("SKIP")}
              className="flex items-center justify-center gap-2 py-4 rounded-xl font-sans font-bold text-base tracking-wide uppercase border transition-all duration-200 hover:bg-[#EF444414]"
              style={{ background: "transparent", border: `1.5px solid ${RED}`, color: RED }}
            >
              <XCircle size={19} /> Skip Trade
            </button>
          </div>
        )}
      </div>

      {/* Unlock confirmation modal */}
      <Modal open={showUnlockConfirm} onClose={() => setShowUnlockConfirm(false)} title="Override Daily Limit">
        <div className="space-y-4">
          <div className="rounded-lg px-4 py-4 text-center" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
            <p className="text-3xl mb-2">⚠️</p>
            <p className="font-sans text-sm font-bold text-white mb-1">Are you sure?</p>
            <p className="font-sans text-xs text-[#A0A0A0]">You already took {todayTakes.length} trades today. Overriding your daily limit can hurt your discipline.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setShowUnlockConfirm(false)}>Stay Locked</Button>
            <Button variant="skip" className="flex-1" onClick={() => { setManualUnlock(true); setShowUnlockConfirm(false); }}>Unlock Anyway</Button>
          </div>
        </div>
      </Modal>

      {/* Discord settings modal */}
      <Modal open={showSettings} onClose={() => setShowSettings(false)} title="Discord Webhook">
        <div className="space-y-4">
          <div>
            <label className="font-sans text-xs text-[#A0A0A0] uppercase tracking-widest block mb-2">Webhook URL</label>
            <input type="text" value={webhookInput} onChange={e => setWebhookInput(e.target.value)}
              placeholder="https://discord.com/api/webhooks/..."
              className="w-full bg-[#1A1A1A] border border-[#2A2A2A] text-white font-mono text-xs px-3 py-2.5 rounded-lg focus:outline-none focus:border-[#5865F2] placeholder-[#444]" />
            <p className="font-sans text-[10px] text-[#666] mt-1.5">Discord → Edit Channel → Integrations → Webhooks → New Webhook → Copy URL</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => { setWebhookInput(""); localStorage.removeItem(WEBHOOK_KEY); setWebhookUrl(""); setShowSettings(false); }}>Clear</Button>
            <Button variant="primary" className="flex-1" style={{ background: "#5865F2", color: "#fff" }} onClick={saveWebhook}>Save Webhook</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
