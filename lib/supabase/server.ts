import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Client de Supabase només per al servidor (service role).
 * La plataforma és d'un sol usuari i no té login: el navegador mai parla
 * directament amb Supabase; tot passa per Server Components, Server Actions
 * i Route Handlers. RLS bloqueja qualsevol accés amb la clau pública.
 */
let client: SupabaseClient | null = null;

export function db(): SupabaseClient {
  if (client) return client;
  const e = env();
  client = createClient(e.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

/** Llença un error llegible si la consulta falla. */
export function must<T>(res: { data: T | null; error: { message: string } | null }, context: string): T {
  if (res.error) throw new Error(`${context}: ${res.error.message}`);
  if (res.data === null) throw new Error(`${context}: sense dades`);
  return res.data;
}
