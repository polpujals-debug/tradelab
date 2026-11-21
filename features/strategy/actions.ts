"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, must } from "@/lib/supabase/server";
import type { FormState } from "@/features/trades/actions";

const uuid = z.uuid();
const done = (message: string): FormState => {
  revalidatePath("/estrategia");
  revalidatePath("/diari", "layout");
  return { ok: true, message };
};
const err = (e: unknown): FormState => ({ ok: false, message: e instanceof Error ? e.message : "Error" });

export async function saveDescriptionAction(id: string, description: string): Promise<FormState> {
  try {
    uuid.parse(id);
    const md = z.string().max(50_000).parse(description);
    const res = await db().from("strategies").update({ description_md: md }).eq("id", id);
    if (res.error) throw new Error(res.error.message);
    return done("Estratègia desada");
  } catch (e) {
    return err(e);
  }
}

export async function addRuleAction(strategyId: string, text: string): Promise<FormState> {
  try {
    uuid.parse(strategyId);
    const t = z.string().trim().min(3, "Massa curt").max(300).parse(text);
    const last = await db().from("strategy_rules").select("sort_order").eq("strategy_id", strategyId).order("sort_order", { ascending: false }).limit(1);
    const order = (last.data?.[0]?.sort_order ?? 0) + 1;
    must(await db().from("strategy_rules").insert({ strategy_id: strategyId, text: t, sort_order: order }).select("id").single(), "Afegir regla");
    return done("Regla afegida");
  } catch (e) {
    return err(e);
  }
}

export async function updateRuleAction(id: string, patch: { text?: string; is_required?: boolean }): Promise<FormState> {
  try {
    uuid.parse(id);
    const p = z.object({ text: z.string().trim().min(3).max(300).optional(), is_required: z.boolean().optional() }).parse(patch);
    const res = await db().from("strategy_rules").update(p).eq("id", id);
    if (res.error) throw new Error(res.error.message);
    return done("Regla actualitzada");
  } catch (e) {
    return err(e);
  }
}

export async function deleteRuleAction(id: string): Promise<FormState> {
  try {
    uuid.parse(id);
    const res = await db().from("strategy_rules").delete().eq("id", id);
    if (res.error) throw new Error(res.error.message);
    return done("Regla eliminada");
  } catch (e) {
    return err(e);
  }
}

export async function moveRuleAction(strategyId: string, id: string, dir: -1 | 1): Promise<FormState> {
  try {
    const rules = must(await db().from("strategy_rules").select("id, sort_order").eq("strategy_id", strategyId).order("sort_order"), "Regles");
    const i = rules.findIndex((r) => r.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= rules.length) return { ok: true };
    [rules[i], rules[j]] = [rules[j], rules[i]];
    await Promise.all(rules.map((r, idx) => db().from("strategy_rules").update({ sort_order: idx + 1 }).eq("id", r.id)));
    return done("Ordre actualitzat");
  } catch (e) {
    return err(e);
  }
}

export async function activateStrategyAction(id: string): Promise<FormState> {
  try {
    uuid.parse(id);
    await db().from("strategies").update({ is_active: false }).eq("is_active", true);
    const res = await db().from("strategies").update({ is_active: true }).eq("id", id);
    if (res.error) throw new Error(res.error.message);
    return done("Versió activada");
  } catch (e) {
    return err(e);
  }
}

/** Duplica una versió (descripció + regles) com a versió nova i l'activa. */
export async function newVersionAction(fromId: string): Promise<FormState> {
  try {
    uuid.parse(fromId);
    const src = must(await db().from("strategies").select("*").eq("id", fromId).single(), "Estratègia");
    const max = must(await db().from("strategies").select("version").eq("name", src.name).order("version", { ascending: false }).limit(1), "Versions");
    const rules = must(await db().from("strategy_rules").select("text, sort_order, is_required").eq("strategy_id", fromId).order("sort_order"), "Regles");
    await db().from("strategies").update({ is_active: false }).eq("is_active", true);
    const created = must(
      await db().from("strategies").insert({
        name: src.name, version: (max[0]?.version ?? src.version) + 1, description_md: src.description_md,
        timeframes: src.timeframes, indicators: src.indicators, is_active: true,
      }).select("id, version").single(),
      "Nova versió",
    );
    if (rules.length) must(await db().from("strategy_rules").insert(rules.map((r) => ({ ...r, strategy_id: created.id }))).select("id"), "Copiar regles");
    return done(`Creada la v${created.version}`);
  } catch (e) {
    return err(e);
  }
}
