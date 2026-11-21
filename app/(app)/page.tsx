import { Activity, AlertTriangle, ArrowRight, BookOpenText, ChartCandlestick, LayoutDashboard, LineChart, Newspaper, Percent, Scale, TrendingDown, Wallet } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { DailyPnlChart } from "@/components/charts/daily-pnl-chart";
import { EquityChart } from "@/components/charts/equity-chart";
import { EmptyState } from "@/components/shared/empty-state";
import { Hero, PanelTitle, StatTile } from "@/components/shared/hero";
import { Pnl } from "@/components/shared/pnl";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Kpi, toneFor } from "@/features/dashboard/components/kpi";
import { PeriodSelect, periodFromParam } from "@/features/dashboard/components/period-select";
import { PnlCalendar } from "@/features/dashboard/components/pnl-calendar";
import { getLatestAnalysis, getLatestReport } from "@/features/dashboard/queries";
import { getDashboard, getMonthCalendar, type Period } from "@/features/performance/service";
import { getSettings } from "@/features/settings/queries";
import { DirectionBadge, BiasBadge, StatusBadge } from "@/features/trades/components/badges";
import { listTrades } from "@/features/trades/queries";
import { disciplineState } from "@/features/trades/service";
import { checkDiscipline } from "@/lib/finance";
import { formatDate, formatDateTime, formatMoney, formatNumber, formatPct } from "@/lib/format";
import { L } from "@/lib/i18n/ca";

type SP = PageProps<"/">["searchParams"];
const PERIOD_LABEL: Record<Period, string> = { day: "avui", week: "aquesta setmana", month: "aquest mes", all: "des de l'inici" };

async function readParams(sp: SP) {
  const p = await sp;
  const period = periodFromParam(p.periode);
  const month = typeof p.mes === "string" && /^\d{4}-\d{2}$/.test(p.mes) ? p.mes : null;
  return { period, month };
}

async function Overview({ searchParams }: { searchParams: SP }) {
  const { period, month } = await readParams(searchParams);
  const d = await getDashboard(period);
  const cur = d.account.currency;
  const s = d.selected.stats;
  const extra = month ? `&mes=${month}` : "";
  return (
    <>
      <Hero
        icon={LayoutDashboard}
        eyebrow="Centre de control"
        title="Dashboard"
        description={`${d.account.name} · ${formatDate(d.today, { weekday: "long", day: "numeric", month: "long" })}`}
        actions={<PeriodSelect value={period} extra={extra} />}
      >
        <StatTile label="Capital actual" value={formatMoney(d.totals.currentCapital, { currency: cur })} tone="primary" hint={`Inicial ${formatMoney(d.account.initialCapital, { currency: cur })}`} />
        <StatTile label="P&L total" value={formatMoney(d.totals.netPnl, { currency: cur, sign: true })} tone={d.totals.netPnl >= 0 ? "profit" : "loss"} hint={formatPct((d.totals.netPnl / d.account.initialCapital) * 100, { sign: true, decimals: 1 }) + " sobre el capital inicial"} />
        <StatTile label={`P&L ${PERIOD_LABEL[period]}`} value={formatMoney(s.netPnl, { currency: cur, sign: true })} tone={s.netPnl > 0 ? "profit" : s.netPnl < 0 ? "loss" : "neutral"} hint={`${s.trades} operacions tancades`} />
        <StatTile label="Ratxa" value={`${d.totals.streak} ${d.totals.streak === 1 ? "dia" : "dies"}`} tone={d.totals.streak >= 3 ? "cyan" : "neutral"} hint="seguits registrant" />
      </Hero>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <Kpi label="P&L avui" value={d.totals.today} kind="money-signed" currency={cur} tone={toneFor(d.totals.today)} icon={Activity} />
        <Kpi label="P&L setmana" value={d.totals.week} kind="money-signed" currency={cur} tone={toneFor(d.totals.week)} icon={LineChart} />
        <Kpi label="P&L mes" value={d.totals.month} kind="money-signed" currency={cur} tone={toneFor(d.totals.month)} icon={Wallet} />
        <Kpi label="Taxa d'encert" value={s.winRate} kind="pct" tone={s.winRate !== null && s.winRate >= 50 ? "profit" : "warning"} icon={Percent} hint={`${s.wins} G · ${s.losses} P · ${PERIOD_LABEL[period]}`} />
        <Kpi label="R mitjà · PF" value={s.avgR} kind="r" tone={toneFor(s.avgR)} icon={Scale} hint={`Profit factor ${s.profitFactor === null ? (s.trades ? "∞" : "—") : formatNumber(s.profitFactor)}`} />
        <Kpi label="Max drawdown" value={s.maxDrawdown ? -s.maxDrawdown : 0} kind="money-signed" currency={cur} tone={s.maxDrawdown ? "loss" : "neutral"} icon={TrendingDown} hint={`${formatPct(-s.maxDrawdownPct, { decimals: 1 })} des del pic`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <PanelTitle icon={LineChart}>Corba de capital</PanelTitle>
              <span className="text-xs text-dim">{PERIOD_LABEL[period]}</span>
            </div>
            {d.equity.length > 1 ? <EquityChart data={d.equity} start={d.selected.startEquity} currency={cur} /> : <EmptyState icon={LineChart} title="Sense operacions tancades en aquest període" className="h-64 py-6" />}
          </CardContent>
        </Card>
        <Card className="xl:col-span-2">
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <PanelTitle icon={Activity}>P&amp;L per dia</PanelTitle>
              <span className="text-xs text-dim">{period === "all" || period === "day" ? "darrers 30 dies" : PERIOD_LABEL[period]}</span>
            </div>
            <DailyPnlChart data={d.daily} currency={cur} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

async function Discipline() {
  const [settings, d] = await Promise.all([getSettings(), getDashboard("day")]);
  const state = await disciplineState(d.account.id);
  const alerts = checkDiscipline(
    { maxDailyLoss: settings.max_daily_loss == null ? null : Number(settings.max_daily_loss), maxWeeklyLoss: settings.max_weekly_loss == null ? null : Number(settings.max_weekly_loss), maxTradesPerDay: settings.max_trades_per_day },
    state,
  );
  if (!alerts.length) return null;
  const breach = alerts.some((a) => a.level === "breach");
  const text = { daily_loss: "pèrdua diària", weekly_loss: "pèrdua setmanal", max_trades: "operacions al dia" } as const;
  return (
    <Link href="/calculadora" className={`mb-6 flex items-center gap-3 rounded-2xl border p-4 text-sm ${breach ? "border-loss/40 bg-loss/10 text-loss" : "border-warning/40 bg-warning/10 text-warning"}`}>
      <AlertTriangle className="size-5 shrink-0" />
      <span className="flex-1">
        {breach ? "Has superat un límit de disciplina: " : "Estàs a prop d'un límit: "}
        {alerts.map((a) => `${text[a.code]} ${a.code === "max_trades" ? a.current : formatMoney(a.current)} / ${a.code === "max_trades" ? a.limit : formatMoney(a.limit)}`).join(" · ")}
      </span>
      <ArrowRight className="size-4" />
    </Link>
  );
}

async function Calendar({ searchParams }: { searchParams: SP }) {
  const { period, month } = await readParams(searchParams);
  const d = await getDashboard("day");
  const data = await getMonthCalendar(month ?? d.today.slice(0, 7));
  const p = { day: "dia", week: "setmana", month: "mes", all: "tot" }[period];
  return <PnlCalendar data={data} today={d.today} currency={d.account.currency} hrefFor={(m) => `/?periode=${p}&mes=${m}#calendari`} />;
}

async function Latest() {
  const [trades, analysis, report] = await Promise.all([listTrades({ limit: 6 }), getLatestAnalysis(), getLatestReport()]);
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <PanelTitle icon={BookOpenText}>Darreres operacions</PanelTitle>
            <Link href="/diari" className="text-xs text-muted hover:text-accent">Veure-les totes</Link>
          </div>
          {trades.length === 0 ? <p className="text-sm text-dim">Encara no hi ha operacions.</p> : (
            <ul className="divide-y divide-border/60">
              {trades.map((t) => (
                <li key={t.id}>
                  <Link href={`/diari/${t.id}`} className="flex items-center gap-3 py-2.5 hover:opacity-90">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-sm font-medium text-fg">{t.symbol} <DirectionBadge direction={t.direction} /></p>
                      <p className="text-[11px] text-dim">{formatDateTime(t.exit_at ?? t.entry_at ?? t.created_at)}</p>
                    </div>
                    {t.status === "closed" ? (
                      <div className="text-right">
                        <Pnl value={t.net_pnl} className="text-sm font-semibold" />
                        <p><Pnl value={t.r_multiple} kind="r" className="text-[11px]" /></p>
                      </div>
                    ) : <StatusBadge status={t.status} />}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card interactive className="overflow-hidden">
        {analysis ? (
          <Link href={`/analisis/${analysis.id}`} className="block">
            {analysis.thumb && <img src={analysis.thumb} alt={`Captura de l'anàlisi ${analysis.title}`} className="aspect-video w-full object-cover" />}
            <div className="space-y-2 p-5">
              <PanelTitle icon={ChartCandlestick}>Darrera anàlisi</PanelTitle>
              <p className="font-medium text-fg">{analysis.title}</p>
              <div className="flex flex-wrap gap-1.5">
                <BiasBadge bias={analysis.bias} />
                {analysis.timeframes.map((tf) => <Badge key={tf}>{tf}</Badge>)}
                <Badge tone={analysis.outcome === "fulfilled" ? "profit" : analysis.outcome === "failed" ? "loss" : "neutral"}>{L.outcome[analysis.outcome]}</Badge>
              </div>
              {analysis.scenario && <p className="line-clamp-2 text-sm text-muted">{analysis.scenario}</p>}
              <p className="text-[11px] text-dim">{formatDateTime(analysis.analyzed_at)}</p>
            </div>
          </Link>
        ) : <CardContent><EmptyState icon={ChartCandlestick} title="Cap anàlisi encara" description="Demana a Claude que t'analitzi un gràfic." /></CardContent>}
      </Card>

      <Card interactive>
        {report ? (
          <Link href={`/informes/${report.id}`} className="block h-full">
            <CardContent className="flex h-full flex-col gap-3">
              <div className="flex items-center justify-between">
                <PanelTitle icon={Newspaper}>Darrer informe de mercat</PanelTitle>
                {!report.is_read && <Badge tone="primary">Nou</Badge>}
              </div>
              <p className="font-medium text-fg">{report.title}</p>
              <div className="flex flex-wrap gap-1.5">
                <Badge tone="cyan">{L.reportType[report.type]}</Badge>
                {report.btc_bias && <Badge tone={report.btc_bias === "bullish" ? "profit" : report.btc_bias === "bearish" ? "loss" : "neutral"}>BTC {L.bias[report.btc_bias].toLowerCase()}</Badge>}
                {report.eth_bias && <Badge tone={report.eth_bias === "bullish" ? "profit" : report.eth_bias === "bearish" ? "loss" : "neutral"}>ETH {L.bias[report.eth_bias].toLowerCase()}</Badge>}
              </div>
              {report.summary && <p className="text-sm leading-relaxed text-muted">{report.summary}</p>}
              <p className="mt-auto flex items-center gap-1 text-xs text-accent">Llegir <ArrowRight className="size-3.5" /></p>
            </CardContent>
          </Link>
        ) : <CardContent><EmptyState icon={Newspaper} title="Cap informe encara" description="La tasca programada els publicarà aquí." /></CardContent>}
      </Card>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <>
      <Skeleton className="mb-6 h-56" />
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-[92px]" />)}</div>
      <div className="grid gap-6 xl:grid-cols-5"><Skeleton className="h-80 xl:col-span-3" /><Skeleton className="h-80 xl:col-span-2" /></div>
    </>
  );
}

export default function DashboardPage(props: PageProps<"/">) {
  return (
    <>
      <Suspense fallback={null}><Discipline /></Suspense>
      <Suspense fallback={<OverviewSkeleton />}><Overview searchParams={props.searchParams} /></Suspense>
      <section id="calendari" className="mt-6 scroll-mt-6">
        <Suspense fallback={<Skeleton className="h-[560px]" />}><Calendar searchParams={props.searchParams} /></Suspense>
      </section>
      <section className="mt-6">
        <Suspense fallback={<div className="grid gap-6 lg:grid-cols-3"><Skeleton className="h-96" /><Skeleton className="h-96" /><Skeleton className="h-96" /></div>}><Latest /></Suspense>
      </section>
    </>
  );
}
