import "server-only";
import { db, must } from "@/lib/supabase/server";
import type { Row } from "@/lib/supabase/types";

export type Settings = Row<"settings">;

export async function getSettings(): Promise<Settings> {
  return must(await db().from("settings").select("*").eq("id", 1).single(), "Configuració");
}

export async function getDefaultAccount() {
  const settings = await getSettings();
  const q = db().from("v_account_balance").select("*");
  const res = settings.default_account_id
    ? await q.eq("account_id", settings.default_account_id).single()
    : await q.limit(1).single();
  const account = must(res, "Compte per defecte");
  return {
    id: account.account_id,
    name: account.name,
    type: account.type,
    currency: account.currency,
    initialCapital: Number(account.initial_capital),
    currentCapital: Number(account.current_capital ?? account.initial_capital),
  };
}

export async function listAccounts() {
  return must(await db().from("v_account_balance").select("*").order("name"), "Comptes");
}

export async function listAssets() {
  return must(await db().from("assets").select("*").order("is_favorite", { ascending: false }).order("symbol"), "Actius");
}

export async function listTags() {
  return must(await db().from("tags").select("*").order("kind").order("name"), "Etiquetes");
}
