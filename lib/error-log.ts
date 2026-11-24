import { createClient } from "@supabase/supabase-js";

/**
 * Registre d'errors del servidor a Supabase Storage (bucket privat "logs").
 * Permet veure el missatge real d'un error de producció des de la mateixa app,
 * sense accés als registres de Vercel. No guarda mai capçaleres ni claus.
 */
const BUCKET = "logs";

function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/(rest|storage|auth)\/v1\/?$/, "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export interface ErrorEntry { digest: string | null; message: string; stack: string | null; path: string; method: string; at: string; route?: string }

export async function saveError(entry: ErrorEntry) {
  const db = client();
  if (!db) return;
  const body = new Blob([JSON.stringify(entry, null, 2)], { type: "application/json" });
  let up = await db.storage.from(BUCKET).upload(`errors/${entry.digest ?? "sense-digest"}.json`, body, { upsert: true, contentType: "application/json" });
  if (up.error && /not found/i.test(up.error.message)) {
    await db.storage.createBucket(BUCKET, { public: false });
    up = await db.storage.from(BUCKET).upload(`errors/${entry.digest ?? "sense-digest"}.json`, body, { upsert: true, contentType: "application/json" });
  }
  await db.storage.from(BUCKET).upload("errors/latest.json", body, { upsert: true, contentType: "application/json" });
}

export async function readError(digest: string | null): Promise<ErrorEntry | null> {
  const db = client();
  if (!db) return null;
  const name = digest && /^[A-Za-z0-9_-]{1,64}$/.test(digest) ? digest : "latest";
  const res = await db.storage.from(BUCKET).download(`errors/${name}.json`);
  if (res.error || !res.data) return null;
  try {
    return JSON.parse(await res.data.text()) as ErrorEntry;
  } catch {
    return null;
  }
}
