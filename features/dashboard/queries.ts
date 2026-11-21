import "server-only";
import { db, maybe } from "@/lib/supabase/server";

export async function getLatestAnalysis() {
  const a = maybe(await db().from("analyses").select("id, title, bias, timeframes, scenario, outcome, analyzed_at, assets(symbol)").order("analyzed_at", { ascending: false }).limit(1).maybeSingle(), "Anàlisi");
  if (!a) return null;
  const m = maybe(await db().from("media").select("thumb_url, url").eq("entity_type", "analysis").eq("entity_id", a.id).order("sort_order").limit(1).maybeSingle(), "Captura");
  return { ...a, thumb: m?.thumb_url ?? m?.url ?? null };
}

export async function getLatestReport() {
  return maybe(await db().from("market_reports").select("id, title, summary, type, report_date, is_read, btc_bias, eth_bias").order("report_date", { ascending: false }).order("created_at", { ascending: false }).limit(1).maybeSingle(), "Informe");
}
