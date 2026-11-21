import "server-only";
import { cache } from "react";
import { activityStreak, computeStats, equityCurve, type ClosedTradeLike, type TradeStats } from "@/lib/finance";
import { round } from "@/lib/finance/round";
import { addDays, localDate, startOfMonth, startOfWeek } from "@/lib/time";
import { today as todayLocal } from "@/lib/today";
import { db, must } from "@/lib/supabase/server";
import { getDefaultAccount } from "@/features/settings/queries";
import type { TradeMetrics } from "@/features/trades/queries";

export type Period = "day" | "week" | "month" | "all";
export const PERIODS: Period[] = ["day", "week", "month", "all"];

export interface Range {
  from: string | null; // dia local inclòs
  to: string; // dia local inclòs
}

/** Rang del període que conté `anchor` (dia local). */
export function periodRange(period: Period, anchor: string): Range {
  switch (period) {
    case "day": return { from: anchor, to: anchor };
    case "week": { const from = startOfWeek(anchor); return { from, to: addDays(from, 6) }; }
    case "month": { const from = startOfMonth(anchor); return { from, to: addDays(startOfMonth(addDays(from, 32)), -1) }; }
    case "all": return { from: null, to: anchor };
  }
}

/** El període immediatament anterior (per comparar). */
export function previousRange(period: Period, anchor: string): Range | null {
  const r = periodRange(period, anchor);
  if (!r.from) return null;
  return periodRange(period, addDays(r.from, -1));
}

const toClosed = (t: TradeMetrics): ClosedTradeLike => ({
  id: t.id ?? "", netPnl: Number(t.net_pnl ?? 0), rMultiple: t.r_multiple == null ? null : Number(t.r_multiple), exitAt: t.exit_at ?? "", fees: Number(t.fees ?? 0),
});

/** Totes les operacions tancades del compte (ordenades) + capital inicial. Base de tots els càlculs. */
const loadClosed = cache(async () => {
  const account = await getDefaultAccount();
  const rows = must(
    await db().from("v_trade_metrics").select("*").eq("account_id", account.id).eq("status", "closed").order("exit_at", { ascending: true }),
    "Operacions tancades",
  );
  return { account, rows };
});

const inRange = (r: Range) => (t: TradeMetrics) => !!t.local_date && (!r.from || t.local_date >= r.from) && t.local_date <= r.to;

export interface PeriodStats {
  range: Range;
  stats: TradeStats;
  startEquity: number;
  endEquity: number;
  compliance: number | null;
  trades: TradeMetrics[];
}

function statsFor(rows: TradeMetrics[], initial: number, range: Range): PeriodStats {
  const before = rows.filter((t) => range.from && t.local_date! < range.from);
  const startEquity = initial + before.reduce((s, t) => s + Number(t.net_pnl ?? 0), 0);
  const trades = rows.filter(inRange(range));
  const stats = computeStats(trades.map(toClosed), startEquity);
  const compliance = trades.filter((t) => t.compliance_pct != null);
  return {
    range, stats, trades,
    startEquity: round(startEquity, 2),
    endEquity: round(startEquity + stats.netPnl, 2),
    compliance: compliance.length ? round(compliance.reduce((s, t) => s + Number(t.compliance_pct), 0) / compliance.length, 1) : null,
  };
}

export async function activeDays(): Promise<string[]> {
  const [trades, analyses] = await Promise.all([
    db().from("trades").select("created_at, entry_at"),
    db().from("analyses").select("analyzed_at"),
  ]);
  const days = new Set<string>();
  for (const t of must(trades, "Activitat")) {
    days.add(localDate(t.created_at));
    if (t.entry_at) days.add(localDate(t.entry_at));
  }
  for (const a of must(analyses, "Activitat")) days.add(localDate(a.analyzed_at));
  return [...days];
}

/** Dades completes del dashboard per a un període. */
export const getDashboard = cache(async (period: Period) => {
  const today = await todayLocal();
  const { account, rows } = await loadClosed();
  const selected = statsFor(rows, account.initialCapital, periodRange(period, today));
  const all = period === "all" ? selected : statsFor(rows, account.initialCapital, periodRange("all", today));
  const pnlOf = (p: Period) => statsFor(rows, account.initialCapital, periodRange(p, today)).stats.netPnl;
  const days = await activeDays();

  // Corba de capital del període, amb punt inicial
  const curve = equityCurve(selected.trades.map(toClosed), selected.startEquity);
  const equity = [
    { date: selected.range.from ? `${selected.range.from}T00:00:00` : (selected.trades[0]?.entry_at ?? new Date().toISOString()), equity: selected.startEquity, pnl: 0, drawdown: 0 },
    ...curve,
  ];

  // P&L per dia (al període; per a "tot", els darrers 30 dies)
  const dailyRange = period === "all" || period === "day" ? { from: addDays(today, -29), to: today } : selected.range;
  const byDay = new Map<string, { pnl: number; trades: number; r: number }>();
  for (const t of rows.filter(inRange(dailyRange))) {
    const d = byDay.get(t.local_date!) ?? { pnl: 0, trades: 0, r: 0 };
    d.pnl += Number(t.net_pnl ?? 0);
    d.trades += 1;
    d.r += Number(t.r_multiple ?? 0);
    byDay.set(t.local_date!, d);
  }
  const daily: { day: string; pnl: number; trades: number; r: number }[] = [];
  for (let d = dailyRange.from!; d <= dailyRange.to; d = addDays(d, 1)) {
    const v = byDay.get(d);
    daily.push({ day: d, pnl: round(v?.pnl ?? 0, 2), trades: v?.trades ?? 0, r: round(v?.r ?? 0, 2) });
  }

  return {
    today, period, account,
    selected,
    totals: {
      netPnl: all.stats.netPnl,
      today: pnlOf("day"),
      week: pnlOf("week"),
      month: pnlOf("month"),
      currentCapital: account.currentCapital,
      streak: activityStreak(days, today),
      maxDrawdownAll: all.stats.maxDrawdown,
      maxDrawdownPctAll: all.stats.maxDrawdownPct,
    },
    equity,
    daily,
  };
});
export type DashboardData = Awaited<ReturnType<typeof getDashboard>>;

/** Calendari d'un mes: P&L per dia i per setmana. `month` = "YYYY-MM". */
export async function getMonthCalendar(month: string) {
  const { rows } = await loadClosed();
  const first = `${month}-01`;
  const last = addDays(startOfMonth(addDays(first, 32)), -1);
  const monthRows = rows.filter(inRange({ from: first, to: last }));
  const days = new Map<string, { pnl: number; trades: number; wins: number; r: number }>();
  for (const t of monthRows) {
    const d = days.get(t.local_date!) ?? { pnl: 0, trades: 0, wins: 0, r: 0 };
    d.pnl += Number(t.net_pnl ?? 0);
    d.trades += 1;
    d.wins += Number(t.net_pnl) > 0 ? 1 : 0;
    d.r += Number(t.r_multiple ?? 0);
    days.set(t.local_date!, d);
  }
  const stats = computeStats(monthRows.map(toClosed), 0);
  const dayValues = [...days.entries()].map(([day, v]) => ({ day, ...v, pnl: round(v.pnl, 2), r: round(v.r, 2) }));
  const best = dayValues.reduce<(typeof dayValues)[number] | null>((b, d) => (!b || d.pnl > b.pnl ? d : b), null);
  return {
    month, first, last,
    days: Object.fromEntries(dayValues.map((d) => [d.day, d])),
    summary: {
      trades: stats.trades, winRate: stats.winRate, netPnl: stats.netPnl, totalR: stats.totalR,
      greenDays: dayValues.filter((d) => d.pnl > 0).length,
      redDays: dayValues.filter((d) => d.pnl < 0).length,
      bestDay: best && best.pnl > 0 ? best : null,
    },
  };
}
export type MonthCalendar = Awaited<ReturnType<typeof getMonthCalendar>>;

// ───────── Informes de rendiment (diari / setmanal / mensual) ─────────

export type ReportKind = "daily" | "weekly" | "monthly";
const kindToPeriod: Record<ReportKind, Period> = { daily: "day", weekly: "week", monthly: "month" };

export interface PerformanceReport {
  kind: ReportKind;
  range: Range;
  previousRange: Range | null;
  currency: string;
  summary: {
    netPnl: number; trades: number; winRate: number | null; totalR: number; avgR: number | null; profitFactor: number | null;
    maxDrawdown: number; compliance: number | null; startEquity: number; endEquity: number; fees: number;
  };
  previous: PerformanceReport["summary"] | null;
  best: { id: string; symbol: string | null; netPnl: number; r: number | null } | null;
  worst: { id: string; symbol: string | null; netPnl: number; r: number | null } | null;
  errors: { name: string; count: number; cost: number }[];
  byAsset: { symbol: string; trades: number; netPnl: number }[];
  lessons: string[];
  trades: { id: string; symbol: string | null; direction: string | null; netPnl: number; r: number | null; exitAt: string | null; setup: string | null }[];
}

export async function getPerformanceReport(kind: ReportKind, anchor?: string): Promise<PerformanceReport> {
  const day = anchor ?? (await todayLocal());
  const period = kindToPeriod[kind];
  const { account, rows } = await loadClosed();
  const cur = statsFor(rows, account.initialCapital, periodRange(period, day));
  const prevRange = previousRange(period, day);
  const prev = prevRange ? statsFor(rows, account.initialCapital, prevRange) : null;

  const summarize = (p: PeriodStats): PerformanceReport["summary"] => ({
    netPnl: p.stats.netPnl, trades: p.stats.trades, winRate: p.stats.winRate, totalR: p.stats.totalR, avgR: p.stats.avgR,
    profitFactor: p.stats.profitFactor, maxDrawdown: p.stats.maxDrawdown, compliance: p.compliance,
    startEquity: p.startEquity, endEquity: p.endEquity, fees: p.stats.fees,
  });

  const ids = cur.trades.map((t) => t.id!).filter(Boolean);
  const [tagRes, lessonRes] = ids.length
    ? await Promise.all([
        db().from("trade_tags").select("trade_id, tags!inner(name, kind)").eq("tags.kind", "error").in("trade_id", ids),
        db().from("trades").select("lesson").in("id", ids).not("lesson", "is", null),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];
  const pnlById = new Map(cur.trades.map((t) => [t.id, Number(t.net_pnl ?? 0)]));
  const errMap = new Map<string, { count: number; cost: number }>();
  for (const t of must(tagRes, "Errors") ?? []) {
    const name = t.tags?.name;
    if (!name) continue;
    const e = errMap.get(name) ?? { count: 0, cost: 0 };
    e.count += 1;
    e.cost += Math.min(0, pnlById.get(t.trade_id) ?? 0);
    errMap.set(name, e);
  }
  const assetMap = new Map<string, { trades: number; netPnl: number }>();
  for (const t of cur.trades) {
    const a = assetMap.get(t.symbol ?? "?") ?? { trades: 0, netPnl: 0 };
    a.trades += 1;
    a.netPnl += Number(t.net_pnl ?? 0);
    assetMap.set(t.symbol ?? "?", a);
  }
  const ref = (id: string | undefined) => {
    const t = cur.trades.find((x) => x.id === id);
    return t ? { id: t.id!, symbol: t.symbol, netPnl: Number(t.net_pnl), r: t.r_multiple } : null;
  };

  return {
    kind, range: cur.range, previousRange: prevRange, currency: account.currency,
    summary: summarize(cur),
    previous: prev ? summarize(prev) : null,
    best: cur.stats.best && cur.stats.best.netPnl > 0 ? ref(cur.stats.best.id) : null,
    worst: cur.stats.worst && cur.stats.worst.netPnl < 0 ? ref(cur.stats.worst.id) : null,
    errors: [...errMap.entries()].map(([name, v]) => ({ name, count: v.count, cost: round(v.cost, 2) })).sort((a, b) => a.cost - b.cost || b.count - a.count),
    byAsset: [...assetMap.entries()].map(([symbol, v]) => ({ symbol, trades: v.trades, netPnl: round(v.netPnl, 2) })).sort((a, b) => b.netPnl - a.netPnl),
    lessons: [...new Set(must(lessonRes, "Lliçons").map((l) => l.lesson).filter((l): l is string => !!l))].slice(0, 8),
    trades: cur.trades.map((t) => ({ id: t.id!, symbol: t.symbol, direction: t.direction, netPnl: Number(t.net_pnl), r: t.r_multiple, exitAt: t.exit_at, setup: t.setup })),
  };
}
