"use client";
import { useState } from "react";
import { useSabar } from "@/store/SabarContext";
import { DayCell } from "./DayCell";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export function CalendarGrid() {
  const { state, dispatch } = useSabar();
  const today = new Date().toISOString().split("T")[0];

  const [viewDate, setViewDate] = useState(() => {
    const d = new Date(state.selectedDate);
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [balanceMode, setBalanceMode] = useState<"initial" | "current">("initial");

  const { year, month } = viewDate;
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();

  const cells: (number | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => setViewDate(({ year, month }) =>
    month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 });
  const nextMonth = () => setViewDate(({ year, month }) =>
    month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 });
  const prevYear = () => setViewDate(v => ({ ...v, year: v.year - 1 }));
  const nextYear = () => setViewDate(v => ({ ...v, year: v.year + 1 }));

  const getDateStr = (day: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const selectedDay = state.selectedDate;

  const monthTrades = state.trades.filter((t) => {
    const d = new Date(t.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });
  const monthPnl = monthTrades.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const winDays = new Set(
    monthTrades.filter((t) => (t.pnl ?? 0) > 0).map((t) => t.date)
  ).size;
  const lossDays = new Set(
    monthTrades.filter((t) => (t.pnl ?? 0) < 0).map((t) => t.date)
  ).size;

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "#0D0D0D", border: "1px solid #1E1E1E" }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "#1E1E1E" }}>

        {/* Left: metric dropdown */}
        <button
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg font-sans text-sm font-medium text-white"
          style={{ background: "#1A1A1A", border: "1px solid #2A2A2A" }}
        >
          Dollar Profit
          <ChevronDown size={14} className="text-[#666]" />
        </button>

        {/* Center: month + year nav */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5">
            <button onClick={prevMonth} className="p-1.5 rounded hover:bg-[#1A1A1A] text-[#555] hover:text-white transition-colors">
              <ChevronLeft size={15} />
            </button>
            <span className="font-mono font-bold text-white text-base w-28 text-center">
              {MONTHS[month]}
            </span>
            <button onClick={nextMonth} className="p-1.5 rounded hover:bg-[#1A1A1A] text-[#555] hover:text-white transition-colors">
              <ChevronRight size={15} />
            </button>
          </div>
          <div className="flex items-center gap-0.5">
            <button onClick={prevYear} className="p-1.5 rounded hover:bg-[#1A1A1A] text-[#555] hover:text-white transition-colors">
              <ChevronLeft size={15} />
            </button>
            <span className="font-mono font-bold text-white text-base w-14 text-center">{year}</span>
            <button onClick={nextYear} className="p-1.5 rounded hover:bg-[#1A1A1A] text-[#555] hover:text-white transition-colors">
              <ChevronRight size={15} />
            </button>
          </div>
        </div>

        {/* Right: balance toggle + Month/Year view */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-4">
            {(["initial", "current"] as const).map((m) => (
              <label key={m} className="flex items-center gap-1.5 cursor-pointer" onClick={() => setBalanceMode(m)}>
                <div
                  className="w-4 h-4 rounded-full flex items-center justify-center border-2 transition-colors"
                  style={{
                    borderColor: balanceMode === m ? "#6AECE1" : "#3A3A3A",
                    background: balanceMode === m ? "#6AECE1" : "transparent",
                  }}
                >
                  {balanceMode === m && <div className="w-1.5 h-1.5 rounded-full bg-[#0D0D0D]" />}
                </div>
                <span className="font-sans text-xs text-[#777]">
                  {m === "initial" ? "Initial Balance" : "Current Balance"}
                </span>
              </label>
            ))}
          </div>

          <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid #2A2A2A" }}>
            {["Month", "Year"].map((v, i) => (
              <button
                key={v}
                className="px-3 py-1 text-xs font-sans font-medium transition-colors"
                style={{
                  background: i === 0 ? "#2A2A2A" : "transparent",
                  color: i === 0 ? "#fff" : "#555",
                  borderLeft: i > 0 ? "1px solid #2A2A2A" : "none",
                }}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Month summary ── */}
      <div className="flex items-center gap-5 px-5 py-2 border-b" style={{ borderColor: "#151515" }}>
        <span className="font-sans text-xs text-[#444]">{monthTrades.length} trade{monthTrades.length !== 1 ? "s" : ""}</span>
        <span className="font-mono text-xs font-bold" style={{ color: monthPnl >= 0 ? "#00FF7F" : "#FF3B3B" }}>
          {monthPnl >= 0 ? "+" : "−"}${Math.abs(monthPnl).toFixed(2)} P&L
        </span>
        <span className="font-sans text-xs font-semibold" style={{ color: "#00FF7F" }}>{winDays}W</span>
        <span className="font-sans text-xs font-semibold" style={{ color: "#FF3B3B" }}>{lossDays}L</span>
      </div>

      {/* ── Weekday headers ── */}
      <div className="grid grid-cols-7 border-b" style={{ borderColor: "#151515" }}>
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-2.5 text-center font-sans text-xs font-semibold tracking-widest uppercase"
            style={{ color: "#333" }}>
            {d}
          </div>
        ))}
      </div>

      {/* ── Day grid ── */}
      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          const dateStr = day ? getDateStr(day) : "";
          const dayTrades = day ? state.trades.filter((t) => t.date === dateStr) : [];
          const col = idx % 7;
          const row = Math.floor(idx / 7);
          const totalRows = Math.floor(cells.length / 7);
          return (
            <div
              key={idx}
              style={{
                borderRight: col < 6 ? "1px solid #151515" : "none",
                borderBottom: row < totalRows - 1 ? "1px solid #151515" : "none",
              }}
            >
              <DayCell
                day={day}
                date={dateStr}
                trades={dayTrades}
                isToday={dateStr === today}
                isSelected={dateStr === selectedDay}
                isCurrentMonth={true}
                onClick={() => {
                  if (day) dispatch({ type: "SET_DATE", payload: dateStr });
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
