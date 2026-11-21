import { BookMarked } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { StatTile } from "@/components/shared/hero";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ConceptStatus } from "@/features/learning/components/concept-status";
import { NewConcept } from "@/features/learning/components/new-concept";
import { listConcepts } from "@/features/learning/service";
import { cn } from "@/lib/utils";

export const metadata = { title: "Aprenentatge" };

async function Library() {
  const concepts = await listConcepts();
  const mastered = concepts.filter((c) => c.status === "mastered").length;
  const learning = concepts.filter((c) => c.status === "learning").length;
  const groups = [...new Set(concepts.map((c) => c.category))];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Conceptes" value={String(concepts.length)} tone="primary" />
        <StatTile label="Dominats" value={String(mastered)} tone="profit" />
        <StatTile label="Aprenent" value={String(learning)} tone="warning" />
        <div className="rounded-xl border border-border bg-bg/60 px-4 py-3">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-dim">Progrés</p>
          <p className="num mt-1 text-lg font-semibold text-fg">{concepts.length ? Math.round((mastered / concepts.length) * 100) : 0} %</p>
          <Progress className="mt-1.5" value={concepts.length ? ((mastered + learning * 0.5) / concepts.length) * 100 : 0} tone="profit" label="Progrés de la biblioteca" />
        </div>
      </div>
      {groups.map((g) => (
        <section key={g}>
          <h2 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-accent"><BookMarked className="size-3.5" /> {g}</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {concepts.filter((c) => c.category === g).map((c) => (
              <Card key={c.id} interactive className={cn("relative p-4", c.status === "mastered" && "border-profit/25")}>
                <Link href={`/aprenentatge/conceptes/${c.slug}`} className="after:absolute after:inset-0">
                  <h3 className="font-medium text-fg">{c.title}</h3>
                </Link>
                {c.summary && <p className="mt-1 text-sm text-muted">{c.summary}</p>}
                <div className="relative z-10 mt-3"><ConceptStatus id={c.id} status={c.status} /></div>
              </Card>
            ))}
          </div>
        </section>
      ))}
      <NewConcept categories={groups} />
    </div>
  );
}

export default function LearningPage() {
  return <Suspense fallback={<Skeleton className="h-[600px]" />}><Library /></Suspense>;
}
