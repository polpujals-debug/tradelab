import { Logo } from "./logo";
import { NAV } from "./nav";

/** Versió estàtica (sense hooks de ruta) per al shell prerenderitzat. */
export function SidebarSkeleton() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col border-r border-border bg-surface/70 md:flex" aria-hidden>
      <div className="flex h-16 items-center px-5"><Logo /></div>
      <div className="space-y-1 px-3 py-2">
        {NAV.map((n) => (
          <div key={n.href} className="flex h-10 items-center gap-3 rounded-xl px-3 text-sm text-muted">
            <n.icon className="size-[18px] text-dim" />
            {n.label}
          </div>
        ))}
      </div>
    </aside>
  );
}

export function MobileNavSkeleton() {
  return <div aria-hidden className="fixed inset-x-0 bottom-0 z-50 h-16 border-t border-border bg-surface/90 md:hidden" />;
}
