import "server-only";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { env } from "@/lib/env";
import { db } from "@/lib/supabase/server";

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const ALLOWED_MIME = ["image/png", "image/jpeg", "image/webp"] as const;

export class ImageError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export interface StoredImage {
  url: string;
  thumbUrl: string;
  storagePath: string;
  mimeType: string;
  width: number;
  height: number;
  sizeBytes: number;
}

/** Comprova la mida i els "magic bytes" (no ens fiem del content-type declarat). */
function sniffMime(buf: Buffer): (typeof ALLOWED_MIME)[number] | null {
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length > 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

/** Decodifica base64 pla o data URL (data:image/png;base64,...). */
export function decodeBase64Image(input: string): Buffer {
  const clean = input.replace(/^data:image\/[a-z+]+;base64,/i, "").replace(/\s/g, "");
  if (!/^[A-Za-z0-9+/]+=*$/.test(clean)) throw new ImageError("La imatge en base64 no és vàlida.");
  return Buffer.from(clean, "base64");
}

/** Descarrega una imatge d'una URL pública (http/https), amb límit de mida i temps. */
export async function fetchImage(url: string): Promise<Buffer> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new ImageError("La URL de la imatge no és vàlida.");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new ImageError("Només s'accepten URL http(s).");
  // Evita que la plataforma faci peticions a xarxes internes (SSRF bàsic)
  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal") || /^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.|::1$|fc|fd)/.test(host)) {
    throw new ImageError("No es poden descarregar imatges d'adreces internes.");
  }
  const res = await fetch(parsed, { signal: AbortSignal.timeout(15_000), redirect: "follow" });
  if (!res.ok) throw new ImageError(`No s'ha pogut descarregar la imatge (HTTP ${res.status}).`);
  const len = Number(res.headers.get("content-length") ?? 0);
  if (len > MAX_IMAGE_BYTES) throw new ImageError("La imatge supera els 10 MB.", 413);
  const buf = Buffer.from(await res.arrayBuffer());
  return buf;
}

/**
 * Valida (PNG/JPG/WebP ≤ 10 MB), converteix a WebP, genera una miniatura de
 * 480 px i ho puja tot a Supabase Storage.
 */
export async function storeImage(buf: Buffer, folder: string): Promise<StoredImage> {
  if (buf.length === 0) throw new ImageError("La imatge és buida.");
  if (buf.length > MAX_IMAGE_BYTES) throw new ImageError("La imatge supera els 10 MB.", 413);
  const mime = sniffMime(buf);
  if (!mime) throw new ImageError("Format no suportat. Fes servir PNG, JPG o WebP.", 415);

  const base = sharp(buf, { failOn: "error" }).rotate();
  const meta = await base.metadata();
  const full = await base.clone().resize({ width: 2560, withoutEnlargement: true }).webp({ quality: 85 }).toBuffer({ resolveWithObject: true });
  const thumb = await base.clone().resize({ width: 480, withoutEnlargement: true }).webp({ quality: 72 }).toBuffer();

  const bucket = env().SUPABASE_STORAGE_BUCKET;
  const id = randomUUID();
  const day = new Date().toISOString().slice(0, 7);
  const path = `${folder}/${day}/${id}.webp`;
  const thumbPath = `${folder}/${day}/${id}_thumb.webp`;
  const storage = db().storage.from(bucket);

  const [a, b] = await Promise.all([
    storage.upload(path, full.data, { contentType: "image/webp", upsert: false, cacheControl: "31536000" }),
    storage.upload(thumbPath, thumb, { contentType: "image/webp", upsert: false, cacheControl: "31536000" }),
  ]);
  if (a.error || b.error) throw new ImageError(`Error pujant a Storage: ${(a.error ?? b.error)?.message}`, 500);

  return {
    url: storage.getPublicUrl(path).data.publicUrl,
    thumbUrl: storage.getPublicUrl(thumbPath).data.publicUrl,
    storagePath: path,
    mimeType: "image/webp",
    width: full.info.width ?? meta.width ?? 0,
    height: full.info.height ?? meta.height ?? 0,
    sizeBytes: full.data.length,
  };
}

export async function deleteStoredImage(storagePath: string | null) {
  if (!storagePath) return;
  const thumb = storagePath.replace(/\.webp$/, "_thumb.webp");
  await db().storage.from(env().SUPABASE_STORAGE_BUCKET).remove([storagePath, thumb]);
}
