import { Calculator as CalcIcon } from "lucide-react";
import { cache, Suspense } from "react";
import { Hero, StatTile } from "@/components/shared/hero";
import { Skeleton } from "@/components/ui/skeleton";
import { Calculator } from "@/features/calculator/components/calculator";
import { DisciplinePanel } from "@/features/calculator/components/discipline-panel";
import { getDefaultAccount, getSettings, listAssets } from "@/features/settings/queries";
import { closedTradesBetween } from "@/features/trades/queries";
import { disciplineState } from "@/features/trades/service";
import { formatMoney, formatPct } from "@/lib/format";

export const metadata = { title: "Calculadora de risc" };

const loadData = cache(async () => {
  const [settings, account, assets] = await Promise.all([getSettings(), getDefaultAccount(), listAssets()]);
  const [state, closed] = await Promise.all([disciplineState(account.id), closedTradesBetween(null, null, account.id)]);
  const wins = closed.filter((t) => Number(t.net_pnl) > 0);
  const decided = closed.filter((t) => Number(t.net_pnl) !== 0);
  return {
    settings, account, assets: assets.map((a) => a.symbol), state,
    stats: {
      trades: closed.length,
      winRate: decided.length ? (wins.length / decided.length) * 100 : null,
      avgWinR: wins.length ? wins.reduce((s, t) => s + Number(t.r_multiple ?? 0), 0) / wins.length : null,
    },
  };
});

async function HeroStats() {
  const { settings, account, state } = await loadData();
  return (
    <>
      <StatTile label="Capital actual" value={formatMoney(account.currentCapital, { currency: account.currency })} tone="primary" hint={account.name} />
      <StatTile label="Risc per defecte" value={formatPct(Number(settings.default_risk_pct), { decimals: 1 })} tone={Number(settings.default_risk_pct) > Number(settings.risk_warning_pct) ? "warning" : "profit"} hint={formatMoney((account.currentCapital * Number(settings.default_risk_pct)) / 100) + " per operació"} />
      <StatTile label="P&L avui" value={formatMoney(state.todayPnl, { sign: true })} tone={state.todayPnl >= 0 ? "profit" : "loss"} hint={settings.max_daily_loss ? `Límit −${formatMoney(Number(settings.max_daily_loss))}` : undefined} />
      <StatTile label="Operacions avui" value={`${state.tradesToday}${settings.max_trades_per_day ? ` / ${settings.max_trades_per_day}` : ""}`} tone={settings.max_trades_per_day && state.tradesToday >= settings.max_trades_per_day ? "loss" : "neutral"} />
    </>
  );
}

async function Body() {
  const d = await loadData();
  return (
    <div className="space-y-6">
      <Calculator
        capital={d.account.currentCapital}
        defaultRiskPct={Number(d.settings.default_risk_pct)}
        riskWarningPct={Number(d.settings.risk_warning_pct)}
        currency={d.account.currency}
        assets={d.assets}
        stats={d.stats}
      />
      <DisciplinePanel
        currency={d.account.currency}
        state={d.state}
        limits={{
          maxDailyLoss: d.settings.max_daily_loss == null ? null : Number(d.settings.max_daily_loss),
          maxWeeklyLoss: d.settings.max_weekly_loss == null ? null : Number(d.settings.max_weekly_loss),
          maxTradesPerDay: d.settings.max_trades_per_day,
        }}
      />
    </div>
  );
}

export default function CalculatorPage() {
  return (
    <>
      <Hero icon={CalcIcon} eyebrow="Consola de risc" title="Calculadora de risc" description="Dimensiona cada posició abans d'entrar i coneix el teu risc de ruïna.">
        <Suspense fallback={<>{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[74px]" />)}</>}>
          <HeroStats />
        </Suspense>
      </Hero>
      <Suspense fallback={<div className="grid gap-6 xl:grid-cols-2"><Skeleton className="h-[620px]" /><Skeleton className="h-[620px]" /></div>}>
        <Body />
      </Suspense>
    </>
  );
}
