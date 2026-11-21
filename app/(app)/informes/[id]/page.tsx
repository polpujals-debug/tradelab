import { ArrowLeft, Eye } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Gallery } from "@/components/shared/gallery";
import { Markdown } from "@/components/shared/markdown";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ReadToggle } from "@/features/market-reports/components/read-controls";
import { getMarketReport } from "@/features/market-reports/service";
import { BiasBadge } from "@/features/trades/components/badges";
import { formatDate, formatDateTime } from "@/lib/format";
import { L } from "@/lib/i18n/ca";

export const metadata = { title: "Informe de mercat" };

async function Report({ params }: { params: PageProps<"/informes/[id]">["params"] }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const r = await getMarketReport(id);
  if (!r) notFound();
  return (
    <article className="mx-auto max-w-3xl">
      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="cyan">{L.reportType[r.type]}</Badge>
          <span className="text-xs text-dim">{formatDate(r.report_date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · publicat {formatDateTime(r.created_at)}</span>
        </div>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-fg sm:text-3xl">{r.title}</h1>
        {r.summary && <p className="mt-2 text-base text-muted">{r.summary}</p>}
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-dim">
          {r.btc_bias && <>BTC <BiasBadge bias={r.btc_bias} /></>}
          {r.eth_bias && <>ETH <BiasBadge bias={r.eth_bias} /></>}
          {r.watchlist.length > 0 && <span className="flex items-center gap-1"><Eye className="size-3.5" /> {r.watchlist.join(" · ")}</span>}
          <span className="ml-auto"><ReadToggle id={r.id} isRead={r.is_read} /></span>
        </div>
      </header>
      {r.images.length > 0 && <Gallery className="mb-6" items={r.images.map((m) => ({ id: m.id, url: m.url, thumb: m.thumb_url, caption: m.caption }))} />}
      <Card>
        <CardContent className="p-5 sm:p-8">
          <Markdown className="text-[15px]">{r.content_md}</Markdown>
        </CardContent>
      </Card>
    </article>
  );
}

export default function ReportPage(props: PageProps<"/informes/[id]">) {
  return (
    <>
      <Link href="/informes" className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted hover:text-fg"><ArrowLeft className="size-3.5" /> Informes</Link>
      <Suspense fallback={<div className="mx-auto max-w-3xl space-y-4"><Skeleton className="h-24" /><Skeleton className="h-[600px]" /></div>}>
        <Report params={props.params} />
      </Suspense>
    </>
  );
}
