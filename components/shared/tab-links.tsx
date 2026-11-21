"use client";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { cn } from "@/lib/utils";

export interface TabLinkItem { href: string; label: React.ReactNode; active: boolean; ariaLabel?: string }

/**
 * Pestanyes de navegació amb resposta immediata: l'opció triada es marca al moment
 * i mostra un indicador mentre arriben les dades del servidor.
 */
export function TabLinks({ items, ariaLabel, variant = "tabs" }: { items: TabLinkItem[]; ariaLabel: string; variant?: "tabs" | "icons" }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const current = items.find((i) => i.active)?.href ?? null;
  const [selected, setSelected] = useOptimistic(current);

  return (
    <nav aria-label={ariaLabel} aria-busy={pending} className={cn("inline-flex rounded-xl border border-border bg-bg/60", variant === "tabs" && "p-1")}>
      {items.map((item) => {
        const on = variant === "tabs" && item.href === selected;
        return (
          <a
            key={item.href}
            href={item.href}
            aria-label={item.ariaLabel}
            aria-current={on ? "page" : undefined}
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
              e.preventDefault();
              start(() => {
                setSelected(item.href);
                router.push(item.href, { scroll: false });
              });
            }}
            className={cn(
              "inline-flex items-center gap-1.5 text-xs font-medium transition-colors",
              variant === "tabs" ? "rounded-lg px-3 py-1.5" : "grid size-9 place-items-center",
              on ? "bg-primary/15 text-accent shadow-[inset_0_0_0_1px_rgb(59_130_246/0.35)]" : "text-muted hover:text-fg",
            )}
          >
            {item.label}
            {pending && on && <Loader2 className="size-3 animate-spin" aria-hidden />}
          </a>
        );
      })}
    </nav>
  );
}

