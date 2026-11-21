import { round } from "./round";

export interface DisciplineLimits {
  maxDailyLoss: number | null;
  maxWeeklyLoss: number | null;
  maxTradesPerDay: number | null;
}

export interface DisciplineState {
  todayPnl: number;
  weekPnl: number;
  tradesToday: number;
}

export type DisciplineAlertCode = "daily_loss" | "weekly_loss" | "max_trades";

export interface DisciplineAlert {
  code: DisciplineAlertCode;
  level: "warning" | "breach";
  /** Valor actual i límit (pèrdues en positiu). */
  current: number;
  limit: number;
}

/** Avís a partir del 80 % del límit; incompliment quan s'arriba o se supera. */
export function checkDiscipline(limits: DisciplineLimits, s: DisciplineState): DisciplineAlert[] {
  const alerts: DisciplineAlert[] = [];
  const push = (code: DisciplineAlertCode, current: number, limit: number | null) => {
    if (limit === null || limit <= 0) return;
    if (current >= limit) alerts.push({ code, level: "breach", current: round(current, 2), limit });
    else if (current >= limit * 0.8) alerts.push({ code, level: "warning", current: round(current, 2), limit });
  };
  push("daily_loss", Math.max(0, -s.todayPnl), limits.maxDailyLoss);
  push("weekly_loss", Math.max(0, -s.weekPnl), limits.maxWeeklyLoss);
  push("max_trades", s.tradesToday, limits.maxTradesPerDay);
  return alerts;
}

export function isRiskAboveWarning(riskPct: number, warningPct: number): boolean {
  return riskPct > warningPct;
}
