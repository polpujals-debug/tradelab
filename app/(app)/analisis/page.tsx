import { AlarmClock, ChartCandlestick, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { Hero, StatTile } from "@/components/shared/hero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AnalysisFilters } from "@/features/analyses/components/analysis-filters";
import { OutcomeBadge } from "@/features/analyses/components/outcome-badge";
import { analysisListSchema, TIMEFRAMES } from "@/features/analyses/schemas";
import { listAnalyses } from "@/features/analyses/service";
import { listAssets } from "@/features/settings/queries";
import { BiasBadge } from "@/features/trades/components/badges";
import { formatDateTime, formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata = { title: "Anàlisis" };
type SP = PageProps<"/analisis">["searchParams"];

async function Stats() {
  const all = await listAnalyses({ limit: 200 });
  const reviewed = all.filter((a) => a.outcome !== "pending");
  const hits = reviewed.filter((a) => a.outcome === "fulfilled").length + reviewed.filter((a) => a.outcome === "partial").length * 0.5;
  const due = all.filter((a) => a.review_due).length;
  return (
    <>
      <StatTile label="Anàlisis" value={String(all.length)} tone="primary" hint={`${all.filter((a) => a.source === "claude").length} de Claude`} />
      <StatTile label="Encert dels escenaris" value={formatPct(reviewed.length ? (hits / reviewed.length) * 100 : null, { decimals: 0 })} tone="profit" hint={`${reviewed.length} revisades (parcial = ½)`} />
      <StatTile label="Per revisar" value={String(due)} tone={due ? "warning" : "neutral"} hint="escenaris vençuts" />
      <StatTile label="Biaix més freqüent" value={(() => { const c = { bullish: 0, bearish: 0, neutral: 0 }; all.forEach((a) => c[a.bias]++); const top = (Object.entries(c) as [keyof typeof c, number][]).sort((a, b) => b[1] - a[1])[0]; return top ? { bullish: "Alcista", bearish: "Baixista", neutral: "Neutral" }[top[0]] : "—"; })()} tone="cyan" />
    </>
  );
}

async function Filters() {
  const assets = await listAssets();
  return <AnalysisFilters assets={assets.map((a) => a.symbol)} timeframes={TIMEFRAMES} />;
}

async function GalleryGrid({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const q = analysisListSchema.safeParse(Object.fromEntries(Object.entries(sp).filter(([, v]) => typeof v === "string" && v)));
  const items = await listAnalyses(q.success ? q.data : {});
  if (!items.length) {
    return <EmptyState icon={ChartCandlestick} title="Cap anàlisi amb aquests filtres" description="Demana a Claude que analitzi un gràfic a TradingView: arribarà aquí automàticament." />;
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((a) => {
        const img = a.images[0];
        return (
          <Link key={a.id} href={`/analisis/${a.id}`} className="group">
            <Card interactive className={cn("h-full overflow-hidden", a.review_due && "border-warning/40")}>
              <div className="relative aspect-video overflow-hidden bg-bg">
                {img ? <img src={img.thumb_url ?? img.url} alt={`Captura ${a.asset}`} loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                  : <div className="grid size-full place-items-center text-xs text-dim">Sense captura</div>}
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute left-3 top-3 flex gap-1.5"><BiasBadge bias={a.bias} />{a.source === "claude" && <Badge tone="cyan"><Sparkles /> Claude</Badge>}</div>
                <div className="absolute bottom-2 left-3 flex gap-1">{a.timeframes.map((t) => <span key={t} className="rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-fg">{t}</span>)}</div>
                {a.review_due && <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-warning px-2 py-0.5 text-[10px] font-semibold text-black"><AlarmClock className="size-3" /> Revisar</span>}
              </div>
              <div className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium leading-snug text-fg">{a.title}</p>
                  <OutcomeBadge outcome={a.outcome} />
                </div>
                {a.scenario && <p className="line-clamp-2 text-sm text-muted">{a.scenario}</p>}
                <p className="text-[11px] text-dim">{a.asset} · {formatDateTime(a.analyzed_at)}</p>
              </div>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

export default function AnalysesPage(props: PageProps<"/analisis">) {
  return (
    <>
      <Hero icon={ChartCandlestick} eyebrow="Claude + TradingView" title="Anàlisis de gràfics" description="Cada anàlisi amb la captura, l'explicació, els nivells i el seguiment de l'escenari."
        actions={<Button variant="secondary" asChild><Link href="/analisis/nova"><Plus /> Anàlisi manual</Link></Button>}>
        <Suspense fallback={<>{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[74px]" />)}</>}><Stats /></Suspense>
      </Hero>
      <Suspense fallback={<Skeleton className="mb-4 h-9" />}><Filters /></Suspense>
      <Suspense fallback={<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-80" />)}</div>}>
        <GalleryGrid searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
