"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fieldErrors } from "@/features/trades/schemas";
import type { FormState } from "@/features/trades/actions";
import { storeImage } from "@/lib/media/process-image";
import { db } from "@/lib/supabase/server";
import { analysisCreateSchema, analysisUpdateSchema } from "./schemas";
import { createAnalysis, updateAnalysis } from "./service";

export async function updateAnalysisAction(id: string, patch: unknown): Promise<FormState> {
  const parsed = analysisUpdateSchema.safeParse(patch);
  if (!parsed.success) return { ok: false, message: Object.values(fieldErrors(parsed.error))[0] };
  try {
    await updateAnalysis(z.uuid().parse(id), parsed.data);
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Error" };
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "Desat" };
}

/** Anàlisi manual des de la web (les de Claude arriben per l'API). */
export async function createAnalysisAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const num = (v: FormDataEntryValue | null) => String(v ?? "").split(/[,;\s]+/).map((x) => x.replace(",", ".")).filter(Boolean).map(Number);
  const parsed = analysisCreateSchema.safeParse({
    asset: fd.get("asset"),
    timeframes: fd.getAll("timeframes"),
    bias: fd.get("bias"),
    levels: { supports: num(fd.get("supports")), resistances: num(fd.get("resistances")), ma50: fd.get("ma50") ? Number(fd.get("ma50")) : null },
    content_md: fd.get("content_md"),
    scenario: fd.get("scenario") || undefined,
    review_in_days: fd.get("review_in_days") || 3,
    source: "manual",
  });
  if (!parsed.success) return { ok: false, message: "Revisa els camps.", errors: fieldErrors(parsed.error) };
  let id: string;
  try {
    const a = await createAnalysis(parsed.data);
    id = a!.id;
    let i = 0;
    for (const f of fd.getAll("images")) {
      if (!(f instanceof File) || f.size === 0) continue;
      const img = await storeImage(Buffer.from(await f.arrayBuffer()), "analyses");
      await db().from("media").insert({ entity_type: "analysis", entity_id: id, kind: "analysis", url: img.url, thumb_url: img.thumbUrl, storage_path: img.storagePath, mime_type: img.mimeType, width: img.width, height: img.height, size_bytes: img.sizeBytes, sort_order: i++ });
    }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Error" };
  }
  revalidatePath("/", "layout");
  redirect(`/analisis/${id}`);
}
