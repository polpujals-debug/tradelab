import type { LucideIcon } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "primary" | "profit" | "loss" | "warning" | "cyan" | "neutral";
const toneText: Record<Tone, string> = {
  primary: "text-accent", profit: "text-profit", loss: "text-loss", warning: "text-warning", cyan: "text-cyan", neutral: "text-fg",
};
const toneBorder: Record<Tone, string> = {
  primary: "border-primary/35", profit: "border-profit/30", loss: "border-loss/30", warning: "border-warning/30", cyan: "border-cyan/30", neutral: "border-border",
};

/** Capçalera de secció tipus "consola": icona, etiqueta, títol i fila de KPIs. */
export function Hero({ icon: Icon, eyebrow, title, description, actions, children, className }: {
  icon: LucideIcon; eyebrow: string; title: string; description?: React.ReactNode; actions?: React.ReactNode; children?: React.ReactNode; className?: string;
}) {
  return (
    <section className={cn("relative mb-6 overflow-hidden rounded-2xl border border-primary/20 bg-surface/70 p-5 sm:p-6", className)}>
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgb(30_41_59/0.35)_1px,transparent_1px)] bg-[size:48px_100%] [mask-image:linear-gradient(to_bottom,black,transparent_70%)]" />
      <div aria-hidden className="pointer-events-none absolute -top-24 left-1/4 h-48 w-1/2 rounded-full bg-primary/15 blur-3xl" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl sm:size-12 sm:rounded-2xl border border-primary/35 bg-primary/10 shadow-[0_0_24px_-6px_rgb(59_130_246/0.6)]">
            <Icon className="size-5 text-accent" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-accent">{eyebrow}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-fg sm:text-[28px]">{title}</h1>
            {description && <p className="mt-1 text-sm text-muted">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children && <div className="relative mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">{children}</div>}
    </section>
  );
}

export function StatTile({ label, value, tone = "neutral", hint, className }: { label: string; value: React.ReactNode; tone?: Tone; hint?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl border bg-bg/60 px-4 py-3", toneBorder[tone], className)}>
      <p className="truncate text-[10px] font-medium uppercase tracking-[0.18em] text-dim">{label}</p>
      <p className={cn("num mt-1 truncate text-lg font-semibold sm:text-xl", toneText[tone])}>{value}</p>
      {hint && <p className="mt-0.5 truncate text-[11px] text-dim">{hint}</p>}
    </div>
  );
}

/** Títol petit de panell: icona + text en majúscules espaiades. */
export function PanelTitle({ icon: Icon, children, tone = "primary" }: { icon: LucideIcon; children: React.ReactNode; tone?: Tone }) {
  return (
    <h2 className={cn("flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em]", toneText[tone])}>
      <Icon className="size-3.5" />
      {children}
    </h2>
  );
}
