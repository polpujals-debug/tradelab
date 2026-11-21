import type { Direction } from "./types";
import { round } from "./round";

export interface TradePnlInput {
  direction: Direction;
  entry: number;
  exit: number;
  stop: number;
  quantity: number;
  fees?: number;
  capitalAtEntry: number;
}

export interface TradePnlResult {
  grossPnl: number;
  netPnl: number;
  pnlPct: number;
  riskAmount: number;
  rMultiple: number;
}

/** Mateixes fórmules que la vista SQL v_trade_metrics. */
export function calcTradePnl(t: TradePnlInput): TradePnlResult {
  const sign = t.direction === "long" ? 1 : -1;
  const grossPnl = sign * (t.exit - t.entry) * t.quantity;
  const netPnl = grossPnl - (t.fees ?? 0);
  const riskAmount = Math.abs(t.entry - t.stop) * t.quantity;
  return {
    grossPnl: round(grossPnl, 4),
    netPnl: round(netPnl, 4),
    pnlPct: round((netPnl / t.capitalAtEntry) * 100, 3),
    riskAmount: round(riskAmount, 4),
    rMultiple: riskAmount > 0 ? round(netPnl / riskAmount, 3) : 0,
  };
}

export function plannedRR(direction: Direction, entry: number, stop: number, takeProfit: number): number {
  const sign = direction === "long" ? 1 : -1;
  return round((sign * (takeProfit - entry)) / Math.abs(entry - stop), 3);
}
