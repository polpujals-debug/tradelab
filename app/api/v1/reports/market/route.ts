import { revalidatePath } from "next/cache";
import { api } from "@/lib/api/handler";
import { ApiError, ok, readJson } from "@/lib/api/respond";
import { marketReportCreateSchema, marketReportListSchema } from "@/features/market-reports/schemas";
import { listMarketReports, publishMarketReport } from "@/features/market-reports/service";

export const GET = api(async (req) => {
  const q = marketReportListSchema.parse(Object.fromEntries(new URL(req.url).searchParams));
  return ok(await listMarketReports({ type: q.type, unread: q.unread === "true", limit: q.limit }));
});

/**
 * Publica un informe de mercat. Idempotent amb `Idempotency-Key`: si la tasca
 * programada es repeteix amb la mateixa clau, es retorna l'informe existent (200)
 * en lloc de crear-ne un altre (201).
 */
export const POST = api(async (req) => {
  const key = req.headers.get("idempotency-key");
  if (key && !/^[A-Za-z0-9_\-:.]{1,200}$/.test(key)) throw new ApiError(400, "invalid_idempotency_key", "Idempotency-Key invàlida.");
  const input = marketReportCreateSchema.parse(await readJson(req));
  const { report, created } = await publishMarketReport(input, key);
  revalidatePath("/", "layout");
  return Response.json({ data: report }, { status: created ? 201 : 200, headers: created ? undefined : { "Idempotent-Replayed": "true" } });
});
