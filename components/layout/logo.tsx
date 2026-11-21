export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative grid size-8 place-items-center rounded-xl bg-gradient-to-br from-primary to-cyan shadow-[0_0_24px_-4px_rgb(59_130_246/0.7)]">
        <svg viewBox="0 0 24 24" className="size-4.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 17l5-6 4 3 6-8" />
          <path d="M15 6h3v3" />
        </svg>
      </div>
      {!compact && (
        <span className="text-[15px] font-semibold tracking-tight text-fg">
          Trade<span className="text-accent">Lab</span>
        </span>
      )}
    </div>
  );
}
