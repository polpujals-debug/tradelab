"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/supabase/server";
import type { FormState } from "@/features/trades/actions";
import { nextPracticeQuestion, revealPractice, type PracticeQuestion, type PracticeReveal } from "./service";

const done = (m?: string): FormState => {
  revalidatePath("/aprenentatge", "layout");
  return { ok: true, message: m };
};
const fail = (e: unknown): FormState => ({ ok: false, message: e instanceof z.ZodError ? e.issues[0].message : e instanceof Error ? e.message : "Error" });

export async function setConceptStatusAction(id: string, status: "pending" | "learning" | "mastered"): Promise<FormState> {
  try {
    const r = await db().from("concepts").update({ status: z.enum(["pending", "learning", "mastered"]).parse(status) }).eq("id", z.uuid().parse(id));
    if (r.error) throw new Error(r.error.message);
    return done();
  } catch (e) { return fail(e); }
}

export async function saveConceptAction(id: string, content: string): Promise<FormState> {
  try {
    const r = await db().from("concepts").update({ content_md: z.string().max(50_000).parse(content) }).eq("id", z.uuid().parse(id));
    if (r.error) throw new Error(r.error.message);
    return done("Concepte desat");
  } catch (e) { return fail(e); }
}

export async function addConceptExampleAction(conceptId: string, analysisId: string, note: string): Promise<FormState> {
  try {
    const r = await db().from("concept_examples").insert({ concept_id: z.uuid().parse(conceptId), analysis_id: z.uuid().parse(analysisId), note: note.trim() || null });
    if (r.error) throw new Error(r.error.message);
    return done("Exemple afegit");
  } catch (e) { return fail(e); }
}

export async function removeConceptExampleAction(id: string): Promise<FormState> {
  try {
    await db().from("concept_examples").delete().eq("id", z.uuid().parse(id));
    return done("Exemple tret");
  } catch (e) { return fail(e); }
}

export async function createConceptAction(title: string, category: string): Promise<FormState> {
  try {
    const t = z.string().trim().min(3).max(80).parse(title);
    const slug = t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const r = await db().from("concepts").insert({ title: t, slug: `${slug}-${Date.now().toString(36).slice(-4)}`, category: z.string().trim().min(2).max(40).parse(category), sort_order: 999 });
    if (r.error) throw new Error(r.error.message);
    return done("Concepte creat");
  } catch (e) { return fail(e); }
}

// ── Objectius ──
const goalSchema = z.object({
  title: z.string().trim().min(3, "Títol massa curt").max(120),
  kind: z.enum(["journal_streak", "winning_trades", "trades_count", "net_pnl", "win_rate", "custom"]),
  target: z.coerce.number().positive("L'objectiu ha de ser positiu"),
  starts_on: z.iso.date(),
  deadline: z.preprocess((v) => (v === "" ? null : v), z.iso.date().nullable()),
});

export async function createGoalAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const p = goalSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { ok: false, message: p.error.issues[0].message };
  const r = await db().from("goals").insert(p.data);
  if (r.error) return { ok: false, message: r.error.message };
  return done("Objectiu creat");
}

export async function deleteGoalAction(id: string): Promise<FormState> {
  try {
    await db().from("goals").delete().eq("id", z.uuid().parse(id));
    return done("Objectiu eliminat");
  } catch (e) { return fail(e); }
}

export async function bumpGoalAction(id: string, delta: number): Promise<FormState> {
  try {
    const g = await db().from("goals").select("manual_progress").eq("id", z.uuid().parse(id)).single();
    if (g.error) throw new Error(g.error.message);
    await db().from("goals").update({ manual_progress: Math.max(0, Number(g.data.manual_progress) + delta) }).eq("id", id);
    return done();
  } catch (e) { return fail(e); }
}

// ── Pràctica ──
export async function nextQuestionAction(exclude: string[]): Promise<PracticeQuestion | null> {
  return nextPracticeQuestion(z.array(z.uuid()).max(200).parse(exclude));
}

export async function answerAction(kind: "analysis" | "trade", id: string, bias: "bullish" | "bearish" | "neutral", stop: number | null): Promise<PracticeReveal> {
  const r = await revealPractice(z.enum(["analysis", "trade"]).parse(kind), z.uuid().parse(id), z.enum(["bullish", "bearish", "neutral"]).parse(bias), stop == null ? null : z.number().positive().parse(stop));
  revalidatePath("/aprenentatge", "layout");
  return r;
}
