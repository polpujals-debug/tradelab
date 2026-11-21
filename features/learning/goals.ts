import { activityStreak } from "@/lib/finance";
import { round } from "@/lib/finance/round";
import type { Row } from "@/lib/supabase/types";

export type Goal = Row<"goals">;
export interface GoalTrade { local_date: string | null; net_pnl: number | null }

export interface GoalProgress {
  current: number;
  target: number;
  pct: number;
  done: boolean;
  unit: "dies" | "operacions" | "€" | "%" | "";
  expired: boolean;
}

/** Progrés d'un objectiu a partir de les operacions tancades i els dies amb activitat. Funció pura (testejada). */
export function goalProgress(goal: Pick<Goal, "kind" | "target" | "manual_progress" | "starts_on" | "deadline">, trades: GoalTrade[], activeDays: string[], today: string): GoalProgress {
  const inWindow = trades.filter((t) => t.local_date && t.local_date >= goal.starts_on && (!goal.deadline || t.local_date <= goal.deadline));
  const target = Number(goal.target);
  let current = 0;
  let unit: GoalProgress["unit"] = "";
  switch (goal.kind) {
    case "journal_streak": current = activityStreak(activeDays.filter((d) => d >= goal.starts_on), today); unit = "dies"; break;
    case "winning_trades": current = inWindow.filter((t) => Number(t.net_pnl) > 0).length; unit = "operacions"; break;
    case "trades_count": current = inWindow.length; unit = "operacions"; break;
    case "net_pnl": current = round(inWindow.reduce((s, t) => s + Number(t.net_pnl ?? 0), 0), 2); unit = "€"; break;
    case "win_rate": {
      const decided = inWindow.filter((t) => Number(t.net_pnl) !== 0);
      current = decided.length ? round((decided.filter((t) => Number(t.net_pnl) > 0).length / decided.length) * 100, 1) : 0;
      unit = "%";
      break;
    }
    case "custom": current = Number(goal.manual_progress); break;
  }
  const pct = target > 0 ? Math.max(0, Math.min(100, (current / target) * 100)) : 0;
  return { current, target, pct, done: current >= target, unit, expired: !!goal.deadline && goal.deadline < today && current < target };
}
