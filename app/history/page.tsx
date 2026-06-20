"use client";
import { useState, useMemo } from "react";
import { useSabar } from "@/store/SabarContext";
import { StatsBar } from "@/components/history/StatsBar";
import { FilterBar } from "@/components/history/FilterBar";
import { TradeTable } from "@/components/history/TradeTable";

export default function HistoryPage() {
  const { state } = useSabar();
  const [filters, setFilters] = useState({ pair: "", session: "", bias: "", outcome: "", search: "" });

  const updateFilter = (key: string, val: string) => setFilters((f) => ({ ...f, [key]: val }));

  const filtered = useMemo(() => {
    return [...state.trades]
      .sort((a, b) => b.date.localeCompare(a.date))
      .filter((t) => {
        if (filters.pair && t.pair !== filters.pair) return false;
        if (filters.session && t.session !== filters.session) return false;
        if (filters.bias && t.bias !== filters.bias) return false;
        if (filters.outcome) {
          if (filters.outcome === "SKIP" && t.decision !== "SKIP") return false;
          if (filters.outcome !== "SKIP" && t.outcome !== filters.outcome) return false;
        }
        if (filters.search && !t.notes?.toLowerCase().includes(filters.search.toLowerCase())) return false;
        return true;
      });
  }, [state.trades, filters]);

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <h1 className="font-mono text-lg font-bold text-white tracking-widest uppercase">Trade History</h1>
      <StatsBar trades={filtered} />
      <FilterBar {...filters} onChange={updateFilter} />
      <div className="bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg overflow-hidden">
        <TradeTable trades={filtered} />
      </div>
    </div>
  );
}
