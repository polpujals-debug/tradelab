import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Period } from "@/features/performance/service";

const LABELS: Record<Period, string> = { day: "Dia", week: "Setmana", month: "Mes", all: "Tot" };
const PARAM: Record<Period, string> = { day: "dia", week: "setmana", month: "mes", all: "tot" };
export const periodFromParam = (v: unknown): Period =>
  (Object.entries(PARAM).find(([, p]) => p === v)?.[0] as Period | undefined) ?? "month";

export function PeriodSelect({ value, extra = "" }: { value: Period; extra?: string }) {
  return (
    <nav aria-label="Període" className="inline-flex rounded-xl border border-border bg-bg/60 p-1">
      {(Object.keys(LABELS) as Period[]).map((p) => (
        <Link
          key={p}
          href={`/?periode=${PARAM[p]}${extra}`}
          scroll={false}
          aria-current={p === value ? "page" : undefined}
          className={cn("rounded-lg px-3 py-1.5 text-xs font-medium transition-colors", p === value ? "bg-primary/15 text-accent shadow-[inset_0_0_0_1px_rgb(59_130_246/0.35)]" : "text-muted hover:text-fg")}
        >
          {LABELS[p]}
        </Link>
      ))}
    </nav>
  );
}
