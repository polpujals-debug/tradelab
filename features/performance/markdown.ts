import { formatDate, formatMoney, formatNumber, formatPct, formatR } from "@/lib/format";
import type { PerformanceReport } from "./service";

export const KIND_LABEL = { daily: "diari", weekly: "setmanal", monthly: "mensual" } as const;

export function rangeLabel(r: { from: string | null; to: string }) {
  if (!r.from) return `fins al ${formatDate(r.to)}`;
  if (r.from === r.to) return formatDate(r.from, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return `${formatDate(r.from, { day: "numeric", month: "short" })} – ${formatDate(r.to, { day: "numeric", month: "short", year: "numeric" })}`;
}

function delta(cur: number | null, prev: number | null | undefined, fmt: (v: number) => string) {
  if (cur == null || prev == null) return "—";
  const d = cur - prev;
  return `${d > 0 ? "▲" : d < 0 ? "▼" : "="} ${fmt(Math.abs(d))}`;
}

/** Informe de rendiment en Markdown (exportació i lectura per a Claude). */
export function reportToMarkdown(r: PerformanceReport): string {
  const c = r.currency;
  const s = r.summary;
  const p = r.previous;
  const m = (v: number | null | undefined, sign = true) => formatMoney(v, { currency: c, sign });
  const lines = [
    `# Informe de rendiment ${KIND_LABEL[r.kind]}`,
    `**Període:** ${rangeLabel(r.range)}${r.previousRange ? ` · comparat amb ${rangeLabel(r.previousRange)}` : ""}`,
    "",
    "## Resum",
    "| Mètrica | Aquest període | Anterior | Canvi |",
    "|---|---|---|---|",
    `| P&L net | ${m(s.netPnl)} | ${m(p?.netPnl)} | ${delta(s.netPnl, p?.netPnl, (v) => m(v, false))} |`,
    `| Operacions | ${s.trades} | ${p?.trades ?? "—"} | ${delta(s.trades, p?.trades, (v) => String(v))} |`,
    `| Taxa d'encert | ${formatPct(s.winRate)} | ${formatPct(p?.winRate)} | ${delta(s.winRate, p?.winRate, (v) => `${formatNumber(v, 1)} pp`)} |`,
    `| R total | ${formatR(s.totalR)} | ${formatR(p?.totalR)} | ${delta(s.totalR, p?.totalR, (v) => `${formatNumber(v, 2)}R`)} |`,
    `| R mitjà | ${formatR(s.avgR)} | ${formatR(p?.avgR)} | ${delta(s.avgR, p?.avgR, (v) => `${formatNumber(v, 2)}R`)} |`,
    `| Profit factor | ${s.profitFactor == null ? "—" : formatNumber(s.profitFactor)} | ${p?.profitFactor == null ? "—" : formatNumber(p.profitFactor)} | |`,
    `| Compliment estratègia | ${formatPct(s.compliance, { decimals: 0 })} | ${formatPct(p?.compliance, { decimals: 0 })} | ${delta(s.compliance, p?.compliance, (v) => `${formatNumber(v, 0)} pp`)} |`,
    `| Max drawdown | ${m(-s.maxDrawdown)} | ${p ? m(-p.maxDrawdown) : "—"} | |`,
    `| Capital | ${m(s.startEquity, false)} → ${m(s.endEquity, false)} | | |`,
    "",
    "## Millor i pitjor operació",
    `- **Millor:** ${r.best ? `${r.best.symbol} ${m(r.best.netPnl)} (${formatR(r.best.r)})` : "—"}`,
    `- **Pitjor:** ${r.worst ? `${r.worst.symbol} ${m(r.worst.netPnl)} (${formatR(r.worst.r)})` : "—"}`,
    "",
    "## Errors principals",
    ...(r.errors.length ? r.errors.map((e) => `- **${e.name}** · ${e.count} ${e.count === 1 ? "vegada" : "vegades"} · cost ${m(e.cost)}`) : ["- Cap error registrat 🎉"]),
    "",
    "## Per actiu",
    ...(r.byAsset.length ? r.byAsset.map((a) => `- ${a.symbol}: ${a.trades} operacions · ${m(a.netPnl)}`) : ["- —"]),
    "",
    "## Lliçons",
    ...(r.lessons.length ? r.lessons.map((l) => `- ${l}`) : ["- —"]),
    "",
    "## Operacions",
    "| Data | Actiu | Direcció | Setup | P&L | R |",
    "|---|---|---|---|---|---|",
    ...r.trades.map((t) => `| ${t.exitAt ? formatDate(t.exitAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"} | ${t.symbol} | ${t.direction} | ${t.setup ?? "—"} | ${m(t.netPnl)} | ${formatR(t.r)} |`),
    "",
    `_Generat per TradeLab el ${formatDate(new Date(), { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}._`,
  ];
  return lines.join("\n");
}
