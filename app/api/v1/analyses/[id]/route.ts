import { revalidatePath } from "next/cache";
import { api } from "@/lib/api/handler";
import { ApiError, ok, readJson, uuidParam } from "@/lib/api/respond";
import { analysisUpdateSchema } from "@/features/analyses/schemas";
import { getAnalysis, updateAnalysis } from "@/features/analyses/service";

export const GET = api<{ id: string }>(async (_req, { params }) => {
  const a = await getAnalysis(uuidParam.parse(params.id));
  if (!a) throw new ApiError(404, "not_found", "Anàlisi no trobada");
  return ok(a);
});

export const PATCH = api<{ id: string }>(async (req, { params }) => {
  const id = uuidParam.parse(params.id);
  const input = analysisUpdateSchema.parse(await readJson(req));
  const a = await updateAnalysis(id, input);
  revalidatePath("/", "layout");
  return ok(a);
});
