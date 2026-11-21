import "server-only";
import { localDate } from "@/lib/time";
import { db, maybe, must } from "@/lib/supabase/server";
import { attachImages, mediaFor } from "@/features/media/images";
import type { MarketReportCreate } from "./schemas";

/**
 * Publica un informe. Si arriba amb una clau d'idempotència que ja existeix,
 * retorna l'informe existent en lloc de duplicar-lo.
 */
export async function publishMarketReport(input: MarketReportCreate, idempotencyKey: string | null) {
  if (idempotencyKey) {
    const existing = maybe(await db().from("market_reports").select("id").eq("idempotency_key", idempotencyKey).maybeSingle(), "Informe");
    if (existing) return { report: await getMarketReport(existing.id), created: false };
  }
  const row = await db().from("market_reports").insert({
    type: input.type,
    title: input.title,
    summary: input.summary ?? null,
    content_md: input.content_md,
    report_date: input.report_date ?? localDate(new Date()),
    btc_bias: input.btc_bias ?? null,
    eth_bias: input.eth_bias ?? null,
    watchlist: input.watchlist,
    source: "scheduled",
    idempotency_key: idempotencyKey,
  }).select("id").single();
  if (row.error?.code === "23505" && idempotencyKey) {
    // Cursa: una altra petició amb la mateixa clau ha guanyat
    const existing = must(await db().from("market_reports").select("id").eq("idempotency_key", idempotencyKey).single(), "Informe");
    return { report: await getMarketReport(existing.id), created: false };
  }
  const { id } = must(row, "Publicar informe");
  if (input.images.length) await attachImages("market_report", id, "report", input.images, "reports");
  return { report: await getMarketReport(id), created: true };
}

export async function getMarketReport(id: string) {
  const r = maybe(await db().from("market_reports").select("*").eq("id", id).maybeSingle(), "Informe");
  if (!r) return null;
  const media = await mediaFor("market_report", [id]);
  return { ...r, images: (media.get(id) ?? []).map((m) => ({ id: m.id, url: m.url, thumb_url: m.thumb_url, caption: m.caption })) };
}

export async function listMarketReports(q: { type?: "daily" | "weekly" | "adhoc"; unread?: boolean; limit?: number } = {}) {
  let query = db().from("market_reports").select("id, type, title, summary, report_date, btc_bias, eth_bias, watchlist, is_read, source, created_at");
  if (q.type) query = query.eq("type", q.type);
  if (q.unread) query = query.eq("is_read", false);
  return must(await query.order("report_date", { ascending: false }).order("created_at", { ascending: false }).limit(q.limit ?? 30), "Informes");
}

export async function setReportRead(id: string, isRead: boolean) {
  const r = await db().from("market_reports").update({ is_read: isRead }).eq("id", id);
  if (r.error) throw new Error(r.error.message);
}
