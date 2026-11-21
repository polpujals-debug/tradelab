import { ArrowLeft, BookOpenText, Layers, Plus, Sparkles, Target } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Gallery } from "@/components/shared/gallery";
import { PanelTitle } from "@/components/shared/hero";
import { Markdown } from "@/components/shared/markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FollowUp } from "@/features/analyses/components/follow-up";
import { OutcomeBadge } from "@/features/analyses/components/outcome-badge";
import { getAnalysis } from "@/features/analyses/service";
import { BiasBadge, StatusBadge } from "@/features/trades/components/badges";
import { formatDateTime, formatPrice } from "@/lib/format";
import { L } from "@/lib/i18n/ca";
import type { TradeStatus } from "@/lib/supabase/types";

export const metadata = { title: "Anàlisi" };

async function Detail({ params }: { params: PageProps<"/analisis/[id]">["params"] }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const a = await getAnalysis(id);
  if (!a) notFound();
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <div className="space-y-6">
        {a.images.length ? (
          <Gallery large items={a.images.slice(0, 1).map((m) => ({ id: m.id, url: m.url, thumb: m.thumb_url, caption: m.caption }))} />
        ) : <Card className="grid aspect-video place-items-center text-sm text-dim">Sense captura</Card>}
        {a.images.length > 1 && <Gallery items={a.images.slice(1).map((m) => ({ id: m.id, url: m.url, thumb: m.thumb_url, caption: m.caption }))} />}
        <Card>
          <CardContent className="space-y-4">
            <PanelTitle icon={Sparkles} tone="cyan">Explicació{a.source === "claude" ? " de Claude" : ""}</PanelTitle>
            <Markdown>{a.content_md}</Markdown>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="border-primary/25">
          <CardContent className="space-y-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-accent">{a.asset} · {formatDateTime(a.analyzed_at)}</p>
              <h1 className="mt-1 text-xl font-semibold tracking-tight text-fg">{a.title}</h1>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <BiasBadge bias={a.bias} />
              {a.timeframes.map((t) => <Badge key={t}>{t}</Badge>)}
              <OutcomeBadge outcome={a.outcome} />
              <Badge tone="cyan">{L.source[a.source]}</Badge>
            </div>
            {a.scenario && (
              <div className="rounded-xl border border-primary/30 bg-primary/[0.07] p-3">
                <p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent"><Target className="size-3" /> Escenari</p>
                <p className="text-sm text-fg">{a.scenario}</p>
              </div>
            )}
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-dim"><Layers className="size-3" /> Nivells clau</p>
              <div className="flex flex-wrap gap-1.5">
                {a.levels.resistances.map((p) => <span key={`r${p}`} className="num rounded-lg border border-loss/30 bg-loss/10 px-2 py-1 text-xs text-loss">R {formatPrice(p)}</span>)}
                {a.levels.ma50 != null && <span className="num rounded-lg border border-primary/40 bg-primary/10 px-2 py-1 text-xs text-accent">MA50 {formatPrice(a.levels.ma50)}</span>}
                {a.levels.supports.map((p) => <span key={`s${p}`} className="num rounded-lg border border-profit/30 bg-profit/10 px-2 py-1 text-xs text-profit">S {formatPrice(p)}</span>)}
                {!a.levels.resistances.length && !a.levels.supports.length && a.levels.ma50 == null && <span className="text-xs text-dim">—</span>}
              </div>
            </div>
          </CardContent>
        </Card>

        <FollowUp id={a.id} outcome={a.outcome} reviewAt={a.review_at} notes={a.my_notes} questions={a.questions} due={a.review_due} />

        <Card>
          <CardContent className="space-y-3">
            <PanelTitle icon={BookOpenText}>Operacions vinculades</PanelTitle>
            {a.trades.length === 0 ? <p className="text-sm text-dim">Cap operació vinculada.</p> : (
              <ul className="space-y-2">
                {a.trades.map((t) => (
                  <li key={t.id}><Link href={`/diari/${t.id}`} className="flex items-center justify-between rounded-xl border border-border p-2.5 text-sm hover:border-primary/50">
                    <span className="text-fg">{L.direction[t.direction as "long" | "short"]} · {formatDateTime(t.created_at)}</span><StatusBadge status={t.status as TradeStatus} />
                  </Link></li>
                ))}
              </ul>
            )}
            <Button variant="secondary" size="sm" asChild>
              <Link href={`/diari/nova?analysis=${a.id}&asset=${encodeURIComponent(a.asset ?? "")}&status=planned`}><Plus /> Planificar operació des d&apos;aquí</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AnalysisPage(props: PageProps<"/analisis/[id]">) {
  return (
    <>
      <Link href="/analisis" className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted hover:text-fg"><ArrowLeft className="size-3.5" /> Anàlisis</Link>
      <Suspense fallback={<div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]"><Skeleton className="aspect-video" /><Skeleton className="h-[520px]" /></div>}>
        <Detail params={props.params} />
      </Suspense>
    </>
  );
}
