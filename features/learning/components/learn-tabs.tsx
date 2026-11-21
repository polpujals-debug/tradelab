"use client";
import { AlertOctagon, BookMarked, Dumbbell, Flag } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/aprenentatge", label: "Conceptes", icon: BookMarked },
  { href: "/aprenentatge/practica", label: "Mode pràctica", icon: Dumbbell },
  { href: "/aprenentatge/errors", label: "Revisió d'errors", icon: AlertOctagon },
  { href: "/aprenentatge/objectius", label: "Objectius", icon: Flag },
];

export function LearnTabs() {
  const path = usePathname();
  return (
    <nav aria-label="Aprenentatge" className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      {TABS.map((t) => {
        const active = t.href === "/aprenentatge" ? path === t.href || path.startsWith("/aprenentatge/conceptes") : path.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} aria-current={active ? "page" : undefined}
            className={cn("inline-flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2 text-sm transition-colors", active ? "border-primary/50 bg-primary/15 text-fg shadow-[0_0_20px_-8px_rgb(59_130_246)]" : "border-border text-muted hover:text-fg")}>
            <t.icon className={cn("size-4", active ? "text-accent" : "text-dim")} /> {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
