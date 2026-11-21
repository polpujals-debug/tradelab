import { api } from "@/lib/api/handler";
import { ApiError, ok, uuidParam } from "@/lib/api/respond";
import { getMarketReport } from "@/features/market-reports/service";

export const GET = api<{ id: string }>(async (_req, { params }) => {
  const r = await getMarketReport(uuidParam.parse(params.id));
  if (!r) throw new ApiError(404, "not_found", "Informe no trobat");
  return ok(r);
});
