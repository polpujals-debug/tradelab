import { z } from "zod";
import { reportToMarkdown } from "@/features/performance/markdown";
import { getPerformanceReport } from "@/features/performance/service";

const query = z.object({
  tipus: z.enum(["daily", "weekly", "monthly"]).default("weekly"),
  data: z.iso.date().optional(),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = query.safeParse(Object.fromEntries(url.searchParams));
  if (!q.success) return Response.json({ error: "Paràmetres invàlids" }, { status: 400 });
  const report = await getPerformanceReport(q.data.tipus, q.data.data);
  const name = `tradelab-${q.data.tipus}-${report.range.from ?? "inici"}.md`;
  return new Response(reportToMarkdown(report), {
    headers: { "Content-Type": "text/markdown; charset=utf-8", "Content-Disposition": `attachment; filename="${name}"` },
  });
}
