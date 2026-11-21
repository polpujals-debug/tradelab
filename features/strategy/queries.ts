import "server-only";
import { computeStats } from "@/lib/finance";
import { db, must } from "@/lib/supabase/server";

export async function getStrategyOverview() {
  const [strategies, rules, trades, ruleStats] = await Promise.all([
    db().from("strategies").select("*").order("version", { ascending: false }),
    db().from("strategy_rules").select("*").order("sort_order"),
    db().from("v_trade_metrics").select("id, strategy_id, net_pnl, r_multiple, exit_at, compliance_pct, status").eq("status", "closed"),
    db().from("v_rule_stats").select("*"),
  ]);
  const allTrades = must(trades, "Operacions");
  const list = must(strategies, "Estratègies").map((s) => {
    const ts = allTrades.filter((t) => t.strategy_id === s.id);
    const stats = computeStats(ts.map((t) => ({ id: t.id ?? "", netPnl: Number(t.net_pnl), rMultiple: t.r_multiple, exitAt: t.exit_at ?? "" })), 0);
    const compliance = ts.length ? ts.reduce((a, t) => a + Number(t.compliance_pct ?? 0), 0) / ts.length : null;
    return { ...s, rules: must(rules, "Regles").filter((r) => r.strategy_id === s.id), stats, compliance };
  });

  // Compliment total vs parcial (totes les versions)
  const full = allTrades.filter((t) => Number(t.compliance_pct) >= 100);
  const partial = allTrades.filter((t) => t.compliance_pct != null && Number(t.compliance_pct) < 100);
  const toStats = (arr: typeof allTrades) => computeStats(arr.map((t) => ({ id: t.id ?? "", netPnl: Number(t.net_pnl), rMultiple: t.r_multiple, exitAt: t.exit_at ?? "" })), 0);

  return {
    strategies: list,
    active: list.find((s) => s.is_active) ?? list[0] ?? null,
    ruleStats: must(ruleStats, "Estadístiques de regles"),
    fullCompliance: toStats(full),
    partialCompliance: toStats(partial),
  };
}
export type StrategyOverview = Awaited<ReturnType<typeof getStrategyOverview>>;
