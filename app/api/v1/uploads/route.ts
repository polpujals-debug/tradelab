import { z } from "zod";
import { api } from "@/lib/api/handler";
import { ApiError, ok, readJson } from "@/lib/api/respond";
import { decodeBase64Image, fetchImage, storeImage } from "@/lib/media/process-image";
import { db, must } from "@/lib/supabase/server";

const jsonBody = z.object({
  base64: z.string().min(16).optional(),
  url: z.url().optional(),
  caption: z.string().max(200).optional(),
}).refine((b) => !!b.base64 !== !!b.url, { error: "Envia 'base64' o 'url' (només un)" });

/**
 * Puja una captura. Accepta:
 *  - multipart/form-data amb el camp `file` (i opcional `caption`)
 *  - JSON { base64 | url, caption? }
 * Retorna media_id + URLs públiques (imatge WebP i miniatura).
 */
export const POST = api(async (req) => {
  const type = req.headers.get("content-type") ?? "";
  let buf: Buffer;
  let caption: string | null = null;
  if (type.includes("multipart/form-data")) {
    const fd = await req.formData();
    const file = fd.get("file");
    if (!(file instanceof File)) throw new ApiError(400, "missing_file", "Falta el camp 'file' al formulari multipart.");
    buf = Buffer.from(await file.arrayBuffer());
    caption = typeof fd.get("caption") === "string" ? String(fd.get("caption")) : null;
  } else {
    const body = jsonBody.parse(await readJson(req));
    buf = body.base64 ? decodeBase64Image(body.base64) : await fetchImage(body.url!);
    caption = body.caption ?? null;
  }
  const img = await storeImage(buf, "uploads");
  const row = must(
    await db().from("media").insert({
      kind: "analysis", url: img.url, thumb_url: img.thumbUrl, storage_path: img.storagePath, mime_type: img.mimeType,
      width: img.width, height: img.height, size_bytes: img.sizeBytes, caption,
    }).select("id, url, thumb_url, width, height, size_bytes").single(),
    "Desar captura",
  );
  return ok({ media_id: row.id, url: row.url, thumb_url: row.thumb_url, width: row.width, height: row.height, size_bytes: row.size_bytes }, 201);
});
