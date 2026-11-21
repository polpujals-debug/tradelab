import { AlertOctagon, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { PanelTitle, StatTile } from "@/components/shared/hero";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { errorReview } from "@/features/learning/service";
import { formatMoney, formatPct, formatR } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata = { title: "Revisió d'errors" };

async function Content() {
  const r = await errorReview();
  if (!r.errors.length) return <EmptyState icon={AlertOctagon} title="Cap error etiquetat" description="Quan etiquetis errors a les operacions (FOMO, moure l'SL…), veuràs aquí quant et costen." />;
  const maxAbs = Math.max(1, ...r.errors.map((e) => Math.abs(e.netPnl)));
  const maxCount = Math.max(...r.errors.map((e) => e.trades));
  const worst = r.errors[0];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Cost total dels errors" value={formatMoney(r.totalCost, { sign: true })} tone="loss" hint="P&L net de les etiquetes en negatiu" />
        <StatTile label="Error més car" value={worst.name} tone="loss" hint={formatMoney(worst.netPnl, { sign: true })} />
        <StatTile label="Mitjana amb errors" value={formatMoney(r.avgWithErrors, { sign: true })} tone={(r.avgWithErrors ?? 0) >= 0 ? "profit" : "loss"} hint={`${r.tradesWithErrors} operacions`} />
        <StatTile label="Mitjana sense errors" value={formatMoney(r.avgClean, { sign: true })} tone={(r.avgClean ?? 0) >= 0 ? "profit" : "loss"} hint={`${r.tradesClean} operacions`} />
      </div>

      <Card>
        <CardContent className="space-y-4">
          <PanelTitle icon={AlertOctagon} tone="loss">Errors per cost</PanelTitle>
          <p className="text-xs text-muted">La barra mostra el P&amp;L net de les operacions amb cada etiqueta; els punts, quantes vegades l&apos;has comès.</p>
          <ul className="space-y-4">
            {r.errors.map((e) => (
              <li key={e.name}>
                <Link href={`/diari?tag=${encodeURIComponent(e.name)}`} className="group block">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium text-fg group-hover:text-accent">{e.name}</span>
                    <span className="flex items-center gap-3 text-xs text-muted">
                      <span className="num">{e.trades}× · encert {formatPct(e.trades ? (e.wins / e.trades) * 100 : null, { decimals: 0 })} · {formatR(e.avgR)}</span>
                      <span className={cn("num text-sm font-semibold", e.netPnl < 0 ? "text-loss" : "text-profit")}>{formatMoney(e.netPnl, { sign: true })}</span>
                      <ArrowRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
                      <div className={cn("h-full rounded-full", e.netPnl < 0 ? "bg-loss/80" : "bg-profit/70")} style={{ width: `${(Math.abs(e.netPnl) / maxAbs) * 100}%` }} />
                    </div>
                    <div className="flex w-24 gap-0.5" aria-hidden>
                      {Array.from({ length: maxCount }, (_, i) => <span key={i} className={cn("h-2 flex-1 rounded-sm", i < e.trades ? "bg-warning/80" : "bg-white/5")} />)}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ErrorsPage() {
  return <Suspense fallback={<Skeleton className="h-[500px]" />}><Content /></Suspense>;
}
