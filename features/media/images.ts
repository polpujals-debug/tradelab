import "server-only";
import { decodeBase64Image, fetchImage, ImageError, storeImage } from "@/lib/media/process-image";
import { db, must } from "@/lib/supabase/server";
import type { Enum } from "@/lib/supabase/types";

import { imageInputSchema, type ImageInput } from "./images-schema";
export { imageInputSchema, type ImageInput };

export async function attachImages(entity: Enum<"media_entity">, entityId: string, kind: Enum<"media_kind">, images: ImageInput[], folder: string) {
  const out = [];
  for (const [i, img] of images.entries()) {
    if (img.media_id) {
      const row = must(
        await db().from("media").update({ entity_type: entity, entity_id: entityId, kind, caption: img.caption ?? undefined, sort_order: i }).eq("id", img.media_id).select("*").maybeSingle(),
        "Captura",
      );
      if (!row) throw new ImageError(`media_id ${img.media_id} no existeix.`, 404);
      out.push(row);
      continue;
    }
    const buf = img.base64 ? decodeBase64Image(img.base64) : await fetchImage(img.url!);
    const stored = await storeImage(buf, folder);
    out.push(must(
      await db().from("media").insert({
        entity_type: entity, entity_id: entityId, kind, url: stored.url, thumb_url: stored.thumbUrl, storage_path: stored.storagePath,
        mime_type: stored.mimeType, width: stored.width, height: stored.height, size_bytes: stored.sizeBytes, caption: img.caption ?? null, sort_order: i,
      }).select("*").single(),
      "Desar captura",
    ));
  }
  return out;
}

export async function mediaFor(entity: Enum<"media_entity">, ids: string[]) {
  if (!ids.length) return new Map<string, { id: string; url: string; thumb_url: string | null; caption: string | null }[]>();
  const rows = must(await db().from("media").select("id, entity_id, url, thumb_url, caption, sort_order").eq("entity_type", entity).in("entity_id", ids).order("sort_order"), "Captures");
  const map = new Map<string, { id: string; url: string; thumb_url: string | null; caption: string | null }[]>();
  for (const r of rows) {
    if (!r.entity_id) continue;
    const list = map.get(r.entity_id) ?? [];
    list.push({ id: r.id, url: r.url, thumb_url: r.thumb_url, caption: r.caption });
    map.set(r.entity_id, list);
  }
  return map;
}
