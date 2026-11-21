import "server-only";
import { calcPositionSize } from "@/lib/finance";
import { startOfWeek, zonedMidnightUtc } from "@/lib/time";
import { today as todayLocal } from "@/lib/today";
import { db, maybe, must } from "@/lib/supabase/server";
import type { Enum, Insert, Update } from "@/lib/supabase/types";
import type { StoredImage } from "@/lib/media/process-image";
import { getDefaultAccount, getSettings } from "@/features/settings/queries";
import type { TradeClose, TradeCreate, TradeUpdate } from "./schemas";

export class ServiceError extends Error {
  constructor(message: string, public status = 400, public details?: Record<string, string>) {
    super(message);
  }
}

/** Busca l'actiu pel símbol i el crea si no existeix. */
export async function resolveAsset(symbol: string): Promise<string> {
  const found = await db().from("assets").select("id").eq("symbol", symbol).maybeSingle();
  if (found.data) return found.data.id;
  return must(await db().from("assets").upsert({ symbol }, { onConflict: "symbol" }).select("id").single(), "Crear actiu").id;
}

export async function getActiveStrategyId(): Promise<string | null> {
  const res = await db().from("strategies").select("id").eq("is_active", true).maybeSingle();
  return res.data?.id ?? null;
}

async function accountCapital(accountId: string): Promise<number> {
  const row = must(await db().from("v_account_balance").select("current_capital, initial_capital").eq("account_id", accountId).single(), "Capital");
  return Number(row.current_capital ?? row.initial_capital);
}

async function setRuleChecks(tradeId: string, checks: { rule_id: string; passed: boolean }[]) {
  await db().from("trade_rule_checks").delete().eq("trade_id", tradeId);
  if (checks.length === 0) return;
  must(await db().from("trade_rule_checks").insert(checks.map((c) => ({ trade_id: tradeId, ...c }))).select("rule_id"), "Checklist");
}

async function setTags(tradeId: string, tags: { kind: Enum<"tag_kind">; name: string }[]) {
  await db().from("trade_tags").delete().eq("trade_id", tradeId);
  if (tags.length === 0) return;
  const unique = [...new Map(tags.map((t) => [`${t.kind}:${t.name.toLowerCase()}`, t])).values()];
  const rows = must(
    await db().from("tags").upsert(unique.map((t) => ({ kind: t.kind, name: t.name })), { onConflict: "kind,name" }).select("id"),
    "Etiquetes",
  );
  must(await db().from("trade_tags").insert(rows.map((r) => ({ trade_id: tradeId, tag_id: r.id }))).select("tag_id"), "Etiquetes de l'operació");
}

export async function createTrade(input: TradeCreate): Promise<{ id: string }> {
  const account = input.account_id ? { id: input.account_id } : await getDefaultAccount();
  const capital = input.capital_at_entry ?? (await accountCapital(account.id));
  const assetId = await resolveAsset(input.asset);
  const strategyId = input.strategy_id === undefined ? await getActiveStrategyId() : input.strategy_id;
  const direction = input.direction ?? (input.stop_loss < input.entry_price ? "long" : "short");

  let quantity = input.quantity;
  if (quantity === undefined) {
    const riskPct = input.risk_pct ?? Number((await getSettings()).default_risk_pct);
    quantity = calcPositionSize({ capital, riskPct, entry: input.entry_price, stop: input.stop_loss }).quantity;
  }

  const now = new Date().toISOString();
  const row: Insert<"trades"> = {
    account_id: account.id,
    asset_id: assetId,
    strategy_id: strategyId,
    analysis_id: input.analysis_id ?? null,
    direction,
    status: input.status,
    entry_at: input.entry_at ?? (input.status === "open" || input.status === "closed" ? now : null),
    exit_at: input.status === "closed" ? (input.exit_at ?? now) : (input.exit_at ?? null),
    entry_price: input.entry_price,
    stop_loss: input.stop_loss,
    take_profit: input.take_profit ?? null,
    exit_price: input.exit_price ?? null,
    quantity,
    leverage: input.leverage,
    fees: input.fees,
    capital_at_entry: capital,
    bias_1h: input.bias_1h ?? null,
    confirmation_5m: input.confirmation_5m ?? null,
    trigger_1m: input.trigger_1m ?? null,
    setup: input.setup ?? null,
    emotion_before: input.emotion_before ?? null,
    emotion_after: input.emotion_after ?? null,
    notes: input.notes ?? null,
    lesson: input.lesson ?? null,
    source: input.source,
  };
  const { id } = must(await db().from("trades").insert(row).select("id").single(), "Crear operació");

  if (input.rule_checks) await setRuleChecks(id, input.rule_checks);
  const tags = [...(input.tags ?? [])];
  if (input.setup) tags.push({ kind: "setup", name: input.setup });
  if (input.emotion_before) tags.push({ kind: "emotion", name: input.emotion_before });
  if (tags.length) await setTags(id, tags);
  return { id };
}

export async function updateTrade(id: string, input: TradeUpdate): Promise<void> {
  const current = maybe(await db().from("trades").select("*").eq("id", id).maybeSingle(), "Operació");
  if (!current) throw new ServiceError("Operació no trobada", 404);

  const patch: Update<"trades"> = {};
  const assign = <K extends keyof Update<"trades">>(k: K, v: Update<"trades">[K] | undefined) => {
    if (v !== undefined) patch[k] = v;
  };
  if (input.asset) patch.asset_id = await resolveAsset(input.asset);
  assign("account_id", input.account_id);
  assign("strategy_id", input.strategy_id);
  assign("analysis_id", input.analysis_id);
  assign("direction", input.direction);
  assign("status", input.status);
  assign("entry_at", input.entry_at);
  assign("exit_at", input.exit_at);
  assign("entry_price", input.entry_price);
  assign("stop_loss", input.stop_loss);
  assign("take_profit", input.take_profit);
  assign("exit_price", input.exit_price);
  assign("quantity", input.quantity);
  assign("leverage", input.leverage);
  assign("fees", input.fees);
  assign("capital_at_entry", input.capital_at_entry);
  assign("bias_1h", input.bias_1h);
  assign("confirmation_5m", input.confirmation_5m);
  assign("trigger_1m", input.trigger_1m);
  assign("setup", input.setup);
  assign("emotion_before", input.emotion_before);
  assign("emotion_after", input.emotion_after);
  assign("notes", input.notes);
  assign("lesson", input.lesson);

  // Coherència amb els valors ja desats
  const entry = patch.entry_price ?? Number(current.entry_price);
  const stop = patch.stop_loss ?? Number(current.stop_loss);
  if (!input.direction && (patch.entry_price !== undefined || patch.stop_loss !== undefined)) {
    patch.direction = stop < entry ? "long" : "short";
  }
  const status = patch.status ?? current.status;
  if (status === "closed") {
    if ((patch.exit_price ?? current.exit_price) == null) throw new ServiceError("Una operació tancada necessita preu de sortida.", 422, { exit_price: "Obligatori" });
    if ((patch.exit_at ?? current.exit_at) == null) patch.exit_at = new Date().toISOString();
  }
  if ((status === "open" || status === "closed") && (patch.entry_at ?? current.entry_at) == null) patch.entry_at = new Date().toISOString();

  if (Object.keys(patch).length) {
    const res = await db().from("trades").update(patch).eq("id", id);
    if (res.error) throw new ServiceError(res.error.message, 422);
  }
  if (input.rule_checks) await setRuleChecks(id, input.rule_checks);
  if (input.tags) {
    const tags = [...input.tags];
    const setup = input.setup ?? current.setup;
    const emo = input.emotion_before ?? current.emotion_before;
    if (setup) tags.push({ kind: "setup", name: setup });
    if (emo) tags.push({ kind: "emotion", name: emo });
    await setTags(id, tags);
  }
}

export async function closeTrade(id: string, input: TradeClose): Promise<void> {
  await updateTrade(id, {
    status: "closed",
    exit_price: input.exit_price,
    exit_at: input.exit_at ?? new Date().toISOString(),
    fees: input.fees,
    emotion_after: input.emotion_after,
    lesson: input.lesson,
    notes: input.notes,
  });
}

export async function deleteTrade(id: string): Promise<string[]> {
  const media = must(await db().from("media").select("storage_path").eq("entity_type", "trade").eq("entity_id", id), "Media");
  await db().from("media").delete().eq("entity_type", "trade").eq("entity_id", id);
  const res = await db().from("trades").delete().eq("id", id);
  if (res.error) throw new ServiceError(res.error.message, 400);
  return media.map((m) => m.storage_path).filter((p): p is string => !!p);
}

export async function attachMedia(
  entity: Enum<"media_entity">,
  entityId: string,
  kind: Enum<"media_kind">,
  img: StoredImage,
  caption?: string | null,
) {
  const count = await db().from("media").select("id", { count: "exact", head: true }).eq("entity_type", entity).eq("entity_id", entityId);
  return must(
    await db()
      .from("media")
      .insert({
        entity_type: entity, entity_id: entityId, kind, url: img.url, thumb_url: img.thumbUrl, storage_path: img.storagePath,
        mime_type: img.mimeType, width: img.width, height: img.height, size_bytes: img.sizeBytes, caption: caption ?? null,
        sort_order: count.count ?? 0,
      })
      .select("*")
      .single(),
    "Desar captura",
  );
}

/** Estat de disciplina del dia/setmana (hora de Madrid). */
export async function disciplineState(accountId: string) {
  const today = await todayLocal();
  const weekStart = startOfWeek(today);
  const [daily, opened] = await Promise.all([
    db().from("v_daily_pnl").select("day, net_pnl").eq("account_id", accountId).gte("day", weekStart),
    db().from("trades").select("id", { count: "exact", head: true }).eq("account_id", accountId)
      .in("status", ["open", "closed"]).gte("entry_at", zonedMidnightUtc(today).toISOString()),
  ]);
  const rows = must(daily, "P&L diari");
  return {
    todayPnl: rows.filter((r) => r.day === today).reduce((s, r) => s + Number(r.net_pnl ?? 0), 0),
    weekPnl: rows.reduce((s, r) => s + Number(r.net_pnl ?? 0), 0),
    tradesToday: opened.count ?? 0,
  };
}
