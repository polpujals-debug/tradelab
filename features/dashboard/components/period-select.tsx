import { TabLinks } from "@/components/shared/tab-links";
import type { Period } from "@/features/performance/service";

const LABELS: Record<Period, string> = { day: "Dia", week: "Setmana", month: "Mes", all: "Tot" };
const PARAM: Record<Period, string> = { day: "dia", week: "setmana", month: "mes", all: "tot" };
export const periodFromParam = (v: unknown): Period =>
  (Object.entries(PARAM).find(([, p]) => p === v)?.[0] as Period | undefined) ?? "month";

export function PeriodSelect({ value, extra = "" }: { value: Period; extra?: string }) {
  return (
    <TabLinks
      ariaLabel="Període"
      items={(Object.keys(LABELS) as Period[]).map((p) => ({ href: `/?periode=${PARAM[p]}${extra}`, label: LABELS[p], active: p === value }))}
    />
  );
}
