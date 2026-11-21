import "server-only";
import { zonedMidnightUtc, addDays } from "@/lib/time";
import { db, maybe, must } from "@/lib/supabase/server";
import type { Row, ViewRow } from "@/lib/supabase/types";
import type { TradeListQuery } from "./schemas";

export type TradeMetrics = ViewRow<"v_trade_metrics">;
export type TagRow = Pick<Row<"tags">, "id" | "name" | "kind" | "color">;
export type MediaRow = Row<"media">;

export interface TradeListItem extends TradeMetrics {
  tags: TagRow[];
  thumb: string | null;
}

export async function listTrades(q: Partial<TradeListQuery> = {}): Promise<TradeListItem[]> {
  let query = db().from("v_trade_metrics").select("*");
  if (q.status) query = query.eq("status", q.status);
  if (q.asset) query = query.eq("symbol", q.asset);
  if (q.direction) query = query.eq("direction", q.direction);
  if (q.setup) query = query.eq("setup", q.setup);
  if (q.result === "win") query = query.gt("net_pnl", 0);
  if (q.result === "loss") query = query.lt("net_pnl", 0);
  if (q.result === "breakeven") query = query.eq("net_pnl", 0);
  if (q.from) query = query.gte("local_date", q.from);
  if (q.to) query = query.lte("local_date", q.to);
  if (q.tag) {
    const tagged = must(await db().from("trade_tags").select("trade_id, tags!inner(name)").eq("tags.name", q.tag), "Filtre d'etiqueta");
    const ids = tagged.map((t) => t.trade_id);
    if (ids.length === 0) return [];
    query = query.in("id", ids);
  }
  const rows = must(
    await query.order("local_date", { ascending: false }).order("created_at", { ascending: false }).limit(q.limit ?? 100),
    "Operacions",
  );
  return enrich(rows);
}

async function enrich(rows: TradeMetrics[]): Promise<TradeListItem[]> {
  const ids = rows.map((r) => r.id).filter((id): id is string => !!id);
  if (ids.length === 0) return [];
  const [tags, media] = await Promise.all([
    db().from("trade_tags").select("trade_id, tags(id, name, kind, color)").in("trade_id", ids),
    db().from("media").select("entity_id, thumb_url, url, sort_order").eq("entity_type", "trade").in("entity_id", ids).order("sort_order"),
  ]);
  const tagMap = new Map<string, TagRow[]>();
  for (const t of must(tags, "Etiquetes")) {
    if (!t.tags) continue;
    const list = tagMap.get(t.trade_id) ?? [];
    list.push(t.tags);
    tagMap.set(t.trade_id, list);
  }
  const thumbMap = new Map<string, string>();
  for (const m of must(media, "Captures")) {
    if (m.entity_id && !thumbMap.has(m.entity_id)) thumbMap.set(m.entity_id, m.thumb_url ?? m.url);
  }
  return rows.map((r) => ({ ...r, tags: tagMap.get(r.id ?? "") ?? [], thumb: thumbMap.get(r.id ?? "") ?? null }));
}

export async function getTrade(id: string) {
  const metrics = maybe(await db().from("v_trade_metrics").select("*").eq("id", id).maybeSingle(), "Operació");
  if (!metrics) return null;
  const [raw, media, tags, checks, analysis] = await Promise.all([
    db().from("trades").select("*").eq("id", id).single(),
    db().from("media").select("*").eq("entity_type", "trade").eq("entity_id", id).order("sort_order"),
    db().from("trade_tags").select("tags(id, name, kind, color)").eq("trade_id", id),
    db().from("trade_rule_checks").select("rule_id, passed").eq("trade_id", id),
    metrics.analysis_id ? db().from("analyses").select("id, title, bias, analyzed_at").eq("id", metrics.analysis_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);
  const rules = metrics.strategy_id
    ? must(await db().from("strategy_rules").select("*").eq("strategy_id", metrics.strategy_id).order("sort_order"), "Regles")
    : [];
  const strategy = metrics.strategy_id ? (await db().from("strategies").select("id, name, version").eq("id", metrics.strategy_id).maybeSingle()).data : null;
  const checkMap = new Map(must(checks, "Checklist").map((c) => [c.rule_id, c.passed]));
  return {
    metrics,
    trade: must(raw, "Operació"),
    media: must(media, "Captures"),
    tags: must(tags, "Etiquetes").flatMap((t) => (t.tags ? [t.tags] : [])),
    checklist: rules.map((r) => ({ ...r, passed: checkMap.get(r.id) ?? false })),
    strategy,
    analysis: analysis.data,
  };
}
export type TradeDetail = NonNullable<Awaited<ReturnType<typeof getTrade>>>;

export async function listSetups(): Promise<string[]> {
  const rows = must(await db().from("tags").select("name").eq("kind", "setup").order("name"), "Setups");
  return rows.map((r) => r.name);
}

/** Operacions tancades en un rang de dies locals [from, to]. */
export async function closedTradesBetween(from: string | null, to: string | null, accountId?: string) {
  let q = db().from("v_trade_metrics").select("*").eq("status", "closed");
  if (accountId) q = q.eq("account_id", accountId);
  if (from) q = q.gte("exit_at", zonedMidnightUtc(from).toISOString());
  if (to) q = q.lt("exit_at", zonedMidnightUtc(addDays(to, 1)).toISOString());
  return must(await q.order("exit_at", { ascending: true }), "Operacions tancades");
}
