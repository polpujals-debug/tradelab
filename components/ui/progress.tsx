import { cn } from "@/lib/utils";

export function Progress({ value, className, tone = "primary", label }: { value: number; className?: string; tone?: "primary" | "profit" | "warning" | "loss"; label?: string }) {
  const v = Math.max(0, Math.min(100, value));
  const colors = { primary: "from-primary to-accent", profit: "from-profit to-emerald-300", warning: "from-warning to-amber-300", loss: "from-loss to-red-400" };
  return (
    <div role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100} aria-label={label} className={cn("h-2 w-full overflow-hidden rounded-full bg-white/5", className)}>
      <div className={cn("h-full rounded-full bg-gradient-to-r transition-[width] duration-700 ease-out", colors[tone])} style={{ width: `${v}%` }} />
    </div>
  );
}
