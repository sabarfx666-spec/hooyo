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

export const PIP_VALUES: Record<string, number> = {
  "EUR/USD": 10,
  "GBP/USD": 10,
  "GBP/JPY": 7.5,
};
