import * as React from "react";

/** Tooltip fosc comú per a tots els gràfics. */
export function ChartTooltipBox({ title, rows }: { title: string; rows: { label: string; value: React.ReactNode; swatch?: string }[] }) {
  return (
    <div className="min-w-40 rounded-xl border border-border bg-[#0b0f1a]/95 px-3 py-2.5 text-xs shadow-2xl shadow-black/60 backdrop-blur">
      <p className="mb-1.5 font-medium text-muted">{title}</p>
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5 text-dim">
            {r.swatch && <span className="size-2 rounded-full" style={{ background: r.swatch }} />}
            {r.label}
          </span>
          <span className="num font-medium text-fg">{r.value}</span>
        </div>
      ))}
    </div>
  );
}
