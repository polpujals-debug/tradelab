import { Newspaper } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { Hero, StatTile } from "@/components/shared/hero";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MarkAllRead } from "@/features/market-reports/components/read-controls";
import { listMarketReports } from "@/features/market-reports/service";
import { BiasBadge } from "@/features/trades/components/badges";
import { formatDate, formatRelative } from "@/lib/format";
import { L } from "@/lib/i18n/ca";
import { cn } from "@/lib/utils";

export const metadata = { title: "Informes de mercat" };
type SP = PageProps<"/informes">["searchParams"];

const FILTERS = [
  { key: "", label: "Tots" }, { key: "no-llegits", label: "No llegits" },
  { key: "daily", label: "Diaris" }, { key: "weekly", label: "Setmanals" }, { key: "adhoc", label: "Ad hoc" },
] as const;

async function Content({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const f = typeof sp.filtre === "string" ? sp.filtre : "";
  const [all, reports] = await Promise.all([
    listMarketReports({ limit: 100 }),
    listMarketReports({ limit: 100, unread: f === "no-llegits", type: f === "daily" || f === "weekly" || f === "adhoc" ? f : undefined }),
  ]);
  const unread = all.filter((r) => !r.is_read).length;
  const latest = all[0];
  return (
    <>
      <Hero icon={Newspaper} eyebrow="Tasca programada" title="Informes de mercat" description="Els informes diaris i setmanals que Claude publica automàticament."
        actions={unread > 0 ? <MarkAllRead /> : undefined}>
        <StatTile label="No llegits" value={String(unread)} tone={unread ? "primary" : "neutral"} />
        <StatTile label="Total" value={String(all.length)} tone="neutral" hint={`${all.filter((r) => r.type === "weekly").length} setmanals`} />
        <StatTile label="Darrer informe" value={latest ? formatRelative(latest.created_at) : "—"} tone="cyan" hint={latest ? L.reportType[latest.type] : undefined} />
        <StatTile label="Biaix BTC actual" value={latest?.btc_bias ? L.bias[latest.btc_bias] : "—"} tone={latest?.btc_bias === "bullish" ? "profit" : latest?.btc_bias === "bearish" ? "loss" : "neutral"} />
      </Hero>
      <nav aria-label="Filtres" className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {FILTERS.map((x) => (
          <Link key={x.key} href={x.key ? `/informes?filtre=${x.key}` : "/informes"} aria-current={f === x.key ? "page" : undefined}
            className={cn("shrink-0 rounded-full border px-3 py-1.5 text-xs", f === x.key ? "border-primary/50 bg-primary/15 text-accent" : "border-border text-muted hover:text-fg")}>
            {x.label}{x.key === "no-llegits" && unread > 0 ? ` (${unread})` : ""}
          </Link>
        ))}
      </nav>
      {reports.length === 0 ? (
        <EmptyState icon={Newspaper} title="Cap informe aquí" description="Quan la tasca programada publiqui un informe, apareixerà en aquesta llista." />
      ) : (
        <ol className="relative space-y-3 border-l border-border pl-5 sm:ml-2">
          {reports.map((r) => (
            <li key={r.id} className="relative">
              <span className={cn("absolute -left-[26px] top-5 size-3 rounded-full border-2 border-bg", r.is_read ? "bg-border-strong" : "bg-primary shadow-[0_0_10px_rgb(59_130_246)]")} aria-hidden />
              <Link href={`/informes/${r.id}`}>
                <Card interactive className={cn("p-4 sm:p-5", !r.is_read && "border-primary/35")}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] text-dim">{formatDate(r.report_date, { weekday: "long", day: "numeric", month: "long" })}</p>
                      <p className={cn("mt-0.5 font-medium", r.is_read ? "text-muted" : "text-fg")}>{r.title}</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {!r.is_read && <Badge tone="primary">Nou</Badge>}
                      <Badge tone="cyan">{L.reportType[r.type]}</Badge>
                    </div>
                  </div>
                  {r.summary && <p className="mt-2 text-sm text-muted">{r.summary}</p>}
                  <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] text-dim">
                    {r.btc_bias && <><span>BTC</span><BiasBadge bias={r.btc_bias} /></>}
                    {r.eth_bias && <><span className="ml-1">ETH</span><BiasBadge bias={r.eth_bias} /></>}
                    {r.watchlist.length > 0 && <span className="ml-1">· Vigilar: {r.watchlist.join(", ")}</span>}
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}

export default function ReportsPage(props: PageProps<"/informes">) {
  return (
    <Suspense fallback={<><Skeleton className="mb-6 h-56" /><Skeleton className="h-96" /></>}>
      <Content searchParams={props.searchParams} />
    </Suspense>
  );
}
