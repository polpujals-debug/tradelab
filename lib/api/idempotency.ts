import "server-only";
import { createHash } from "node:crypto";
import { db } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";
import { ApiError } from "./respond";

const KEY_RE = /^[A-Za-z0-9_\-:.]{1,200}$/;

/**
 * Idempotència opcional amb la capçalera `Idempotency-Key`.
 * - Mateixa clau + mateix cos → es retorna la resposta desada (capçalera `Idempotent-Replayed: true`).
 * - Mateixa clau + cos diferent → 409.
 */
export async function withIdempotency(req: Request, scope: string, body: unknown, handler: () => Promise<{ status: number; data: unknown }>): Promise<Response> {
  const key = req.headers.get("idempotency-key");
  if (!key) {
    const r = await handler();
    return Response.json({ data: r.data }, { status: r.status });
  }
  if (!KEY_RE.test(key)) throw new ApiError(400, "invalid_idempotency_key", "Idempotency-Key ha de tenir 1–200 caràcters [A-Za-z0-9_-:.].");
  const requestHash = createHash("sha256").update(JSON.stringify(body ?? null)).digest("hex");

  const existing = await db().from("idempotency_keys").select("request_hash, status_code, response").eq("scope", scope).eq("key", key).maybeSingle();
  if (existing.data) {
    if (existing.data.request_hash !== requestHash) {
      throw new ApiError(409, "idempotency_conflict", "Aquesta Idempotency-Key ja s'ha fet servir amb un cos diferent.");
    }
    return Response.json(existing.data.response, { status: existing.data.status_code, headers: { "Idempotent-Replayed": "true" } });
  }

  const r = await handler();
  const response: { [key: string]: Json } = { data: (r.data ?? null) as Json };
  if (r.status < 500) {
    await db().from("idempotency_keys").upsert({ scope, key, request_hash: requestHash, status_code: r.status, response }, { onConflict: "scope,key", ignoreDuplicates: true });
  }
  return Response.json(response, { status: r.status });
}
