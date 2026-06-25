"use client";
import { useMemo } from "react";
import { useSabar } from "@/store/SabarContext";
import { Trade } from "@/store/types";
import { ArrowLeft, User, TrendingUp, Target, BarChart2 } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/store/AuthContext";

function tradePct(t: Trade) {
  return t.totalRules > 0 ? Math.round((t.checkedCount / t.totalRules) * 100) : 0;
}

export default function ProfilePage() {
  const { state } = useSabar();
  const { user } = useAuth();

  const taken = useMemo(() => state.trades.filter(t => t.decision === "TAKE"), [state.trades]);
  const wins  = taken.filter(t => t.outcome === "WIN");
  const winRate = taken.length > 0 ? Math.round((wins.length / taken.length) * 100) : 0;
  const avgR    = wins.length > 0 ? (wins.reduce((s, t) => s + t.rr, 0) / wins.length).toFixed(2) : "0.00";

  // Most traded session
  const sessionCount: Record<string, number> = {};
  taken.forEach(t => { sessionCount[t.session] = (sessionCount[t.session] ?? 0) + 1; });
  const topSession = Object.entries(sessionCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  // Top pairs
  const pairR: Record<string, { r: number; count: number }> = {};
  wins.forEach(t => {
    if (!pairR[t.pair]) pairR[t.pair] = { r: 0, count: 0 };
    pairR[t.pair].r += t.rr;
    pairR[t.pair].count++;
  });
  const topPairs = Object.entries(pairR)
    .sort((a, b) => b[1].r - a[1].r)
    .slice(0, 3);

  // Discipline score: % of trades with grade ≥ B*
  const discipline = state.trades.length > 0
    ? Math.round((state.trades.filter(t => tradePct(t) >= 70).length / state.trades.length) * 100)
    : 0;

  // Session breakdown
  const sessionBreakdown = Object.entries(
    taken.reduce((acc, t) => {
      const s = t.session === "LONDON" ? "London" : "New York";
      if (!acc[s]) acc[s] = { wins: 0, total: 0, r: 0 };
      acc[s].total++;
      if (t.outcome === "WIN") { acc[s].wins++; acc[s].r += t.rr; }
      return acc;
    }, {} as Record<string, { wins: number; total: number; r: number }>)
  );

  const initials = user?.name?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) ?? "?";

  return (
    <div className="max-w-4xl mx-auto space-y-5 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href="/history" className="flex items-center gap-1.5 text-xs font-mono text-[#444] hover:text-white transition-colors">
          <ArrowLeft size={13} /> Back to Journal
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(229,62,62,0.15)", border: "1px solid rgba(229,62,62,0.3)" }}>
          <User size={20} style={{ color: "#E53E3E" }} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-mono font-bold text-white text-lg tracking-wide">Trader Profile</h1>
            {user?.role === "admin" && (
              <span className="px-2 py-0.5 rounded font-mono text-[9px] font-bold"
                style={{ background: "rgba(229,62,62,0.15)", color: "#E53E3E" }}>Admin</span>
            )}
          </div>
          <p className="font-mono text-[10px] text-[#444]">Self-analysis & performance intelligence</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Trader Snapshot */}
        <div className="col-span-2 rounded-xl p-5 space-y-4" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center font-mono font-black text-lg"
              style={{ background: "#E53E3E", color: "#fff" }}>
              {initials}
            </div>
            <div>
              <p className="font-mono font-bold text-white">{user?.name ?? "Trader"}</p>
              <p className="font-mono text-[10px] text-[#444]">{state.trades.length} total trades</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Primary Session", value: topSession === "LONDON" ? "London" : topSession === "NEW_YORK" ? "New York" : topSession, sub: "Most traded session", Icon: Target, color: "#6AECE1" },
              { label: "AVG R/Trade",     value: `+${avgR}R`,    sub: "Per completed trade",  Icon: TrendingUp, color: "#00FF7F" },
              { label: "Win Rate",        value: `${winRate}%`,  sub: `${wins.length}W / ${taken.length - wins.length}L`, Icon: BarChart2, color: "#00FF7F" },
              { label: "Discipline",      value: `${discipline}%`, sub: discipline >= 70 ? "Good" : discipline >= 50 ? "Average" : "Needs work", Icon: Target, color: discipline >= 70 ? "#00FF7F" : "#F5A623" },
            ].map(({ label, value, sub, Icon, color }) => (
              <div key={label} className="p-3 rounded-xl" style={{ background: "#0A0A0A", border: "1px solid #1A1A1A" }}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Icon size={11} style={{ color }} />
                  <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: "#444" }}>{label}</p>
                </div>
                <p className="font-mono font-black text-sm" style={{ color }}>{value}</p>
                <p className="font-mono text-[9px] mt-0.5" style={{ color: "#444" }}>{sub}</p>
              </div>
            ))}
          </div>

          {/* Top pairs */}
          {topPairs.length > 0 && (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest mb-2" style={{ color: "#444" }}>Top Performing Pairs</p>
              <div className="flex gap-2 flex-wrap">
                {topPairs.map(([pair, { r, count }]) => (
                  <span key={pair} className="px-3 py-1 rounded-full font-mono text-xs font-bold"
                    style={{ background: "rgba(229,62,62,0.12)", color: "#E53E3E", border: "1px solid rgba(229,62,62,0.2)" }}>
                    {pair} +{r.toFixed(1)}R ({Math.round((count / taken.length) * 100)}%)
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Session breakdown */}
        <div className="rounded-xl p-5 space-y-3" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>
          <p className="font-mono text-xs font-bold text-white">Session Breakdown</p>
          {sessionBreakdown.length === 0 ? (
            <p className="font-mono text-[10px] text-[#333]">No data yet</p>
          ) : sessionBreakdown.map(([session, data]) => (
            <div key={session} className="p-3 rounded-lg" style={{ background: "#0A0A0A", border: "1px solid #1A1A1A" }}>
              <div className="flex items-center justify-between mb-1.5">
                <p className="font-mono text-xs font-bold text-white">{session}</p>
                <span className="font-mono text-[10px]" style={{ color: "#00FF7F" }}>+{data.r.toFixed(1)}R</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "#1A1A1A" }}>
                  <div className="h-full rounded-full" style={{
                    width: `${data.total > 0 ? (data.wins / data.total) * 100 : 0}%`,
                    background: "#00FF7F"
                  }} />
                </div>
                <span className="font-mono text-[9px] text-[#444]">{data.wins}W/{data.total - data.wins}L</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Grade distribution */}
      <div className="rounded-xl p-5" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>
        <p className="font-mono text-xs font-bold text-white mb-4">Grade Distribution</p>
        <div className="grid grid-cols-4 gap-3">
          {[
            { grade: "A*", min: 90, color: "#00FF7F", bg: "rgba(0,255,127,0.08)" },
            { grade: "B*", min: 70, color: "#6AECE1", bg: "rgba(106,236,225,0.08)" },
            { grade: "C",  min: 50, color: "#F5A623", bg: "rgba(245,162,35,0.08)" },
            { grade: "D",  min: 0,  color: "#FF3B3B", bg: "rgba(255,59,59,0.08)" },
          ].map(({ grade, min, color, bg }) => {
            const count = state.trades.filter(t => {
              const p = tradePct(t);
              if (grade === "D") return p < 50;
              if (grade === "C") return p >= 50 && p < 70;
              if (grade === "B*") return p >= 70 && p < 90;
              return p >= 90;
            }).length;
            const pct2 = state.trades.length > 0 ? Math.round((count / state.trades.length) * 100) : 0;
            return (
              <div key={grade} className="p-4 rounded-xl text-center" style={{ background: bg, border: `1px solid ${color}22` }}>
                <p className="font-mono font-black text-2xl mb-1" style={{ color }}>{grade}</p>
                <p className="font-mono font-black text-xl text-white">{count}</p>
                <p className="font-mono text-[10px] mt-0.5" style={{ color: "#444" }}>{pct2}% of trades</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
