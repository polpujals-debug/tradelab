"use client";
import { Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createConceptAction } from "../actions";

export function NewConcept({ categories }: { categories: string[] }) {
  const [title, setTitle] = useState("");
  const [cat, setCat] = useState(categories[0] ?? "Fonaments");
  const [pending, start] = useTransition();
  return (
    <form className="flex flex-wrap gap-2 rounded-2xl border border-dashed border-border p-3"
      onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await createConceptAction(title, cat); if (r.ok) { toast.success(r.message); setTitle(""); } else toast.error(r.message); }); }}>
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nou concepte (ex.: Fibonacci)" aria-label="Títol del concepte" className="min-w-48 flex-1" />
      <Input value={cat} onChange={(e) => setCat(e.target.value)} list="concept-cats" aria-label="Categoria" className="w-40" />
      <datalist id="concept-cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
      <Button type="submit" variant="secondary" disabled={pending || title.trim().length < 3}><Plus /> Afegir</Button>
    </form>
  );
}
