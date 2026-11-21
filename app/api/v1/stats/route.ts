import { z } from "zod";
import { api } from "@/lib/api/handler";
import { ok } from "@/lib/api/respond";
import { reportToMarkdown } from "@/features/performance/markdown";
import { getDashboard, getPerformanceReport, type Period } from "@/features/performance/service";

const query = z.object({
  period: z.enum(["day", "week", "month", "all"]).default("week"),
  date: z.iso.date().optional(),
  format: z.enum(["json", "md"]).default("json"),
});

/**
 * Estadístiques de rendiment. Per a day/week/month retorna l'informe complet
 * (amb comparació amb el període anterior, errors, lliçons i operacions).
 * Amb format=md retorna el mateix informe en Markdown, ideal per a una revisió amb Claude.
 */
export const GET = api(async (req) => {
  const q = query.parse(Object.fromEntries(new URL(req.url).searchParams));
  const dash = await getDashboard(q.period as Period);
  const totals = { ...dash.totals, initial_capital: dash.account.initialCapital, currency: dash.account.currency };
  if (q.period === "all") {
    const s = dash.selected.stats;
    return ok({ period: "all", totals, stats: { ...s, best: s.best?.id ?? null, worst: s.worst?.id ?? null }, compliance: dash.selected.compliance });
  }
  const kind = q.period === "day" ? "daily" : q.period === "week" ? "weekly" : "monthly";
  const report = await getPerformanceReport(kind, q.date);
  if (q.format === "md") return new Response(reportToMarkdown(report), { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
  return ok({ period: q.period, totals, report });
});
