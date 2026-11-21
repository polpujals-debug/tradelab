import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import type { Database } from "./database.types";

export type DB = SupabaseClient<Database>;

/**
 * Client de Supabase només per al servidor (service role).
 * La plataforma és d'un sol usuari i no té login: el navegador mai parla
 * directament amb Supabase; tot passa per Server Components, Server Actions
 * i Route Handlers. RLS bloqueja qualsevol accés amb la clau pública.
 */
let client: DB | null = null;

export function db(): DB {
  if (client) return client;
  const e = env();
  client = createClient<Database>(e.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

/** Llença un error llegible si la consulta falla. */
export function must<T>(res: { data: T; error: { message: string } | null }, context: string): NonNullable<T> {
  if (res.error) throw new Error(`${context}: ${res.error.message}`);
  if (res.data === null || res.data === undefined) throw new Error(`${context}: sense dades`);
  return res.data as NonNullable<T>;
}

/** Com `must`, però per a consultes que poden no trobar res (maybeSingle). */
export function maybe<T>(res: { data: T; error: { message: string } | null }, context: string): T | null {
  if (res.error) throw new Error(`${context}: ${res.error.message}`);
  return res.data ?? null;
}
