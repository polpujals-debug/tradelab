import type { ClosedTradeLike } from "./types";
import { round, sum } from "./round";

export interface EquityPoint {
  date: string;
  equity: number;
  pnl: number;
  drawdown: number;
}

export interface TradeStats {
  trades: number;
  wins: number;
  losses: number;
  breakeven: number;
  netPnl: number;
  grossProfit: number;
  grossLoss: number;
  fees: number;
  winRate: number | null;
  avgR: number | null;
  totalR: number;
  profitFactor: number | null;
  expectancy: number | null;
  avgWin: number | null;
  avgLoss: number | null;
  best: ClosedTradeLike | null;
  worst: ClosedTradeLike | null;
  maxDrawdown: number;
  maxDrawdownPct: number;
}

const sortByExit = (a: ClosedTradeLike, b: ClosedTradeLike) => a.exitAt.localeCompare(b.exitAt);

export function winRate(trades: readonly ClosedTradeLike[]): number | null {
  const decided = trades.filter((t) => t.netPnl !== 0);
  if (decided.length === 0) return null;
  return round((decided.filter((t) => t.netPnl > 0).length / decided.length) * 100, 2);
}

/** Beneficis bruts / pèrdues brutes. null si no hi ha pèrdues (infinit) o no hi ha operacions. */
export function profitFactor(trades: readonly ClosedTradeLike[]): number | null {
  const profit = sum(trades.filter((t) => t.netPnl > 0).map((t) => t.netPnl));
  const loss = Math.abs(sum(trades.filter((t) => t.netPnl < 0).map((t) => t.netPnl)));
  if (loss === 0) return null;
  return round(profit / loss, 2);
}

/** Corba de capital ordenada per data de sortida, amb drawdown respecte al màxim previ. */
export function equityCurve(trades: readonly ClosedTradeLike[], initialCapital: number): EquityPoint[] {
  let equity = initialCapital;
  let peak = initialCapital;
  return [...trades].sort(sortByExit).map((t) => {
    equity += t.netPnl;
    peak = Math.max(peak, equity);
    return { date: t.exitAt, equity: round(equity, 2), pnl: round(t.netPnl, 2), drawdown: round(equity - peak, 2) };
  });
}

/** Màxima caiguda des d'un pic (en € i en % del pic). El capital inicial compta com a primer pic. */
export function maxDrawdown(trades: readonly ClosedTradeLike[], initialCapital: number): { amount: number; pct: number } {
  let equity = initialCapital;
  let peak = initialCapital;
  let amount = 0;
  let pct = 0;
  for (const t of [...trades].sort(sortByExit)) {
    equity += t.netPnl;
    if (equity > peak) peak = equity;
    const dd = peak - equity;
    if (dd > amount) amount = dd;
    if (peak > 0 && (dd / peak) * 100 > pct) pct = (dd / peak) * 100;
  }
  return { amount: round(amount, 2), pct: round(pct, 2) };
}

export function computeStats(trades: readonly ClosedTradeLike[], initialCapital: number): TradeStats {
  const wins = trades.filter((t) => t.netPnl > 0);
  const losses = trades.filter((t) => t.netPnl < 0);
  const rs = trades.map((t) => t.rMultiple).filter((r): r is number => r !== null && Number.isFinite(r));
  const grossProfit = sum(wins.map((t) => t.netPnl));
  const grossLoss = sum(losses.map((t) => t.netPnl));
  const netPnl = sum(trades.map((t) => t.netPnl));
  const dd = maxDrawdown(trades, initialCapital);
  const byPnl = [...trades].sort((a, b) => a.netPnl - b.netPnl);

  return {
    trades: trades.length,
    wins: wins.length,
    losses: losses.length,
    breakeven: trades.length - wins.length - losses.length,
    netPnl: round(netPnl, 2),
    grossProfit: round(grossProfit, 2),
    grossLoss: round(grossLoss, 2),
    fees: round(sum(trades.map((t) => t.fees ?? 0)), 2),
    winRate: winRate(trades),
    avgR: rs.length ? round(sum(rs) / rs.length, 2) : null,
    totalR: round(sum(rs), 2),
    profitFactor: profitFactor(trades),
    expectancy: trades.length ? round(netPnl / trades.length, 2) : null,
    avgWin: wins.length ? round(grossProfit / wins.length, 2) : null,
    avgLoss: losses.length ? round(grossLoss / losses.length, 2) : null,
    best: byPnl.length ? byPnl[byPnl.length - 1] : null,
    worst: byPnl.length ? byPnl[0] : null,
    maxDrawdown: dd.amount,
    maxDrawdownPct: dd.pct,
  };
}

/**
 * Ratxa de dies consecutius amb activitat (dates locals YYYY-MM-DD).
 * Si avui encara no hi ha activitat, la ratxa compta fins ahir (no es trenca fins que acaba el dia).
 */
export function activityStreak(activeDays: Iterable<string>, today: string): number {
  const set = new Set(activeDays);
  const cursor = new Date(`${today}T12:00:00Z`);
  if (!set.has(today)) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let streak = 0;
  while (set.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}
