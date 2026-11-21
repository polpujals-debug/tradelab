import { AlertOctagon, ChevronLeft, ChevronRight, Download, Lightbulb, ListOrdered, Medal, PieChart, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Hero, PanelTitle, StatTile } from "@/components/shared/hero";
import { EmptyState } from "@/components/shared/empty-state";
import { Pnl } from "@/components/shared/pnl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, Td, Th, THead, Tr } from "@/components/ui/table";
import { PrintButton } from "@/features/performance/components/print-button";
import { rangeLabel } from "@/features/performance/markdown";
import { getPerformanceReport, type PerformanceReport, type ReportKind } from "@/features/performance/service";
import { DirectionBadge } from "@/features/trades/components/badges";
import { formatDateTime, formatMoney, formatNumber, formatPct, formatR } from "@/lib/format";
import { addDays } from "@/lib/time";
import { cn } from "@/lib/utils";

export const metadata = { title: "Rendiment" };

const KINDS: { kind: ReportKind; param: string; label: string }[] = [
  { kind: "daily", param: "diari", label: "Diari" },
  { kind: "weekly", param: "setmanal", label: "Setmanal" },
  { kind: "monthly", param: "mensual", label: "Mensual" },
];

function Delta({ cur, prev, unit = "money", currency, invert = false }: { cur: number | null; prev: number | null | undefined; unit?: "money" | "pp" | "r" | "n"; currency?: string; invert?: boolean }) {
  if (cur == null || prev == null) return <span className="text-dim">sense comparació</span>;
  const d = cur - prev;
  const good = invert ? d < 0 : d > 0;
  const txt = unit === "money" ? formatMoney(d, { currency, sign: true }) : unit === "pp" ? `${d > 0 ? "+" : ""}${formatNumber(d, 1)} pp` : unit === "r" ? formatR(d) : `${d > 0 ? "+" : ""}${d}`;
  return <span className={cn(d === 0 ? "text-dim" : good ? "text-profit" : "text-loss")}>{d > 0 ? "▲" : d < 0 ? "▼" : "="} {txt} vs anterior</span>;
}

async function Report({ searchParams }: { searchParams: PageProps<"/rendiment">["searchParams"] }) {
  const sp = await searchParams;
  const kind = KINDS.find((k) => k.param === sp.tipus)?.kind ?? "weekly";
  const param = KINDS.find((k) => k.kind === kind)!.param;
  const anchor = typeof sp.data === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.data) ? sp.data : undefined;
  const r: PerformanceReport = await getPerformanceReport(kind, anchor);
  const s = r.summary;
  const p = r.previous;
  const c = r.currency;
  const prevAnchor = r.previousRange?.from ?? addDays(r.range.from ?? r.range.to, -1);
  const nextAnchor = addDays(r.range.to, 1);
  const maxErr = Math.max(1, ...r.errors.map((e) => Math.abs(e.cost)));

  return (
    <>
      <Hero
        icon={TrendingUp}
        eyebrow="Informes de rendiment"
        title="Rendiment"
        description={<span className="first-letter:uppercase">{rangeLabel(r.range)}</span>}
        actions={
          <div className="no-print flex flex-wrap items-center gap-2">
            <nav aria-label="Tipus d'informe" className="inline-flex rounded-xl border border-border bg-bg/60 p-1">
              {KINDS.map((k) => (
                <Link key={k.kind} href={`/rendiment?tipus=${k.param}`} aria-current={k.kind === kind ? "page" : undefined}
                  className={cn("rounded-lg px-3 py-1.5 text-xs font-medium", k.kind === kind ? "bg-primary/15 text-accent shadow-[inset_0_0_0_1px_rgb(59_130_246/0.35)]" : "text-muted hover:text-fg")}>
                  {k.label}
                </Link>
              ))}
            </nav>
            <div className="flex rounded-xl border border-border bg-bg/60">
              <Link href={`/rendiment?tipus=${param}&data=${prevAnchor}`} aria-label="Període anterior" className="grid size-9 place-items-center text-muted hover:text-fg"><ChevronLeft className="size-4" /></Link>
              <Link href={`/rendiment?tipus=${param}&data=${nextAnchor}`} aria-label="Període següent" className="grid size-9 place-items-center text-muted hover:text-fg"><ChevronRight className="size-4" /></Link>
            </div>
            <Button variant="secondary" asChild>
              <a href={`/rendiment/export?tipus=${kind}${anchor ? `&data=${anchor}` : ""}`}><Download /> Markdown</a>
            </Button>
            <PrintButton />
          </div>
        }
      >
        <StatTile label="P&L net" value={formatMoney(s.netPnl, { currency: c, sign: true })} tone={s.netPnl > 0 ? "profit" : s.netPnl < 0 ? "loss" : "neutral"} hint={<Delta cur={s.netPnl} prev={p?.netPnl} currency={c} />} />
        <StatTile label="Operacions" value={String(s.trades)} tone="primary" hint={<Delta cur={s.trades} prev={p?.trades} unit="n" />} />
        <StatTile label="Taxa d'encert" value={formatPct(s.winRate)} tone={s.winRate !== null && s.winRate >= 50 ? "profit" : "warning"} hint={<Delta cur={s.winRate} prev={p?.winRate} unit="pp" />} />
        <StatTile label="R total" value={formatR(s.totalR)} tone={s.totalR >= 0 ? "profit" : "loss"} hint={<Delta cur={s.totalR} prev={p?.totalR} unit="r" />} />
      </Hero>

      {s.trades === 0 ? (
        <EmptyState icon={TrendingUp} title="Cap operació tancada en aquest període" description="Canvia de període amb les fletxes." />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Compliment estratègia" value={formatPct(s.compliance, { decimals: 0 })} tone={s.compliance !== null && s.compliance >= 85 ? "profit" : "warning"} hint={<Delta cur={s.compliance} prev={p?.compliance} unit="pp" />} />
            <StatTile label="R mitjà · PF" value={formatR(s.avgR)} tone={(s.avgR ?? 0) >= 0 ? "profit" : "loss"} hint={`Profit factor ${s.profitFactor == null ? "∞" : formatNumber(s.profitFactor)}`} />
            <StatTile label="Max drawdown" value={formatMoney(-s.maxDrawdown, { currency: c })} tone={s.maxDrawdown ? "loss" : "neutral"} />
            <StatTile label="Capital" value={formatMoney(s.endEquity, { currency: c })} tone="primary" hint={`des de ${formatMoney(s.startEquity, { currency: c })}`} />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="break-inside-avoid">
              <CardContent className="space-y-3">
                <PanelTitle icon={Medal}>Millor i pitjor</PanelTitle>
                {[{ t: r.best, label: "Millor operació" }, { t: r.worst, label: "Pitjor operació" }].map(({ t, label }) => (
                  <div key={label} className={cn("rounded-xl border p-3", t && t.netPnl > 0 ? "border-profit/30 bg-profit/[0.05]" : t ? "border-loss/30 bg-loss/[0.05]" : "border-border")}>
                    <p className="text-[10px] uppercase tracking-[0.16em] text-dim">{label}</p>
                    {t ? (
                      <Link href={`/diari/${t.id}`} className="mt-1 flex items-center justify-between">
                        <span className="text-sm font-medium text-fg">{t.symbol}</span>
                        <span className="text-right"><Pnl value={t.netPnl} className="font-semibold" currency={c} /> <Pnl value={t.r} kind="r" className="text-xs" /></span>
                      </Link>
                    ) : <p className="mt-1 text-sm text-dim">—</p>}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="break-inside-avoid">
              <CardContent className="space-y-3">
                <PanelTitle icon={AlertOctagon} tone="loss">Errors principals</PanelTitle>
                {r.errors.length === 0 ? <p className="text-sm text-profit">Cap error registrat en aquest període.</p> : (
                  <ul className="space-y-2.5">
                    {r.errors.slice(0, 6).map((e) => (
                      <li key={e.name}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-fg">{e.name} <span className="text-xs text-dim">×{e.count}</span></span>
                          <span className="num text-loss">{formatMoney(e.cost, { currency: c })}</span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-loss/80" style={{ width: `${(Math.abs(e.cost) / maxErr) * 100}%` }} /></div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card className="break-inside-avoid">
              <CardContent className="space-y-3">
                <PanelTitle icon={PieChart}>Per actiu</PanelTitle>
                <ul className="divide-y divide-border/60">
                  {r.byAsset.map((a) => (
                    <li key={a.symbol} className="flex items-center justify-between py-2 text-sm">
                      <span className="text-fg">{a.symbol} <span className="text-xs text-dim">· {a.trades} op</span></span>
                      <Pnl value={a.netPnl} currency={c} />
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {r.lessons.length > 0 && (
            <Card className="break-inside-avoid border-primary/25">
              <CardContent className="space-y-3">
                <PanelTitle icon={Lightbulb}>Lliçons del període</PanelTitle>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {r.lessons.map((l) => <li key={l} className="rounded-xl border border-border bg-bg/40 p-3 text-sm text-fg">{l}</li>)}
                </ul>
              </CardContent>
            </Card>
          )}

          <Card className="overflow-hidden">
            <CardContent className="pb-2"><PanelTitle icon={ListOrdered}>Operacions</PanelTitle></CardContent>
            <Table>
              <THead><tr><Th>Data</Th><Th>Actiu</Th><Th>Direcció</Th><Th>Setup</Th><Th className="text-right">R</Th><Th className="text-right">P&amp;L</Th></tr></THead>
              <tbody>
                {r.trades.map((t) => (
                  <Tr key={t.id}>
                    <Td className="text-muted"><Link href={`/diari/${t.id}`} className="hover:text-fg">{formatDateTime(t.exitAt)}</Link></Td>
                    <Td className="font-medium text-fg">{t.symbol}</Td>
                    <Td><DirectionBadge direction={t.direction === "long" || t.direction === "short" ? t.direction : null} /></Td>
                    <Td className="text-muted">{t.setup ?? "—"}</Td>
                    <Td className="text-right"><Pnl value={t.r} kind="r" /></Td>
                    <Td className="text-right font-medium"><Pnl value={t.netPnl} currency={c} /></Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </Card>
        </div>
      )}
    </>
  );
}

export default function PerformancePage(props: PageProps<"/rendiment">) {
  return (
    <Suspense fallback={<><Skeleton className="mb-6 h-56" /><Skeleton className="h-96" /></>}>
      <Report searchParams={props.searchParams} />
    </Suspense>
  );
}
