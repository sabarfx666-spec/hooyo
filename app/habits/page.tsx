"use client";
import { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, Target, Flame, TrendingUp, CheckCircle2, Circle } from "lucide-react";

const STORAGE_KEY = "sabar-habits";

const HABITS = [
  { id: "pre_market",   label: "Pre-Market Review",  color: "#6AECE1", desc: "Reviewed structure, bias & key levels before session" },
  { id: "follow_rules", label: "Followed Rules",      color: "#00FF7F", desc: "Executed every trade within defined rule set" },
  { id: "no_revenge",   label: "No Revenge Trading",  color: "#F59E0B", desc: "Walked away after loss — no emotional re-entries" },
  { id: "journaled",    label: "Trade Journaled",     color: "#6AECE1", desc: "Logged all trades with chart proof and notes" },
  { id: "risk_check",   label: "Risk Management",     color: "#00FF7F", desc: "Never exceeded daily/weekly risk limits" },
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  return d.toISOString().split("T")[0];
}

function offsetWeek(ws: string, n: number): string {
  const d = new Date(ws);
  d.setDate(d.getDate() + n * 7);
  return d.toISOString().split("T")[0];
}

function formatWeek(ws: string): string {
  const s = new Date(ws + "T12:00:00");
  const e = new Date(ws + "T12:00:00");
  e.setDate(e.getDate() + 4);
  return `${s.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${e.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

function getTodayDayIndex(): number {
  const day = new Date().getDay();
  return day === 0 || day === 6 ? -1 : day - 1;
}

export default function HabitsPage() {
  const todayWeek = getWeekStart(new Date());
  const todayDayIndex = getTodayDayIndex();

  const [weekStart, setWeekStart] = useState(todayWeek);
  const [data, setData] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setData(JSON.parse(raw));
    } catch {}
  }, []);

  function cellKey(habitId: string, dayIdx: number, ws = weekStart): string {
    return `${ws}-${habitId}-${dayIdx}`;
  }

  function toggle(habitId: string, dayIdx: number) {
    const k = cellKey(habitId, dayIdx);
    const updated = { ...data, [k]: !data[k] };
    setData(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  const isChecked = (habitId: string, dayIdx: number, ws = weekStart) =>
    !!data[cellKey(habitId, dayIdx, ws)];

  /* ── Stats ─────────────────────────────────────────────────── */

  const weekTotal   = HABITS.length * 5;
  const weekChecked = HABITS.reduce(
    (sum, h) => sum + DAYS.reduce((s, _, d) => s + (isChecked(h.id, d) ? 1 : 0), 0),
    0
  );
  const weekScore = weekTotal > 0 ? Math.round((weekChecked / weekTotal) * 100) : 0;

  // Streak: consecutive Mon-Fri days (newest-first) where every habit was checked
  const streak = useMemo(() => {
    const today = new Date();
    let count = 0;
    outer: for (let w = 0; w <= 52; w++) {
      const ws = offsetWeek(todayWeek, -w);
      for (let d = 4; d >= 0; d--) {
        const cellDate = new Date(ws + "T12:00:00");
        cellDate.setDate(cellDate.getDate() + d);
        if (cellDate > today) continue;
        if (HABITS.every(h => !!data[`${ws}-${h.id}-${d}`])) {
          count++;
        } else {
          break outer;
        }
      }
    }
    return count;
  }, [data, todayWeek]);

  // Per-habit all-time consistency %
  const habitConsistency = useMemo(() => {
    const today = new Date();
    return HABITS.map(h => {
      let checked = 0, total = 0;
      for (let w = 0; w <= 52; w++) {
        const ws = offsetWeek(todayWeek, -w);
        for (let d = 0; d < 5; d++) {
          const cellDate = new Date(ws + "T12:00:00");
          cellDate.setDate(cellDate.getDate() + d);
          if (cellDate > today) continue;
          total++;
          if (data[`${ws}-${h.id}-${d}`]) checked++;
        }
      }
      return total > 0 ? Math.round((checked / total) * 100) : 0;
    });
  }, [data, todayWeek]);

  const overallConsistency =
    habitConsistency.length > 0
      ? Math.round(habitConsistency.reduce((a, b) => a + b, 0) / habitConsistency.length)
      : 0;

  const isCurrentWeek = weekStart === todayWeek;

  /* ── Render ─────────────────────────────────────────────────── */
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(106,236,225,0.12)", border: "1px solid rgba(106,236,225,0.3)" }}
          >
            <Target size={20} style={{ color: "#6AECE1" }} />
          </div>
          <div>
            <h1 className="font-mono font-bold text-white text-lg uppercase tracking-widest">Daily Habits</h1>
            <p className="font-mono text-[10px] text-[#444] uppercase tracking-widest">
              Discipline Tracker · {formatWeek(weekStart)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekStart(w => offsetWeek(w, -1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#1A1A1A]"
            style={{ border: "1px solid #222", color: "#555" }}
          >
            <ChevronLeft size={14} />
          </button>
          {!isCurrentWeek && (
            <button
              onClick={() => setWeekStart(todayWeek)}
              className="px-3 py-1.5 rounded-lg font-mono text-xs"
              style={{ background: "rgba(106,236,225,0.1)", border: "1px solid rgba(106,236,225,0.25)", color: "#6AECE1" }}
            >
              This Week
            </button>
          )}
          <button
            onClick={() => setWeekStart(w => offsetWeek(w, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#1A1A1A]"
            style={{ border: "1px solid #222", color: "#555" }}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: "Current Streak",
            value: streak,
            unit: streak === 1 ? "day" : "days",
            color: "#F59E0B",
            Icon: Flame,
          },
          {
            label: "Weekly Score",
            value: weekScore,
            unit: "%",
            color: weekScore >= 80 ? "#00FF7F" : weekScore >= 50 ? "#F59E0B" : "#FF3B3B",
            Icon: TrendingUp,
          },
          {
            label: "Consistency",
            value: overallConsistency,
            unit: "%",
            color: overallConsistency >= 70 ? "#6AECE1" : "#F59E0B",
            Icon: CheckCircle2,
          },
        ].map(({ label, value, unit, color, Icon }) => (
          <div
            key={label}
            className="rounded-xl p-4 relative overflow-hidden shimmer-card"
            style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest" style={{ color: "#555" }}>
                {label}
              </p>
              <Icon size={14} style={{ color }} />
            </div>
            <p className="font-mono font-black text-3xl" style={{ color }}>
              {value}
              <span className="text-lg font-bold ml-1" style={{ color: `${color}99` }}>
                {unit}
              </span>
            </p>
            <div
              className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl"
              style={{ background: `linear-gradient(90deg, transparent, ${color}40, transparent)` }}
            />
          </div>
        ))}
      </div>

      {/* ── Habit Grid ── */}
      <div className="rounded-xl overflow-hidden" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>

        {/* Day headers */}
        <div className="grid" style={{ gridTemplateColumns: "1fr repeat(5, 80px)" }}>
          <div
            className="px-5 py-3"
            style={{ borderBottom: "1px solid #1A1A1A", borderRight: "1px solid #1A1A1A" }}
          >
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest" style={{ color: "#2A2A2A" }}>
              Habit
            </p>
          </div>
          {DAYS.map((day, d) => {
            const isToday = isCurrentWeek && d === todayDayIndex;
            return (
              <div
                key={day}
                className="flex flex-col items-center justify-center py-3"
                style={{
                  borderBottom: "1px solid #1A1A1A",
                  borderRight: "1px solid #1A1A1A",
                  background: isToday ? "rgba(106,236,225,0.04)" : "transparent",
                }}
              >
                <p
                  className="font-mono text-[10px] font-black uppercase tracking-widest"
                  style={{ color: isToday ? "#6AECE1" : "#333" }}
                >
                  {day}
                </p>
                {isToday && (
                  <div className="w-1 h-1 rounded-full mt-1" style={{ background: "#6AECE1" }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Habit rows */}
        {HABITS.map((habit, hi) => {
          const rowChecked = DAYS.filter((_, d) => isChecked(habit.id, d)).length;
          const isLast = hi === HABITS.length - 1;

          return (
            <div key={habit.id} className="grid" style={{ gridTemplateColumns: "1fr repeat(5, 80px)" }}>

              {/* Label cell */}
              <div
                className="px-5 py-4 flex items-center gap-3"
                style={{
                  borderBottom: isLast ? "none" : "1px solid #1A1A1A",
                  borderRight: "1px solid #1A1A1A",
                }}
              >
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: habit.color, opacity: 0.7 }}
                />
                <div className="min-w-0">
                  <p className="font-mono text-xs font-bold text-white leading-tight">{habit.label}</p>
                  <p className="font-mono text-[9px] mt-0.5 truncate" style={{ color: "#2A2A2A" }}>
                    {habit.desc}
                  </p>
                </div>
                <span
                  className="ml-auto flex-shrink-0 font-mono text-[9px] font-black px-1.5 py-0.5 rounded"
                  style={{
                    background: rowChecked === 5 ? "rgba(0,255,127,0.12)" : "rgba(255,255,255,0.03)",
                    color: rowChecked === 5 ? "#00FF7F" : "#2A2A2A",
                  }}
                >
                  {rowChecked}/5
                </span>
              </div>

              {/* Day cells */}
              {DAYS.map((_, d) => {
                const checked = isChecked(habit.id, d);
                const isToday = isCurrentWeek && d === todayDayIndex;

                return (
                  <div
                    key={d}
                    className="flex items-center justify-center"
                    style={{
                      borderBottom: isLast ? "none" : "1px solid #1A1A1A",
                      borderRight: "1px solid #1A1A1A",
                      background: isToday ? "rgba(106,236,225,0.02)" : "transparent",
                      minHeight: 64,
                    }}
                  >
                    <button
                      onClick={() => toggle(habit.id, d)}
                      className="w-9 h-9 rounded-full flex items-center justify-center"
                      style={{
                        background: checked ? `${habit.color}18` : "transparent",
                        border: `2px solid ${checked ? habit.color : "#222"}`,
                        color: checked ? habit.color : "#2A2A2A",
                        boxShadow: checked ? `0 0 10px 2px ${habit.color}25` : "none",
                      }}
                    >
                      {checked ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                    </button>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* ── Consistency Bars ── */}
      <div className="rounded-xl p-5 space-y-4" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>
        <p className="font-mono text-[10px] font-bold uppercase tracking-widest" style={{ color: "#6AECE1" }}>
          All-Time Consistency
        </p>
        {HABITS.map((habit, i) => {
          const pct = habitConsistency[i];
          const barColor = pct >= 80 ? "#00FF7F" : pct >= 50 ? "#F59E0B" : "#FF3B3B";

          return (
            <div key={habit.id} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="font-mono text-xs font-bold" style={{ color: "#666" }}>{habit.label}</p>
                <p className="font-mono text-xs font-black" style={{ color: barColor }}>{pct}%</p>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#111" }}>
                <div
                  className="h-full rounded-full anim-bar"
                  style={{
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, ${barColor}70, ${barColor})`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
