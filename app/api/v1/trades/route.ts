import { revalidatePath } from "next/cache";
import { api } from "@/lib/api/handler";
import { withIdempotency } from "@/lib/api/idempotency";
import { ok, readJson } from "@/lib/api/respond";
import { listTrades } from "@/features/trades/queries";
import { tradeCreateSchema, tradeListQuerySchema } from "@/features/trades/schemas";
import { createTrade } from "@/features/trades/service";
import { getTradeDTO, toTradeDTO } from "@/features/trades/dto";

export const GET = api(async (req) => {
  const q = tradeListQuerySchema.parse(Object.fromEntries(new URL(req.url).searchParams));
  return ok((await listTrades(q)).map(toTradeDTO));
});

export const POST = api(async (req) => {
  const body = await readJson(req);
  return withIdempotency(req, "trades", body, async () => {
    const input = tradeCreateSchema.parse({ source: "claude", ...(body as object) });
    const { id } = await createTrade(input);
    revalidatePath("/", "layout");
    return { status: 201, data: await getTradeDTO(id) };
  });
});
