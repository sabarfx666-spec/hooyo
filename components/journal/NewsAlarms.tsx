"use client";
import { useState, useEffect, useRef } from "react";
import { Bell, BellRing, Plus, Trash2, AlertTriangle, Clock, X } from "lucide-react";

const ALARMS_KEY = "sabar-news-alarms";

type Impact = "HIGH" | "MEDIUM";
type ReminderMin = 5 | 15 | 30;

interface NewsAlarm {
  id: string;
  name: string;
  currency: string;
  time: string; // "HH:MM" 24h
  date: string; // "YYYY-MM-DD"
  impact: Impact;
  reminderMin: ReminderMin;
  fired: boolean;
}

function pad(n: number) { return String(n).padStart(2, "0"); }

function getCountdown(alarm: NewsAlarm): { label: string; urgent: boolean; past: boolean } {
  const now = new Date();
  const [h, m] = alarm.time.split(":").map(Number);
  const target = new Date(alarm.date);
  target.setHours(h, m, 0, 0);
  const diff = target.getTime() - now.getTime();
  if (diff < 0) return { label: "Past", urgent: false, past: true };
  const totalMin = Math.floor(diff / 60000);
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  const secs = Math.floor((diff % 60000) / 1000);
  const label = hours > 0
    ? `${hours}h ${pad(mins)}m`
    : totalMin > 0
      ? `${pad(mins)}m ${pad(secs)}s`
      : `${pad(secs)}s`;
  return { label, urgent: diff <= alarm.reminderMin * 60 * 1000, past: false };
}

function fmtTime12(time: string) {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${pad(m)} ${ampm}`;
}

const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "NZD", "XAU"];

export function NewsAlarms() {
  const today = new Date().toISOString().split("T")[0];

  const [alarms, setAlarms] = useState<NewsAlarm[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [time, setTime] = useState("");
  const [date, setDate] = useState(today);
  const [impact, setImpact] = useState<Impact>("HIGH");
  const [reminderMin, setReminderMin] = useState<ReminderMin>(15);
  const [tick, setTick] = useState(0);
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>("default");
  const firedRef = useRef<Set<string>>(new Set());

  // Load alarms
  useEffect(() => {
    try {
      const raw = localStorage.getItem(ALARMS_KEY);
      if (raw) setAlarms(JSON.parse(raw));
    } catch {}
    if (typeof Notification !== "undefined") {
      setNotifPerm(Notification.permission);
    }
  }, []);

  // Countdown ticker + fire notifications
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
      const now = Date.now();
      setAlarms(prev => {
        let changed = false;
        const next = prev.map(alarm => {
          if (alarm.fired) return alarm;
          const [h, m] = alarm.time.split(":").map(Number);
          const target = new Date(alarm.date);
          target.setHours(h, m, 0, 0);
          const diffMs = target.getTime() - now;
          const reminderMs = alarm.reminderMin * 60 * 1000;

          // Fire reminder notification
          if (diffMs > 0 && diffMs <= reminderMs && !firedRef.current.has(alarm.id)) {
            firedRef.current.add(alarm.id);
            if (typeof Notification !== "undefined" && Notification.permission === "granted") {
              new Notification(`⚠️ ${alarm.impact} IMPACT — ${alarm.name}`, {
                body: `${alarm.currency} news in ${alarm.reminderMin} minutes (${fmtTime12(alarm.time)})`,
                icon: "/favicon.ico",
                tag: alarm.id,
              });
            }
          }

          // Mark fired when time passes
          if (diffMs <= 0 && !alarm.fired) {
            changed = true;
            return { ...alarm, fired: true };
          }
          return alarm;
        });
        if (changed) {
          localStorage.setItem(ALARMS_KEY, JSON.stringify(next));
          return next;
        }
        return prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  function save(updated: NewsAlarm[]) {
    setAlarms(updated);
    localStorage.setItem(ALARMS_KEY, JSON.stringify(updated));
  }

  function addAlarm() {
    if (!name.trim() || !time) return;
    const alarm: NewsAlarm = {
      id: Date.now().toString(),
      name: name.trim(),
      currency,
      time,
      date,
      impact,
      reminderMin,
      fired: false,
    };
    save([...alarms, alarm]);
    setName("");
    setTime("");
    setDate(today);
    setImpact("HIGH");
    setReminderMin(15);
    setShowForm(false);
  }

  function deleteAlarm(id: string) {
    save(alarms.filter(a => a.id !== id));
    firedRef.current.delete(id);
  }

  async function requestNotif() {
    if (typeof Notification === "undefined") return;
    const perm = await Notification.requestPermission();
    setNotifPerm(perm);
  }

  const active = alarms.filter(a => !a.fired).sort((a, b) => {
    const ta = new Date(`${a.date}T${a.time}`).getTime();
    const tb = new Date(`${b.date}T${b.time}`).getTime();
    return ta - tb;
  });
  const past = alarms.filter(a => a.fired);

  const anyUrgent = active.some(a => getCountdown(a).urgent);

  return (
    <div className="rounded-xl overflow-hidden" style={{
      border: `1px solid ${anyUrgent ? "rgba(255,59,59,0.5)" : "rgba(245,158,11,0.25)"}`,
      background: anyUrgent ? "rgba(255,59,59,0.04)" : "#0D0D0D",
    }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3" style={{
        borderBottom: `1px solid ${anyUrgent ? "rgba(255,59,59,0.2)" : "#1E1E1E"}`,
      }}>
        {anyUrgent
          ? <BellRing size={13} className="animate-bounce" style={{ color: "#FF3B3B" }} />
          : <Bell size={13} style={{ color: "#F59E0B" }} />
        }
        <p className="font-mono text-[10px] font-bold uppercase tracking-widest"
          style={{ color: anyUrgent ? "#FF3B3B" : "#F59E0B" }}>
          News Alarms
        </p>
        {active.length > 0 && (
          <span className="font-mono text-[9px] font-bold px-2 py-0.5 rounded-full ml-1"
            style={{
              background: anyUrgent ? "rgba(255,59,59,0.15)" : "rgba(245,158,11,0.15)",
              color: anyUrgent ? "#FF3B3B" : "#F59E0B",
              border: `1px solid ${anyUrgent ? "rgba(255,59,59,0.3)" : "rgba(245,158,11,0.3)"}`,
            }}>
            {active.length} active
          </span>
        )}

        {/* Notification permission button */}
        {notifPerm !== "granted" && (
          <button onClick={requestNotif}
            className="ml-auto font-mono text-[9px] px-2 py-0.5 rounded"
            style={{ background: "rgba(245,158,11,0.1)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.3)" }}>
            Enable Alerts
          </button>
        )}
        {notifPerm === "granted" && (
          <span className="ml-auto font-mono text-[9px]" style={{ color: "#00FF7F" }}>● Alerts on</span>
        )}

        <button onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1 font-mono text-[9px] px-2 py-1 rounded ml-2"
          style={{ background: "#111", border: "1px solid #2A2A2A", color: "#888" }}>
          <Plus size={10} />Add
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="p-3 space-y-2" style={{ borderBottom: "1px solid #1A1A1A" }}>
          {/* Name */}
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="News name (e.g. NFP, CPI, FOMC)"
            className="w-full font-mono text-[11px] px-3 py-2 rounded-lg outline-none"
            style={{ background: "#111", border: "1px solid #2A2A2A", color: "#fff" }}
          />

          {/* Row: currency + impact */}
          <div className="flex gap-2">
            <select value={currency} onChange={e => setCurrency(e.target.value)}
              className="flex-1 font-mono text-[11px] px-2 py-2 rounded-lg outline-none"
              style={{ background: "#111", border: "1px solid #2A2A2A", color: "#888" }}>
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            {(["HIGH", "MEDIUM"] as Impact[]).map(imp => (
              <button key={imp} onClick={() => setImpact(imp)}
                className="flex-1 font-mono text-[10px] py-2 rounded-lg font-bold"
                style={{
                  background: impact === imp
                    ? imp === "HIGH" ? "rgba(255,59,59,0.15)" : "rgba(245,158,11,0.15)"
                    : "#111",
                  border: `1px solid ${impact === imp
                    ? imp === "HIGH" ? "rgba(255,59,59,0.4)" : "rgba(245,158,11,0.4)"
                    : "#2A2A2A"}`,
                  color: impact === imp
                    ? imp === "HIGH" ? "#FF3B3B" : "#F59E0B"
                    : "#444",
                }}>
                {imp}
              </button>
            ))}
          </div>

          {/* Row: date + time */}
          <div className="flex gap-2">
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="flex-1 font-mono text-[11px] px-2 py-2 rounded-lg outline-none"
              style={{ background: "#111", border: "1px solid #2A2A2A", color: "#888", colorScheme: "dark" }} />
            <input type="time" value={time} onChange={e => setTime(e.target.value)}
              className="flex-1 font-mono text-[11px] px-2 py-2 rounded-lg outline-none"
              style={{ background: "#111", border: "1px solid #2A2A2A", color: "#888", colorScheme: "dark" }} />
          </div>

          {/* Reminder */}
          <div className="flex gap-2">
            <span className="font-mono text-[9px] self-center" style={{ color: "#444" }}>Alert me</span>
            {([5, 15, 30] as ReminderMin[]).map(min => (
              <button key={min} onClick={() => setReminderMin(min)}
                className="flex-1 font-mono text-[10px] py-1.5 rounded-lg"
                style={{
                  background: reminderMin === min ? "rgba(106,236,225,0.12)" : "#111",
                  border: `1px solid ${reminderMin === min ? "rgba(106,236,225,0.3)" : "#1A1A1A"}`,
                  color: reminderMin === min ? "#6AECE1" : "#444",
                }}>
                {min}m before
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button onClick={addAlarm}
              disabled={!name.trim() || !time}
              className="flex-1 font-mono text-[10px] py-2 rounded-lg font-bold"
              style={{
                background: name.trim() && time ? "rgba(245,158,11,0.15)" : "#0D0D0D",
                border: `1px solid ${name.trim() && time ? "rgba(245,158,11,0.4)" : "#1A1A1A"}`,
                color: name.trim() && time ? "#F59E0B" : "#333",
              }}>
              Set Alarm
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-4 font-mono text-[10px] py-2 rounded-lg"
              style={{ background: "#111", border: "1px solid #1A1A1A", color: "#444" }}>
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Active alarms */}
      {active.length === 0 && !showForm && (
        <div className="px-4 py-6 flex flex-col items-center gap-2">
          <Bell size={20} style={{ color: "#1E1E1E" }} />
          <p className="font-mono text-[10px]" style={{ color: "#333" }}>No alarms set</p>
          <p className="font-sans text-[9px]" style={{ color: "#222" }}>Add high-impact news events to get alerts</p>
        </div>
      )}

      {active.map(alarm => {
        const { label, urgent, past: isPast } = getCountdown(alarm);
        const isHigh = alarm.impact === "HIGH";
        const color = urgent ? "#FF3B3B" : isHigh ? "#F59E0B" : "#6AECE1";
        return (
          <div key={alarm.id} className="flex items-center gap-3 px-4 py-3"
            style={{ borderBottom: "1px solid #111" }}>
            {/* Impact dot */}
            <div className="w-2 h-2 rounded-full flex-shrink-0"
              style={{
                background: color,
                boxShadow: urgent ? `0 0 8px 2px ${color}` : "none",
              }} />

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] font-bold text-white truncate">{alarm.name}</span>
                <span className="font-mono text-[9px] px-1.5 py-0.5 rounded"
                  style={{ background: "rgba(255,255,255,0.05)", color: "#555" }}>
                  {alarm.currency}
                </span>
                {isHigh && (
                  <span className="font-mono text-[8px] font-bold px-1.5 py-0.5 rounded"
                    style={{ background: "rgba(255,59,59,0.1)", color: "#FF3B3B", border: "1px solid rgba(255,59,59,0.2)" }}>
                    HIGH
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <Clock size={9} style={{ color: "#333" }} />
                <span className="font-mono text-[9px]" style={{ color: "#444" }}>
                  {fmtTime12(alarm.time)} · alert {alarm.reminderMin}m before
                </span>
              </div>
            </div>

            {/* Countdown */}
            <div className="text-right flex-shrink-0">
              <p className="font-mono text-[11px] font-bold" style={{ color }}>
                {label}
              </p>
              {urgent && (
                <p className="font-mono text-[8px] animate-pulse" style={{ color: "#FF3B3B" }}>
                  ⚠ INCOMING
                </p>
              )}
            </div>

            <button onClick={() => deleteAlarm(alarm.id)}
              className="ml-1 p-1 rounded flex-shrink-0"
              style={{ color: "#2A2A2A" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#FF3B3B")}
              onMouseLeave={e => (e.currentTarget.style.color = "#2A2A2A")}>
              <Trash2 size={11} />
            </button>
          </div>
        );
      })}

      {/* Past alarms cleanup */}
      {past.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2"
          style={{ borderTop: "1px solid #111" }}>
          <span className="font-mono text-[9px]" style={{ color: "#333" }}>{past.length} past alarm{past.length > 1 ? "s" : ""}</span>
          <button onClick={() => save(alarms.filter(a => !a.fired))}
            className="font-mono text-[9px] px-2 py-0.5 rounded"
            style={{ background: "#111", border: "1px solid #1A1A1A", color: "#444" }}>
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
