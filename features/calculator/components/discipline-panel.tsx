import { ShieldAlert, ShieldCheck } from "lucide-react";
import { PanelTitle } from "@/components/shared/hero";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { checkDiscipline, type DisciplineLimits, type DisciplineState } from "@/lib/finance";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

const LABELS = { daily_loss: "Pèrdua màxima diària", weekly_loss: "Pèrdua màxima setmanal", max_trades: "Operacions avui" } as const;

export function DisciplinePanel({ limits, state, currency }: { limits: DisciplineLimits; state: DisciplineState; currency: string }) {
  const alerts = checkDiscipline(limits, state);
  const breach = alerts.some((a) => a.level === "breach");
  const rows = [
    { code: "daily_loss" as const, current: Math.max(0, -state.todayPnl), limit: limits.maxDailyLoss, money: true },
    { code: "weekly_loss" as const, current: Math.max(0, -state.weekPnl), limit: limits.maxWeeklyLoss, money: true },
    { code: "max_trades" as const, current: state.tradesToday, limit: limits.maxTradesPerDay, money: false },
  ];
  return (
    <Card className={cn(breach ? "border-loss/40" : alerts.length ? "border-warning/40" : "border-profit/25")}>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <PanelTitle icon={breach ? ShieldAlert : ShieldCheck} tone={breach ? "loss" : alerts.length ? "warning" : "profit"}>Límits de disciplina</PanelTitle>
          <span className={cn("text-xs font-medium", breach ? "text-loss" : alerts.length ? "text-warning" : "text-profit")}>
            {breach ? "Has superat un límit: avui no operis més." : alerts.length ? "A prop d'un límit: vés amb compte." : "Tot dins dels límits."}
          </span>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {rows.map((r) => {
            const alert = alerts.find((a) => a.code === r.code);
            const pct = r.limit ? (r.current / r.limit) * 100 : 0;
            return (
              <div key={r.code} className="rounded-xl border border-border bg-bg/40 p-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-dim">{LABELS[r.code]}</p>
                <p className={cn("num mt-1 text-lg font-semibold", alert?.level === "breach" ? "text-loss" : alert ? "text-warning" : "text-fg")}>
                  {r.money ? formatMoney(r.current, { currency }) : r.current}
                  <span className="text-sm font-normal text-dim"> / {r.limit == null ? "∞" : r.money ? formatMoney(r.limit, { currency }) : r.limit}</span>
                </p>
                <Progress className="mt-3" value={pct} tone={alert?.level === "breach" ? "loss" : alert ? "warning" : "profit"} label={LABELS[r.code]} />
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-dim">Els límits es configuren a Configuració. Avís al 80 %, bloqueig recomanat al 100 %.</p>
      </CardContent>
    </Card>
  );
}
