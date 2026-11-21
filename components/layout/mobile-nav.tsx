"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { isActive, NAV } from "./nav";

export function MobileHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center border-b border-border bg-bg/80 px-4 backdrop-blur-xl md:hidden">
      <Link href="/" aria-label="TradeLab, inici">
        <Logo />
      </Link>
    </header>
  );
}

export function MobileNav({ unreadReports }: { unreadReports: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const primary = NAV.filter((n) => n.mobile);
  const rest = NAV.filter((n) => !n.mobile);
  const restActive = rest.some((n) => isActive(pathname, n.href));

  // Tanca el full quan canvia la ruta (patró recomanat: derivar l'estat durant el render)
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  return (
    <>
      <AnimatePresence>
        {open && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
            <motion.div
              role="dialog"
              aria-label="Més seccions"
              className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-border bg-card p-4 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] md:hidden"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 420, damping: 40 }}
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border-strong" />
              <div className="grid grid-cols-2 gap-2">
                {rest.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn("flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 text-sm", isActive(pathname, item.href) ? "border-primary/50 text-fg" : "text-muted")}
                  >
                    <item.icon className="size-5 text-accent" />
                    <span className="flex-1">{item.label}</span>
                    {item.badge === "unreadReports" && unreadReports > 0 && (
                      <span className="num rounded-full bg-primary px-1.5 text-[10px] font-semibold leading-5 text-white">{unreadReports}</span>
                    )}
                  </Link>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <nav aria-label="Navegació principal" className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
        <ul className="grid grid-cols-5">
          {primary.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link href={item.href} aria-current={active ? "page" : undefined} className={cn("flex h-16 flex-col items-center justify-center gap-1 text-[10px]", active ? "text-accent" : "text-dim")}>
                  <item.icon className="size-5" />
                  {item.label}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              className={cn("relative flex h-16 w-full flex-col items-center justify-center gap-1 text-[10px] cursor-pointer", open || restActive ? "text-accent" : "text-dim")}
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
              Més
              {unreadReports > 0 && !open && <span className="absolute right-[30%] top-3 size-2 rounded-full bg-primary shadow-[0_0_8px_rgb(59_130_246)]" />}
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
