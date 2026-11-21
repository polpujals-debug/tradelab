"use client";
import { motion } from "framer-motion";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { isActive, NAV } from "./nav";

export function Sidebar({ initialCollapsed, unreadReports }: { initialCollapsed: boolean; unreadReports: number }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `tl_sidebar=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 76 : 248 }}
      transition={{ type: "spring", stiffness: 380, damping: 36 }}
      className="sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-border bg-surface/70 backdrop-blur-xl md:flex"
    >
      <div className={cn("flex h-16 items-center px-5", collapsed && "justify-center px-0")}>
        <Link href="/" aria-label="TradeLab, inici">
          <Logo compact={collapsed} />
        </Link>
      </div>

      <nav aria-label="Navegació principal" className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          const count = item.badge === "unreadReports" ? unreadReports : 0;
          const link = (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex h-10 items-center gap-3 rounded-xl px-3 text-sm transition-colors",
                collapsed && "justify-center px-0",
                active ? "bg-primary/12 text-fg" : "text-muted hover:bg-white/[0.04] hover:text-fg",
              )}
            >
              {active && (
                <motion.span layoutId="nav-active" className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-accent shadow-[0_0_12px_rgb(96_165_250/0.9)]" />
              )}
              <item.icon className={cn("size-[18px] shrink-0", active ? "text-accent" : "text-dim group-hover:text-muted")} />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {count > 0 && (
                <span
                  className={cn(
                    "num grid min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[10px] font-semibold leading-5 text-white",
                    collapsed ? "absolute right-2 top-1 min-w-4 text-[9px] leading-4" : "ml-auto",
                  )}
                  aria-label={`${count} informes nous`}
                >
                  {count}
                </span>
              )}
            </Link>
          );
          return collapsed ? <Tooltip key={item.href} content={item.label} side="right">{link}</Tooltip> : link;
        })}
      </nav>

      <div className="border-t border-border p-3">
        <button
          onClick={toggle}
          className={cn("flex h-9 w-full items-center gap-3 rounded-xl px-3 text-xs text-dim hover:bg-white/[0.04] hover:text-fg cursor-pointer", collapsed && "justify-center px-0")}
          aria-label={collapsed ? "Expandir la barra lateral" : "Plegar la barra lateral"}
        >
          {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          {!collapsed && "Plegar"}
        </button>
      </div>
    </motion.aside>
  );
}
