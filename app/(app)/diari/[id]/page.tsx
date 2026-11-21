import { ArrowLeft, Brain, ChartCandlestick, CheckCircle2, ClipboardCheck, Crosshair, ImageIcon, XCircle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Hero, PanelTitle, StatTile } from "@/components/shared/hero";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BiasBadge, DirectionBadge, StatusBadge } from "@/features/trades/components/badges";
import { TradeActions } from "@/features/trades/components/trade-actions";
import { TradeMedia } from "@/features/trades/components/trade-media";
import { getTrade } from "@/features/trades/queries";
import { formatDateTime, formatMoney, formatNumber, formatPct, formatPrice, formatQty, formatR } from "@/lib/format";
import { L } from "@/lib/i18n/ca";
import { isoToLocalInput } from "@/lib/time";
import { cn } from "@/lib/utils";

export const metadata = { title: "Operació" };

function Row({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/60 py-2.5 last:border-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={cn("num text-sm text-fg", className)}>{value}</dd>
    </div>
  );
}

async function TradeDetailView({ params }: { params: PageProps<"/diari/[id]">["params"] }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const d = await getTrade(id);
  if (!d) notFound();
  const m = d.metrics;
  const t = d.trade;
  const pnl = Number(m.net_pnl ?? 0);
  const closed = m.status === "closed";
  const errors = d.tags.filter((g) => g.kind === "error");

  return (
    <>
      <Hero
        icon={Crosshair}
        eyebrow={`${L.status[t.status]} · ${formatDateTime(t.exit_at ?? t.entry_at ?? t.created_at)}`}
        title={`${m.symbol} · ${L.direction[t.direction]}`}
        description={
          <span className="flex flex-wrap items-center gap-1.5">
            <DirectionBadge direction={t.direction} />
            <StatusBadge status={t.status} />
            {t.setup && <Badge tone="primary">{t.setup}</Badge>}
            {d.strategy && <Badge>{d.strategy.name} v{d.strategy.version}</Badge>}
            <Badge tone="cyan">{L.source[t.source]}</Badge>
          </span>
        }
        actions={<TradeActions id={id} status={t.status} takeProfit={t.take_profit} nowLocal={isoToLocalInput(new Date().toISOString())} />}
      >
        <StatTile label="P&L net" value={closed ? formatMoney(pnl, { sign: true }) : "—"} tone={!closed ? "neutral" : pnl >= 0 ? "profit" : "loss"} hint={closed ? formatPct(m.pnl_pct, { sign: true, decimals: 2 }) + " del compte" : "Encara oberta"} />
        <StatTile label="R aconseguit" value={formatR(m.r_multiple)} tone={!closed ? "neutral" : Number(m.r_multiple) >= 0 ? "profit" : "loss"} hint={m.planned_rr ? `Planificat 1:${formatNumber(m.planned_rr)}` : "Sense TP"} />
        <StatTile label="Risc" value={formatMoney(m.risk_amount)} tone={Number(m.risk_pct) > 2 ? "warning" : "primary"} hint={`${formatPct(m.risk_pct, { decimals: 2 })} del compte`} />
        <StatTile label="Checklist" value={m.compliance_pct != null ? `${Math.round(Number(m.compliance_pct))} %` : "—"} tone={Number(m.compliance_pct) >= 100 ? "profit" : Number(m.compliance_pct) >= 70 ? "warning" : "loss"} hint={`${m.rules_passed}/${m.rules_total} regles`} />
      </Hero>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardContent className="space-y-4">
              <PanelTitle icon={ImageIcon}>Captures</PanelTitle>
              <TradeMedia
                tradeId={id}
                items={d.media.map((x) => ({ id: x.id, url: x.url, thumb: x.thumb_url, caption: x.caption, label: L.mediaKind[x.kind] }))}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4">
              <PanelTitle icon={Brain}>Psicologia i lliçó</PanelTitle>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-bg/40 p-3">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-dim">Emoció abans</p>
                  <p className="mt-1 text-sm text-fg">{t.emotion_before ?? "—"}</p>
                </div>
                <div className="rounded-xl border border-border bg-bg/40 p-3">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-dim">Emoció després</p>
                  <p className="mt-1 text-sm text-fg">{t.emotion_after ?? "—"}</p>
                </div>
              </div>
              {errors.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {errors.map((g) => <Badge key={g.id} tone="loss">{g.name}</Badge>)}
                </div>
              )}
              {t.notes && <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted">{t.notes}</p>}
              {t.lesson && (
                <blockquote className="rounded-xl border border-primary/30 bg-primary/[0.07] p-4 text-sm text-fg">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">Lliçó</p>
                  {t.lesson}
                </blockquote>
              )}
              {!t.notes && !t.lesson && errors.length === 0 && <p className="text-sm text-dim">Sense notes.</p>}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent>
              <PanelTitle icon={Crosshair}>Execució</PanelTitle>
              <dl className="mt-3">
                <Row label="Entrada" value={formatPrice(t.entry_price)} />
                <Row label="Stop loss" value={formatPrice(t.stop_loss)} className="text-loss" />
                <Row label="Take profit" value={formatPrice(t.take_profit)} className="text-profit" />
                <Row label="Sortida" value={formatPrice(t.exit_price)} />
                <Row label="Unitats" value={formatQty(t.quantity)} />
                <Row label="Valor posició" value={formatMoney(m.position_value)} />
                <Row label="Palanquejament" value={`${formatNumber(t.leverage)}x`} />
                <Row label="Comissions" value={formatMoney(t.fees)} />
                <Row label="Capital a l'entrada" value={formatMoney(t.capital_at_entry)} />
                <Row label="Entrada" value={formatDateTime(t.entry_at)} />
                <Row label="Sortida" value={formatDateTime(t.exit_at)} />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3">
              <PanelTitle icon={ClipboardCheck}>Estratègia</PanelTitle>
              <dl>
                <Row label="Biaix 1H" value={<BiasBadge bias={t.bias_1h} />} />
              </dl>
              <div className="space-y-2 text-sm">
                <p><span className="text-xs text-muted">Confirmació 5m · </span><span className="text-fg">{t.confirmation_5m ?? "—"}</span></p>
                <p><span className="text-xs text-muted">Gatell 1m · </span><span className="text-fg">{t.trigger_1m ?? "—"}</span></p>
              </div>
              {d.checklist.length > 0 && (
                <ul className="space-y-1.5 pt-1">
                  {d.checklist.map((c) => (
                    <li key={c.id} className={cn("flex items-start gap-2 text-sm", c.passed ? "text-fg" : "text-dim line-through decoration-loss/50")}>
                      {c.passed ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-profit" /> : <XCircle className="mt-0.5 size-4 shrink-0 text-loss" />}
                      {c.text}
                    </li>
                  ))}
                </ul>
              )}
              {d.analysis && (
                <Link href={`/analisis/${d.analysis.id}`} className="mt-2 flex items-center gap-2 rounded-xl border border-border p-3 text-sm text-muted transition-colors hover:border-primary/50 hover:text-fg">
                  <ChartCandlestick className="size-4 text-accent" />
                  <span className="flex-1 truncate">{d.analysis.title}</span>
                  <BiasBadge bias={d.analysis.bias} />
                </Link>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

export default function TradePage(props: PageProps<"/diari/[id]">) {
  return (
    <>
      <Link href="/diari" className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted hover:text-fg">
        <ArrowLeft className="size-3.5" /> Diari
      </Link>
      <Suspense fallback={<><Skeleton className="mb-6 h-48" /><div className="grid gap-6 lg:grid-cols-3"><Skeleton className="h-96 lg:col-span-2" /><Skeleton className="h-96" /></div></>}>
        <TradeDetailView params={props.params} />
      </Suspense>
    </>
  );
}
