"use client";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { PanelTitle } from "@/components/shared/hero";
import { Markdown } from "@/components/shared/markdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { ImageIcon } from "lucide-react";
import { addConceptExampleAction, removeConceptExampleAction, saveConceptAction } from "../actions";

export function ConceptBody({ id, content }: { id: string; content: string }) {
  const [edit, setEdit] = useState(false);
  const [md, setMd] = useState(content);
  const [pending, start] = useTransition();
  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex justify-end">
          {edit ? (
            <Button size="sm" disabled={pending} onClick={() => start(async () => { const r = await saveConceptAction(id, md); if (r.ok) { toast.success(r.message); setEdit(false); } else toast.error(r.message); })}><Check /> Desar</Button>
          ) : <Button size="sm" variant="secondary" onClick={() => setEdit(true)}><Pencil /> Editar</Button>}
        </div>
        {edit ? <Textarea value={md} onChange={(e) => setMd(e.target.value)} className="num min-h-80 text-[13px]" aria-label="Contingut en Markdown" /> : <Markdown>{md || "_Encara sense contingut._"}</Markdown>}
      </CardContent>
    </Card>
  );
}

interface Example { id: string; note: string | null; analysis: { id: string; title: string } | null; image: { url: string; thumb_url: string | null } | null }

export function ConceptExamples({ conceptId, examples, analyses }: { conceptId: string; examples: Example[]; analyses: { id: string; title: string }[] }) {
  const [sel, setSel] = useState("");
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  return (
    <Card>
      <CardContent className="space-y-4">
        <PanelTitle icon={ImageIcon}>Exemples reals</PanelTitle>
        {examples.length === 0 && <p className="text-sm text-dim">Encara no hi ha exemples. Afegeix-ne un des d&apos;una anàlisi teva.</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          {examples.map((e) => (
            <div key={e.id} className="group relative overflow-hidden rounded-xl border border-border bg-bg">
              {e.image && <img src={e.image.thumb_url ?? e.image.url} alt={e.analysis?.title ?? "Exemple"} className="aspect-video w-full object-cover" loading="lazy" />}
              <div className="p-3">
                {e.analysis && <Link href={`/analisis/${e.analysis.id}`} className="text-sm font-medium text-fg hover:text-accent">{e.analysis.title}</Link>}
                {e.note && <p className="mt-1 text-xs text-muted">{e.note}</p>}
              </div>
              <button type="button" aria-label="Treure l'exemple" disabled={pending} onClick={() => start(async () => { await removeConceptExampleAction(e.id); })}
                className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-black/70 text-muted opacity-0 transition-opacity hover:text-loss group-hover:opacity-100 focus:opacity-100 cursor-pointer">
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
        <form className="flex flex-wrap gap-2" onSubmit={(ev) => { ev.preventDefault(); start(async () => { const r = await addConceptExampleAction(conceptId, sel, note); if (r.ok) { setSel(""); setNote(""); toast.success(r.message); } else toast.error(r.message); }); }}>
          <NativeSelect value={sel} onChange={(e) => setSel(e.target.value)} aria-label="Anàlisi" className="min-w-56 flex-1">
            <option value="">Tria una anàlisi…</option>
            {analyses.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
          </NativeSelect>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Què s'hi veu (opcional)" aria-label="Nota" className="min-w-48 flex-1" />
          <Button type="submit" variant="secondary" disabled={!sel || pending}><Plus /> Afegir</Button>
        </form>
      </CardContent>
    </Card>
  );
}
