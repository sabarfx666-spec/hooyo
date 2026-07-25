import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function calcLotSize(
  riskAmount: number,
  slPips: number,
  pipValue: number
): number {
  if (!slPips || !pipValue) return 0;
  return Math.round((riskAmount / (slPips * pipValue)) * 100) / 100;
}

export function calcPips(entry: number, sl: number, pair: string): number {
  const diff = Math.abs(entry - sl);
  const isJpy = pair.includes("JPY");
  return Math.round(diff / (isJpy ? 0.01 : 0.0001));
}

export function calcRR(entry: number, sl: number, tp: number): number {
  const risk = Math.abs(entry - sl);
  const reward = Math.abs(tp - entry);
  if (!risk) return 0;
  return Math.round((reward / risk) * 100) / 100;
}

// Progress-bar readiness color by completion %: orange (low) → gold (mid) → green (ready).
export function readinessColor(pct: number) {
  if (pct >= 75) return "#22C55E"; // green — ready
  if (pct >= 50) return "#EAB308"; // gold — getting there
  return "#F97316";                // orange — low
}

export function getGrade(pct: number) {
  if (pct >= 100) return { letter: "A+", color: "#22C55E" };
  if (pct >= 92)  return { letter: "A",  color: "#4ADE80" };
  if (pct >= 83)  return { letter: "A-", color: "#4ADE80" };
  if (pct >= 75)  return { letter: "B",  color: "#6AECE1" };
  if (pct >= 67)  return { letter: "C+", color: "#F59E0B" };
  return               { letter: "D+", color: "#F97316" };
}

export const PIP_VALUES: Record<string, number> = {
  "EUR/USD": 10,
  "GBP/USD": 10,
  "GBP/JPY": 7.5,
};
