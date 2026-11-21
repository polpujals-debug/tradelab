import { revalidatePath } from "next/cache";
import { api } from "@/lib/api/handler";
import { ApiError, ok, readJson, uuidParam } from "@/lib/api/respond";
import { tradeUpdateSchema } from "@/features/trades/schemas";
import { updateTrade } from "@/features/trades/service";
import { getTradeDTO } from "@/features/trades/dto";

export const GET = api<{ id: string }>(async (_req, { params }) => {
  const t = await getTradeDTO(uuidParam.parse(params.id));
  if (!t) throw new ApiError(404, "not_found", "Operació no trobada");
  return ok(t);
});

/** Actualitza o tanca una operació. Per tancar: { "status": "closed", "exit_price": 93100 } */
export const PATCH = api<{ id: string }>(async (req, { params }) => {
  const id = uuidParam.parse(params.id);
  const body = (await readJson(req)) as Record<string, unknown>;
  const input = tradeUpdateSchema.parse(body.exit_price !== undefined && body.status === undefined ? { ...body, status: "closed" } : body);
  await updateTrade(id, input);
  revalidatePath("/", "layout");
  return ok(await getTradeDTO(id));
});
