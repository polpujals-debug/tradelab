import type { LucideIcon } from "lucide-react";
import { CountUp, type CountKind } from "@/components/shared/count-up";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Tone = "profit" | "loss" | "warning" | "primary" | "neutral";
const tones: Record<Tone, string> = { profit: "text-profit", loss: "text-loss", warning: "text-warning", primary: "text-accent", neutral: "text-fg" };

export function Kpi({ label, value, kind, tone = "neutral", hint, icon: Icon, currency, empty }: {
  label: string; value: number | null; kind: CountKind; tone?: Tone; hint?: React.ReactNode; icon?: LucideIcon; currency?: string; empty?: string;
}) {
  return (
    <Card interactive className="px-4 py-3.5">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[10px] font-medium uppercase tracking-[0.16em] text-dim">{label}</p>
        {Icon && <Icon className="size-3.5 shrink-0 text-faint" />}
      </div>
      <p className={cn("num mt-1.5 truncate text-xl font-semibold sm:text-[22px]", value === null ? "text-dim" : tones[tone])}>
        {value === null ? (empty ?? "—") : <CountUp value={value} kind={kind} currency={currency} />}
      </p>
      {hint && <p className="mt-0.5 truncate text-[11px] text-dim">{hint}</p>}
    </Card>
  );
}

export const toneFor = (v: number | null | undefined): Tone => (v == null || v === 0 ? "neutral" : v > 0 ? "profit" : "loss");
