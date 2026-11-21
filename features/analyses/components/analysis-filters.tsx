"use client";
import { X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { NativeSelect } from "@/components/ui/input";
import { L } from "@/lib/i18n/ca";
import { cn } from "@/lib/utils";

export function AnalysisFilters({ assets, timeframes }: { assets: string[]; timeframes: readonly string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const set = (k: string, v: string) => {
    const next = new URLSearchParams(sp.toString());
    if (v) next.set(k, v); else next.delete(k);
    start(() => router.replace(`${pathname}?${next}`, { scroll: false }));
  };
  const v = (k: string) => sp.get(k) ?? "";
  const sel = "h-9 text-xs w-auto min-w-32";
  return (
    <div className={cn("-mx-4 mb-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0 [&>*]:shrink-0", pending && "opacity-60")}>
      <NativeSelect aria-label="Actiu" className={sel} value={v("asset")} onChange={(e) => set("asset", e.target.value)}>
        <option value="">Tots els actius</option>{assets.map((a) => <option key={a}>{a}</option>)}
      </NativeSelect>
      <NativeSelect aria-label="Temporalitat" className={sel} value={v("timeframe")} onChange={(e) => set("timeframe", e.target.value)}>
        <option value="">Totes les temporalitats</option>{timeframes.map((t) => <option key={t}>{t}</option>)}
      </NativeSelect>
      <NativeSelect aria-label="Biaix" className={sel} value={v("bias")} onChange={(e) => set("bias", e.target.value)}>
        <option value="">Tots els biaixos</option>{(["bullish", "bearish", "neutral"] as const).map((b) => <option key={b} value={b}>{L.bias[b]}</option>)}
      </NativeSelect>
      <NativeSelect aria-label="Resultat" className={sel} value={v("outcome")} onChange={(e) => set("outcome", e.target.value)}>
        <option value="">Tots els resultats</option>{(["pending", "fulfilled", "partial", "failed"] as const).map((o) => <option key={o} value={o}>{L.outcome[o]}</option>)}
      </NativeSelect>
      {["asset", "timeframe", "bias", "outcome"].some((k) => sp.get(k)) && (
        <button onClick={() => start(() => router.replace(pathname, { scroll: false }))} className="inline-flex h-9 items-center gap-1 rounded-xl px-3 text-xs text-muted hover:bg-white/5 hover:text-fg cursor-pointer"><X className="size-3.5" /> Netejar</button>
      )}
    </div>
  );
}
