"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { L } from "@/lib/i18n/ca";
import { cn } from "@/lib/utils";
import { setConceptStatusAction } from "../actions";

type S = "pending" | "learning" | "mastered";
const cls: Record<S, string> = {
  pending: "border-border text-muted",
  learning: "border-warning/40 bg-warning/10 text-warning",
  mastered: "border-profit/40 bg-profit/10 text-profit",
};

export function ConceptStatus({ id, status }: { id: string; status: S }) {
  const [pending, start] = useTransition();
  return (
    <div role="group" aria-label="Estat del concepte" className="inline-flex gap-1">
      {(["pending", "learning", "mastered"] as const).map((s) => (
        <button key={s} type="button" disabled={pending} aria-pressed={status === s}
          onClick={(e) => { e.preventDefault(); start(async () => { const r = await setConceptStatusAction(id, s); if (!r.ok) toast.error(r.message); }); }}
          className={cn("rounded-full border px-2.5 py-0.5 text-[11px] transition-colors cursor-pointer", status === s ? cls[s] : "border-transparent text-dim hover:text-fg")}>
          {L.conceptStatus[s]}
        </button>
      ))}
    </div>
  );
}
