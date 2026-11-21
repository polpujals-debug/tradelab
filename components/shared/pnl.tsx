import { formatMoney, formatPct, formatR, pnlTone } from "@/lib/format";
import { cn } from "@/lib/utils";

const toneClass = { profit: "text-profit", loss: "text-loss", neutral: "text-muted" } as const;

export function Pnl({ value, kind = "money", className, currency }: { value: number | null | undefined; kind?: "money" | "pct" | "r"; className?: string; currency?: string }) {
  const text = kind === "money" ? formatMoney(value, { sign: true, currency }) : kind === "pct" ? formatPct(value, { sign: true, decimals: 2 }) : formatR(value);
  return <span className={cn("num", toneClass[pnlTone(value)], className)}>{text}</span>;
}

export function toneOf(value: number | null | undefined) {
  return toneClass[pnlTone(value)];
}
