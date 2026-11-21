"use client";
import { LayoutGrid, Rows3, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Input, NativeSelect } from "@/components/ui/input";
import { L } from "@/lib/i18n/ca";
import { cn } from "@/lib/utils";

export function TradeFilters({ assets, setups, tags }: { assets: string[]; setups: string[]; tags: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(sp.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    start(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  };
  const v = (k: string) => sp.get(k) ?? "";
  const view = v("vista") || "taula";
  const active = ["asset", "direction", "result", "status", "setup", "tag", "from", "to"].some((k) => sp.get(k));

  const sel = "h-9 text-xs";
  return (
    <div className={cn("mb-4 flex flex-wrap items-center gap-2 transition-opacity", pending && "opacity-60")}>
      <NativeSelect aria-label="Actiu" className={cn(sel, "w-32")} value={v("asset")} onChange={(e) => set("asset", e.target.value)}>
        <option value="">Tots els actius</option>
        {assets.map((a) => <option key={a} value={a}>{a}</option>)}
      </NativeSelect>
      <NativeSelect aria-label="Direcció" className={cn(sel, "w-28")} value={v("direction")} onChange={(e) => set("direction", e.target.value)}>
        <option value="">Long i short</option>
        <option value="long">{L.direction.long}</option>
        <option value="short">{L.direction.short}</option>
      </NativeSelect>
      <NativeSelect aria-label="Resultat" className={cn(sel, "w-32")} value={v("result")} onChange={(e) => set("result", e.target.value)}>
        <option value="">Tots els resultats</option>
        <option value="win">Guanyadores</option>
        <option value="loss">Perdedores</option>
        <option value="breakeven">Break-even</option>
      </NativeSelect>
      <NativeSelect aria-label="Estat" className={cn(sel, "w-32")} value={v("status")} onChange={(e) => set("status", e.target.value)}>
        <option value="">Tots els estats</option>
        {(["planned", "open", "closed", "cancelled"] as const).map((s) => <option key={s} value={s}>{L.status[s]}</option>)}
      </NativeSelect>
      <NativeSelect aria-label="Setup" className={cn(sel, "w-40")} value={v("setup")} onChange={(e) => set("setup", e.target.value)}>
        <option value="">Tots els setups</option>
        {setups.map((s) => <option key={s} value={s}>{s}</option>)}
      </NativeSelect>
      <NativeSelect aria-label="Etiqueta" className={cn(sel, "w-40")} value={v("tag")} onChange={(e) => set("tag", e.target.value)}>
        <option value="">Totes les etiquetes</option>
        {tags.map((t) => <option key={t} value={t}>{t}</option>)}
      </NativeSelect>
      <Input aria-label="Des de" type="date" className={cn(sel, "w-36")} value={v("from")} onChange={(e) => set("from", e.target.value)} />
      <Input aria-label="Fins a" type="date" className={cn(sel, "w-36")} value={v("to")} onChange={(e) => set("to", e.target.value)} />
      {active && (
        <button
          onClick={() => start(() => router.replace(view === "targetes" ? `${pathname}?vista=targetes` : pathname, { scroll: false }))}
          className="inline-flex h-9 items-center gap-1 rounded-xl px-3 text-xs text-muted hover:bg-white/5 hover:text-fg cursor-pointer"
        >
          <X className="size-3.5" /> Netejar
        </button>
      )}
      <div className="ml-auto inline-flex rounded-xl border border-border bg-surface/80 p-1" role="group" aria-label="Vista">
        {[{ k: "taula", icon: Rows3, label: "Taula" }, { k: "targetes", icon: LayoutGrid, label: "Targetes" }].map((o) => (
          <button
            key={o.k}
            onClick={() => set("vista", o.k === "taula" ? "" : o.k)}
            aria-pressed={view === o.k}
            className={cn("inline-flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-xs cursor-pointer", view === o.k ? "bg-primary/15 text-accent" : "text-muted hover:text-fg")}
          >
            <o.icon className="size-3.5" /> {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
