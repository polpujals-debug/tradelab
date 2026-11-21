import "server-only";
import { db, maybe, must } from "@/lib/supabase/server";
import { today as todayLocal } from "@/lib/today";
import { mediaFor } from "@/features/media/images";
import { activeDays } from "@/features/performance/service";
import { goalProgress } from "./goals";

export async function listConcepts() {
  return must(await db().from("concepts").select("id, slug, title, category, summary, status, sort_order").order("sort_order"), "Conceptes");
}

export async function getConcept(slug: string) {
  const c = maybe(await db().from("concepts").select("*").eq("slug", slug).maybeSingle(), "Concepte");
  if (!c) return null;
  const ex = must(await db().from("concept_examples").select("id, note, analysis_id, trade_id, analyses(id, title, bias)").eq("concept_id", c.id), "Exemples");
  const media = await mediaFor("analysis", ex.map((e) => e.analysis_id).filter((x): x is string => !!x));
  return {
    ...c,
    examples: ex.map((e) => ({ id: e.id, note: e.note, analysis: e.analyses, image: e.analysis_id ? (media.get(e.analysis_id)?.[0] ?? null) : null })),
  };
}

/** Errors més freqüents i el que han costat. */
export async function errorReview() {
  const stats = must(await db().from("v_tag_stats").select("*").eq("kind", "error"), "Errors");
  const closed = must(await db().from("v_trade_metrics").select("id, net_pnl").eq("status", "closed"), "Operacions");
  const taggedIds = new Set(must(await db().from("trade_tags").select("trade_id, tags!inner(kind)").eq("tags.kind", "error"), "Etiquetes").map((t) => t.trade_id));
  const clean = closed.filter((t) => !taggedIds.has(t.id ?? ""));
  const withErr = closed.filter((t) => taggedIds.has(t.id ?? ""));
  const avg = (arr: typeof closed) => (arr.length ? arr.reduce((s, t) => s + Number(t.net_pnl ?? 0), 0) / arr.length : null);
  return {
    errors: stats
      .filter((s) => Number(s.trades) > 0)
      .map((s) => ({ name: s.name ?? "", trades: Number(s.trades), wins: Number(s.wins), netPnl: Number(s.net_pnl), lossesPnl: Number(s.losses_pnl), avgR: s.avg_r == null ? null : Number(s.avg_r) }))
      .sort((a, b) => a.netPnl - b.netPnl),
    totalCost: stats.reduce((s, e) => s + Math.min(0, Number(e.net_pnl ?? 0)), 0),
    tradesWithErrors: withErr.length,
    tradesClean: clean.length,
    avgWithErrors: avg(withErr),
    avgClean: avg(clean),
  };
}

export async function listGoalsWithProgress() {
  const [goals, trades, days, today] = await Promise.all([
    db().from("goals").select("*").order("deadline", { ascending: true, nullsFirst: false }),
    db().from("v_trade_metrics").select("local_date, net_pnl").eq("status", "closed"),
    activeDays(),
    todayLocal(),
  ]);
  const tradeRows = must(trades, "Operacions");
  return { today, goals: must(goals, "Objectius").map((g) => ({ ...g, progress: goalProgress(g, tradeRows, days, today) })) };
}

// ───────── Mode pràctica ─────────

export interface PracticeQuestion {
  kind: "analysis" | "trade";
  id: string;
  image: string;
  asset: string | null;
  timeframes: string[];
  date: string;
  /** Preu de referència per ajudar a respondre l'SL (entrada de l'operació). */
  entry: number | null;
}

/** Tria una captura antiga (anàlisi revisada o operació tancada amb captura "abans"). */
export async function nextPracticeQuestion(excludeIds: string[] = []): Promise<PracticeQuestion | null> {
  const [analyses, tradeMedia] = await Promise.all([
    db().from("analyses").select("id, analyzed_at, timeframes, assets(symbol)").neq("outcome", "pending").order("analyzed_at", { ascending: false }).limit(60),
    db().from("media").select("entity_id, url").eq("entity_type", "trade").eq("kind", "before").limit(60),
  ]);
  const aRows = must(analyses, "Anàlisis");
  const aMedia = await mediaFor("analysis", aRows.map((a) => a.id));
  const pool: PracticeQuestion[] = [];
  for (const a of aRows) {
    const img = aMedia.get(a.id)?.[0];
    if (img) pool.push({ kind: "analysis", id: a.id, image: img.url, asset: a.assets?.symbol ?? null, timeframes: a.timeframes, date: a.analyzed_at, entry: null });
  }
  const tm = must(tradeMedia, "Captures").filter((m) => m.entity_id);
  if (tm.length) {
    const trades = must(await db().from("v_trade_metrics").select("id, symbol, entry_price, entry_at, status").in("id", tm.map((m) => m.entity_id!)).eq("status", "closed"), "Operacions");
    for (const t of trades) {
      const img = tm.find((m) => m.entity_id === t.id);
      if (img && t.id) pool.push({ kind: "trade", id: t.id, image: img.url, asset: t.symbol, timeframes: ["5m"], date: t.entry_at ?? "", entry: t.entry_price });
    }
  }
  const candidates = pool.filter((q) => !excludeIds.includes(q.id));
  const list = candidates.length ? candidates : pool;
  if (!list.length) return null;
  return list[Math.floor(Math.random() * list.length)];
}

export interface PracticeReveal {
  correctBias: "bullish" | "bearish" | "neutral" | null;
  biasCorrect: boolean;
  stop: number | null;
  stopDiffPct: number | null;
  explanation: string;
  outcome: string | null;
  link: string;
}

export async function revealPractice(kind: "analysis" | "trade", id: string, answerBias: "bullish" | "bearish" | "neutral", answerStop: number | null): Promise<PracticeReveal> {
  let reveal: PracticeReveal;
  if (kind === "analysis") {
    const a = must(await db().from("analyses").select("bias, levels, scenario, content_md, outcome").eq("id", id).single(), "Anàlisi");
    const levels = a.levels as { supports?: number[]; resistances?: number[] };
    const stop = a.bias === "bullish" ? (levels.supports?.[0] ?? null) : a.bias === "bearish" ? (levels.resistances?.[0] ?? null) : null;
    reveal = {
      correctBias: a.bias, biasCorrect: a.bias === answerBias, stop,
      stopDiffPct: stop && answerStop ? ((answerStop - stop) / stop) * 100 : null,
      explanation: `${a.scenario ? `**Escenari:** ${a.scenario}\n\n` : ""}${a.content_md}`,
      outcome: a.outcome, link: `/analisis/${id}`,
    };
  } else {
    const t = must(await db().from("trades").select("direction, stop_loss, bias_1h, confirmation_5m, trigger_1m, notes, lesson, entry_price").eq("id", id).single(), "Operació");
    const bias = t.bias_1h ?? (t.direction === "long" ? "bullish" : "bearish");
    const m = maybe(await db().from("v_trade_metrics").select("net_pnl, r_multiple").eq("id", id).maybeSingle(), "Mètriques");
    reveal = {
      correctBias: bias, biasCorrect: bias === answerBias, stop: Number(t.stop_loss),
      stopDiffPct: answerStop ? ((answerStop - Number(t.stop_loss)) / Number(t.stop_loss)) * 100 : null,
      explanation: [
        `**Direcció:** ${t.direction === "long" ? "long" : "short"} des de ${t.entry_price}`,
        t.confirmation_5m && `**Confirmació 5m:** ${t.confirmation_5m}`,
        t.trigger_1m && `**Gatell 1m:** ${t.trigger_1m}`,
        m && `**Resultat:** ${Number(m.net_pnl) >= 0 ? "+" : ""}${Number(m.net_pnl).toFixed(2)} € (${Number(m.r_multiple).toFixed(2)}R)`,
        t.lesson && `**Lliçó:** ${t.lesson}`,
      ].filter(Boolean).join("\n\n"),
      outcome: null, link: `/diari/${id}`,
    };
  }
  await db().from("practice_attempts").insert({
    analysis_id: kind === "analysis" ? id : null, trade_id: kind === "trade" ? id : null,
    answer_bias: answerBias, answer_stop: answerStop, bias_correct: reveal.biasCorrect,
  });
  return reveal;
}

export async function practiceStats() {
  const rows = must(await db().from("practice_attempts").select("bias_correct, created_at").order("created_at", { ascending: false }).limit(200), "Pràctica");
  const last20 = rows.slice(0, 20);
  return {
    total: rows.length,
    accuracy: rows.length ? (rows.filter((r) => r.bias_correct).length / rows.length) * 100 : null,
    recentAccuracy: last20.length ? (last20.filter((r) => r.bias_correct).length / last20.length) * 100 : null,
  };
}
