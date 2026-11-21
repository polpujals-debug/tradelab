import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ConceptBody, ConceptExamples } from "@/features/learning/components/concept-editor";
import { ConceptStatus } from "@/features/learning/components/concept-status";
import { getConcept } from "@/features/learning/service";
import { db, must } from "@/lib/supabase/server";

export const metadata = { title: "Concepte" };

async function Concept({ params }: { params: PageProps<"/aprenentatge/conceptes/[slug]">["params"] }) {
  const { slug } = await params;
  const [c, analyses] = await Promise.all([getConcept(slug), db().from("analyses").select("id, title").order("analyzed_at", { ascending: false }).limit(50)]);
  if (!c) notFound();
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-accent">{c.category}</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-fg">{c.title}</h2>
          {c.summary && <p className="mt-1 text-sm text-muted">{c.summary}</p>}
        </div>
        <ConceptStatus id={c.id} status={c.status} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <ConceptBody id={c.id} content={c.content_md} />
        <ConceptExamples conceptId={c.id} examples={c.examples.map((e) => ({ id: e.id, note: e.note, analysis: e.analysis ? { id: e.analysis.id, title: e.analysis.title } : null, image: e.image }))} analyses={must(analyses, "Anàlisis")} />
      </div>
    </div>
  );
}

export default function ConceptPage(props: PageProps<"/aprenentatge/conceptes/[slug]">) {
  return (
    <>
      <Link href="/aprenentatge" className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted hover:text-fg"><ArrowLeft className="size-3.5" /> Biblioteca</Link>
      <Suspense fallback={<Skeleton className="h-[500px]" />}><Concept params={props.params} /></Suspense>
    </>
  );
}
