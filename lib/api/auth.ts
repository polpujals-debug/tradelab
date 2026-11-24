import "server-only";
import { db } from "@/lib/supabase/server";
import { hashKey, KEY_PREFIX } from "./keys";
import { ApiError } from "./respond";

/** Valida una clau d'API en text (per al connector MCP, que la rep a la URL). */
export async function authenticateKey(key: string): Promise<{ keyId: string; name: string }> {
  if (!key.startsWith(KEY_PREFIX)) throw new ApiError(401, "unauthorized", "Format de clau invàlid (ha de començar per 'tl_').");
  const { data, error } = await db().from("api_keys").select("id, name, revoked_at").eq("key_hash", hashKey(key)).maybeSingle();
  if (error) throw new ApiError(500, "internal_error", "No s'ha pogut validar la clau.");
  if (!data) throw new ApiError(401, "unauthorized", "Clau d'API desconeguda.");
  if (data.revoked_at) throw new ApiError(401, "key_revoked", "Aquesta clau d'API està revocada.");
  void db().from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", data.id).then(() => undefined);
  return { keyId: data.id, name: data.name };
}

/** Valida `Authorization: Bearer <clau>`. Retorna l'id de la clau. */
export async function authenticate(req: Request): Promise<{ keyId: string; name: string }> {
  const header = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  if (!match) throw new ApiError(401, "unauthorized", "Falta la capçalera 'Authorization: Bearer <API_KEY>'.");
  const key = match[1];
  if (!key.startsWith(KEY_PREFIX)) throw new ApiError(401, "unauthorized", "Format de clau invàlid (ha de començar per 'tl_').");
  const { data, error } = await db().from("api_keys").select("id, name, revoked_at").eq("key_hash", hashKey(key)).maybeSingle();
  if (error) throw new ApiError(500, "internal_error", "No s'ha pogut validar la clau.");
  if (!data) throw new ApiError(401, "unauthorized", "Clau d'API desconeguda.");
  if (data.revoked_at) throw new ApiError(401, "key_revoked", "Aquesta clau d'API està revocada.");
  // Darrer ús (no bloquegem la resposta si falla)
  void db().from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", data.id).then(() => undefined);
  return { keyId: data.id, name: data.name };
}
