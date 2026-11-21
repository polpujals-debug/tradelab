"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { generateKey } from "@/lib/api/keys";
import { db } from "@/lib/supabase/server";

export async function createApiKeyAction(name: string): Promise<{ ok: true; key: string } | { ok: false; message: string }> {
  const n = z.string().trim().min(2, "Posa-li un nom (ex.: Claude xat)").max(60).safeParse(name);
  if (!n.success) return { ok: false, message: n.error.issues[0].message };
  const { key, hash, prefix } = generateKey();
  const res = await db().from("api_keys").insert({ name: n.data, key_hash: hash, prefix });
  if (res.error) return { ok: false, message: res.error.message };
  revalidatePath("/configuracio");
  return { ok: true, key };
}

export async function revokeApiKeyAction(id: string): Promise<{ ok: boolean; message?: string }> {
  const res = await db().from("api_keys").update({ revoked_at: new Date().toISOString() }).eq("id", z.uuid().parse(id));
  if (res.error) return { ok: false, message: res.error.message };
  revalidatePath("/configuracio");
  return { ok: true };
}
