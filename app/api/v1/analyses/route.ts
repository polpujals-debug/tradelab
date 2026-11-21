import { revalidatePath } from "next/cache";
import { api } from "@/lib/api/handler";
import { withIdempotency } from "@/lib/api/idempotency";
import { ok, readJson } from "@/lib/api/respond";
import { analysisCreateSchema, analysisListSchema } from "@/features/analyses/schemas";
import { createAnalysis, listAnalyses } from "@/features/analyses/service";

export const GET = api(async (req) => {
  const q = analysisListSchema.parse(Object.fromEntries(new URL(req.url).searchParams));
  return ok(await listAnalyses(q));
});

export const POST = api(async (req) => {
  const body = await readJson(req);
  return withIdempotency(req, "analyses", body, async () => {
    const input = analysisCreateSchema.parse(body);
    const analysis = await createAnalysis(input);
    revalidatePath("/", "layout");
    return { status: 201, data: analysis };
  });
});
