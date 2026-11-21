import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { formatMoney, formatPct, formatR } from "@/lib/format";
import { addDays, startOfWeek } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { MonthCalendar } from "@/features/performance/service";

const WEEKDAYS = ["Dl", "Dt", "Dc", "Dj", "Dv", "Ds", "Dg"];
const MONTHS = ["Gener", "Febrer", "Març", "Abril", "Maig", "Juny", "Juliol", "Agost", "Setembre", "Octubre", "Novembre", "Desembre"];

function shiftMonth(month: string, n: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

/** Calendari mensual de P&L amb resum i totals setmanals. */
export function PnlCalendar({ data, today, hrefFor, currency }: { data: MonthCalendar; today: string; hrefFor: (month: string) => string; currency: string }) {
  const [year, month] = data.month.split("-").map(Number);
  const start = startOfWeek(data.first);
  const weeks: string[][] = [];
  for (let w = start; w <= data.last; w = addDays(w, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(w, i)));
  }
  const s = data.summary;
  const isCurrent = today.slice(0, 7) === data.month;
  const maxAbs = Math.max(1, ...Object.values(data.days).map((d) => Math.abs(d.pnl)));

  return (
    <Card className="overflow-hidden">
      {/* Capçalera */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-3">
          <div className="flex rounded-xl border border-border bg-bg/60">
            <Link href={hrefFor(shiftMonth(data.month, -1))} scroll={false} aria-label="Mes anterior" className="grid size-9 place-items-center text-muted hover:text-fg"><ChevronLeft className="size-4" /></Link>
            <Link href={hrefFor(shiftMonth(data.month, 1))} scroll={false} aria-label="Mes següent" className="grid size-9 place-items-center text-muted hover:text-fg"><ChevronRight className="size-4" /></Link>
          </div>
          <div>
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-accent"><CalendarDays className="size-3" /> Mes de trading</p>
            <h2 className="text-xl font-semibold tracking-tight text-fg sm:text-2xl">{MONTHS[month - 1]} <span className="text-dim">{year}</span></h2>
          </div>
          {!isCurrent && <Link href={hrefFor(today.slice(0, 7))} scroll={false} className="rounded-full border border-border px-3 py-1 text-xs text-muted hover:text-fg">Avui</Link>}
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-[0.2em] text-dim">P&amp;L net</p>
          <p className={cn("num text-2xl font-semibold sm:text-3xl", s.netPnl > 0 ? "text-profit" : s.netPnl < 0 ? "text-loss" : "text-fg")}>{formatMoney(s.netPnl, { currency, sign: true })}</p>
          <p className="num text-xs text-dim">{formatR(s.totalR)} aquest mes</p>
        </div>
      </div>

      {/* Franja de resum */}
      <dl className="grid grid-cols-2 border-y border-border sm:grid-cols-5">
        {[
          { k: "Operacions", v: String(s.trades), c: "text-fg" },
          { k: "Taxa d'encert", v: formatPct(s.winRate, { decimals: 0 }), c: s.winRate !== null && s.winRate >= 50 ? "text-profit" : "text-warning" },
          { k: "Dies verds", v: String(s.greenDays), c: "text-profit" },
          { k: "Dies vermells", v: String(s.redDays), c: "text-loss" },
          { k: "Millor dia", v: s.bestDay ? formatMoney(s.bestDay.pnl, { currency, sign: true }) : "—", c: "text-profit" },
        ].map((x, i) => (
          <div key={x.k} className={cn("px-5 py-3", i > 0 && "sm:border-l sm:border-border", i % 2 === 1 && "border-l border-border sm:border-l", i >= 2 && "border-t border-border sm:border-t-0", i === 4 && "col-span-2 sm:col-span-1")}>
            <dt className="text-[10px] uppercase tracking-[0.16em] text-dim">{x.k}</dt>
            <dd className={cn("num mt-0.5 text-lg font-semibold", x.c)}>{x.v}</dd>
          </div>
        ))}
      </dl>

      {/* Graella */}
      <div className="overflow-x-auto p-3 sm:p-4">
        <div className="grid min-w-[640px] grid-cols-[repeat(7,minmax(0,1fr))_minmax(84px,0.9fr)] gap-1.5 sm:gap-2">
          {WEEKDAYS.map((w) => <div key={w} className="pb-1 text-center text-[11px] font-medium text-muted">{w}</div>)}
          <div className="pb-1 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">Setmana</div>

          {weeks.map((week, wi) => {
            const inMonth = week.filter((d) => d.slice(0, 7) === data.month);
            const wPnl = inMonth.reduce((a, d) => a + (data.days[d]?.pnl ?? 0), 0);
            const wTrades = inMonth.reduce((a, d) => a + (data.days[d]?.trades ?? 0), 0);
            return (
              <div key={week[0]} className="contents">
                {week.map((d) => {
                  const v = data.days[d];
                  const out = d.slice(0, 7) !== data.month;
                  const isToday = d === today;
                  const intensity = v ? 0.08 + (Math.abs(v.pnl) / maxAbs) * 0.22 : 0;
                  return (
                    <div
                      key={d}
                      className={cn(
                        "relative flex min-h-[78px] flex-col justify-between rounded-xl border p-2 transition-colors sm:min-h-[92px] sm:p-2.5",
                        out ? "border-transparent bg-white/[0.01] text-faint" : "border-border/70 bg-bg/50",
                        v && v.pnl > 0 && "border-profit/30",
                        v && v.pnl < 0 && "border-loss/30",
                        isToday && "border-accent/70 shadow-[0_0_0_1px_rgb(96_165_250/0.4),0_0_24px_-6px_rgb(59_130_246/0.6)]",
                      )}
                      style={v && !out ? { backgroundColor: v.pnl >= 0 ? `rgb(16 185 129 / ${intensity})` : `rgb(239 68 68 / ${intensity})` } : undefined}
                      title={v ? `${d}: ${formatMoney(v.pnl, { currency, sign: true })} · ${v.trades} operacions` : d}
                    >
                      <span className={cn("num text-sm font-semibold sm:text-base", isToday ? "inline-grid size-7 place-items-center rounded-lg bg-primary text-white" : out ? "text-faint" : "text-fg")}>
                        {Number(d.slice(8))}
                      </span>
                      {v && !out && (
                        <div className="text-right">
                          <p className={cn("num text-xs font-semibold sm:text-sm", v.pnl > 0 ? "text-profit" : v.pnl < 0 ? "text-loss" : "text-muted")}>{formatMoney(v.pnl, { currency, sign: true, decimals: v.pnl >= 100 || v.pnl <= -100 ? 0 : 2 })}</p>
                          <p className="num text-[10px] text-dim">{v.trades} op · {formatR(v.r, 1)}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
                <div className={cn("flex flex-col justify-center rounded-xl border border-border/60 bg-surface/60 px-2.5", wTrades === 0 && "opacity-60")}>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-dim">S{wi + 1}</p>
                  <p className={cn("num text-sm font-semibold", wPnl > 0 ? "text-profit" : wPnl < 0 ? "text-loss" : "text-muted")}>{formatMoney(wPnl, { currency, sign: true })}</p>
                  <p className="num text-[10px] text-dim">{wTrades} operacions</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
