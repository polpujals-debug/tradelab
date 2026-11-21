import "server-only";
import { addDays, localDate } from "@/lib/time";
import { db, maybe, must } from "@/lib/supabase/server";
import type { Update } from "@/lib/supabase/types";
import { attachImages, mediaFor } from "@/features/media/images";
import { resolveAsset, ServiceError } from "@/features/trades/service";
import type { AnalysisCreate, AnalysisList, AnalysisUpdate } from "./schemas";

const BIAS_TITLE = { bullish: "biaix alcista", bearish: "biaix baixista", neutral: "sense biaix clar" } as const;

export async function createAnalysis(input: AnalysisCreate) {
  const assetId = await resolveAsset(input.asset);
  const analyzedAt = input.analyzed_at ?? new Date().toISOString();
  const row = must(
    await db().from("analyses").insert({
      asset_id: assetId,
      title: input.title ?? `${input.asset.split("/")[0]} ${input.timeframes.join("/")}: ${BIAS_TITLE[input.bias]}`,
      timeframes: input.timeframes,
      bias: input.bias,
      levels: { supports: input.levels.supports, resistances: input.levels.resistances, ma50: input.levels.ma50 ?? null },
      content_md: input.content_md,
      scenario: input.scenario ?? null,
      review_at: addDays(localDate(analyzedAt), input.review_in_days),
      source: input.source,
      analyzed_at: analyzedAt,
    }).select("id").single(),
    "Crear anàlisi",
  );
  if (input.trade_id) {
    const r = await db().from("trades").update({ analysis_id: row.id }).eq("id", input.trade_id);
    if (r.error) throw new ServiceError(`No s'ha pogut vincular l'operació: ${r.error.message}`, 422);
  }
  if (input.images.length) await attachImages("analysis", row.id, "analysis", input.images, "analyses");
  return getAnalysis(row.id);
}

export async function updateAnalysis(id: string, input: AnalysisUpdate) {
  const exists = maybe(await db().from("analyses").select("id").eq("id", id).maybeSingle(), "Anàlisi");
  if (!exists) throw new ServiceError("Anàlisi no trobada", 404);
  const patch: Update<"analyses"> = {};
  if (input.outcome !== undefined) {
    patch.outcome = input.outcome;
    patch.reviewed_at = input.outcome === "pending" ? null : new Date().toISOString();
  }
  if (input.my_notes !== undefined) patch.my_notes = input.my_notes;
  if (input.questions !== undefined) patch.questions = input.questions;
  if (input.scenario !== undefined) patch.scenario = input.scenario;
  if (input.review_at !== undefined) patch.review_at = input.review_at;
  if (input.bias !== undefined) patch.bias = input.bias;
  if (input.content_md !== undefined) patch.content_md = input.content_md;
  if (input.levels !== undefined) patch.levels = { supports: input.levels.supports, resistances: input.levels.resistances, ma50: input.levels.ma50 ?? null };
  if (Object.keys(patch).length) {
    const r = await db().from("analyses").update(patch).eq("id", id);
    if (r.error) throw new ServiceError(r.error.message, 422);
  }
  if (input.trade_id !== undefined) {
    await db().from("trades").update({ analysis_id: null }).eq("analysis_id", id);
    if (input.trade_id) await db().from("trades").update({ analysis_id: id }).eq("id", input.trade_id);
  }
  if (input.images?.length) {
    const count = await db().from("media").select("id", { count: "exact", head: true }).eq("entity_type", "analysis").eq("entity_id", id);
    if ((count.count ?? 0) + input.images.length > 12) throw new ServiceError("Màxim 12 captures per anàlisi", 422);
    await attachImages("analysis", id, "analysis", input.images, "analyses");
  }
  return getAnalysis(id);
}

export async function getAnalysis(id: string) {
  const a = maybe(await db().from("analyses").select("*, assets(symbol)").eq("id", id).maybeSingle(), "Anàlisi");
  if (!a) return null;
  const [media, trades] = await Promise.all([
    mediaFor("analysis", [id]),
    db().from("trades").select("id, status, direction, created_at").eq("analysis_id", id),
  ]);
  return serialize(a, media.get(id) ?? [], must(trades, "Operacions"));
}

type Raw = NonNullable<Awaited<ReturnType<typeof rawList>>>[number];
async function rawList(q: Partial<AnalysisList>) {
  let query = db().from("analyses").select("*, assets!inner(symbol)");
  if (q.asset) query = query.eq("assets.symbol", q.asset);
  if (q.bias) query = query.eq("bias", q.bias);
  if (q.outcome) query = query.eq("outcome", q.outcome);
  if (q.timeframe) query = query.contains("timeframes", [q.timeframe]);
  if (q.from) query = query.gte("analyzed_at", `${q.from}T00:00:00Z`);
  if (q.to) query = query.lte("analyzed_at", `${q.to}T23:59:59Z`);
  return must(await query.order("analyzed_at", { ascending: false }).limit(q.limit ?? 50), "Anàlisis");
}

function serialize(a: Raw | (Omit<Raw, "assets"> & { assets: { symbol: string } | null }), media: { id: string; url: string; thumb_url: string | null; caption: string | null }[], trades: { id: string; status: string; direction: string; created_at: string }[] = []) {
  const { assets, asset_id: _assetId, ...rest } = a;
  void _assetId;
  const levels = (rest.levels ?? {}) as { supports?: number[]; resistances?: number[]; ma50?: number | null };
  return {
    ...rest,
    asset: assets?.symbol ?? null,
    levels: { supports: levels.supports ?? [], resistances: levels.resistances ?? [], ma50: levels.ma50 ?? null },
    images: media.map((m) => ({ id: m.id, url: m.url, thumb_url: m.thumb_url, caption: m.caption })),
    trades,
    review_due: rest.outcome === "pending" && !!rest.review_at && rest.review_at <= localDate(new Date()),
  };
}
export type AnalysisDTO = ReturnType<typeof serialize>;

export async function listAnalyses(q: Partial<AnalysisList> = {}) {
  const rows = await rawList(q);
  const media = await mediaFor("analysis", rows.map((r) => r.id));
  return rows.map((r) => serialize(r, media.get(r.id) ?? []));
}
