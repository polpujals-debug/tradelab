"use client";
import { CalendarClock, CheckCircle2, CircleDashed, Loader2, MessageSquareText, MinusCircle, XCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { PanelTitle } from "@/components/shared/hero";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Enum } from "@/lib/supabase/types";
import { updateAnalysisAction } from "../actions";

const OPTIONS = [
  { v: "fulfilled", label: "Complert", icon: CheckCircle2, cls: "border-profit/50 bg-profit/15 text-profit" },
  { v: "partial", label: "Parcial", icon: MinusCircle, cls: "border-warning/50 bg-warning/15 text-warning" },
  { v: "failed", label: "Fallat", icon: XCircle, cls: "border-loss/50 bg-loss/15 text-loss" },
  { v: "pending", label: "Pendent", icon: CircleDashed, cls: "border-border-strong bg-white/5 text-fg" },
] as const;

export function FollowUp({ id, outcome, reviewAt, notes, questions, due }: { id: string; outcome: Enum<"analysis_outcome">; reviewAt: string | null; notes: string | null; questions: string | null; due: boolean }) {
  const [pending, start] = useTransition();
  const [n, setN] = useState(notes ?? "");
  const [q, setQ] = useState(questions ?? "");
  const save = (patch: object) => start(async () => {
    const r = await updateAnalysisAction(id, patch);
    if (r.ok) toast.success(r.message); else toast.error(r.message);
  });
  return (
    <>
      <Card className={cn(due && "border-warning/50")}>
        <CardContent className="space-y-4">
          <PanelTitle icon={CalendarClock} tone={due ? "warning" : "primary"}>Seguiment de l&apos;escenari</PanelTitle>
          {due && <p className="text-xs text-warning">Ja toca revisar-la: s&apos;ha complert l&apos;escenari?</p>}
          <div className="grid grid-cols-2 gap-2">
            {OPTIONS.map((o) => (
              <button key={o.v} type="button" disabled={pending} aria-pressed={outcome === o.v} onClick={() => save({ outcome: o.v })}
                className={cn("flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors cursor-pointer", outcome === o.v ? o.cls : "border-border text-muted hover:text-fg")}>
                <o.icon className="size-3.5" /> {o.label}
              </button>
            ))}
          </div>
          <Field label="Data de revisió" htmlFor="review_at">
            <Input id="review_at" type="date" defaultValue={reviewAt ?? ""} onChange={(e) => e.target.value && save({ review_at: e.target.value })} />
          </Field>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-4">
          <PanelTitle icon={MessageSquareText}>Les meves notes</PanelTitle>
          <Field label="Notes" htmlFor="my_notes"><Textarea id="my_notes" value={n} onChange={(e) => setN(e.target.value)} placeholder="Què n'he après, què no veia…" /></Field>
          <Field label="Preguntes per a Claude" htmlFor="questions"><Textarea id="questions" value={q} onChange={(e) => setQ(e.target.value)} className="min-h-16" placeholder="Per què la MA50 aquí no fa de suport?" /></Field>
          <Button size="sm" disabled={pending} onClick={() => save({ my_notes: n || null, questions: q || null })}>{pending && <Loader2 className="animate-spin" />} Desar notes</Button>
        </CardContent>
      </Card>
    </>
  );
}
