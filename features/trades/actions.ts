"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deleteStoredImage, ImageError, storeImage } from "@/lib/media/process-image";
import { localInputToIso } from "@/lib/time";
import { db } from "@/lib/supabase/server";
import type { MediaKind } from "@/lib/supabase/types";
import { fieldErrors, tradeCloseSchema, tradeCreateSchema, tradeUpdateSchema } from "./schemas";
import { attachMedia, closeTrade, createTrade, deleteTrade, ServiceError, updateTrade } from "./service";

export interface FormState {
  ok: boolean;
  message?: string;
  errors?: Record<string, string>;
}

const MEDIA_FIELDS: { field: string; kind: MediaKind }[] = [
  { field: "media_before", kind: "before" },
  { field: "media_during", kind: "during" },
  { field: "media_after", kind: "after" },
];

function str(fd: FormData, key: string): string | undefined {
  const v = fd.get(key);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
}

function dt(fd: FormData, key: string): string | null | undefined {
  const v = str(fd, key);
  if (v === undefined) return fd.has(key) ? null : undefined;
  try {
    return localInputToIso(v);
  } catch {
    return v; // deixem que Zod en doni l'error
  }
}

/** FormData del formulari d'operació → objecte per a Zod. */
function parseTradeForm(fd: FormData) {
  const ruleIds = fd.getAll("rule_ids").map(String);
  const passed = new Set(fd.getAll("rules_passed").map(String));
  const tags = (["error", "emotion", "setup"] as const).flatMap((kind) =>
    fd.getAll(`tags_${kind}`).map(String).filter(Boolean).map((name) => ({ kind, name })),
  );
  return {
    asset: str(fd, "asset"),
    direction: str(fd, "direction"),
    status: str(fd, "status"),
    account_id: str(fd, "account_id"),
    strategy_id: str(fd, "strategy_id") ?? null,
    analysis_id: str(fd, "analysis_id") ?? null,
    entry_at: dt(fd, "entry_at"),
    exit_at: dt(fd, "exit_at"),
    entry_price: str(fd, "entry_price"),
    stop_loss: str(fd, "stop_loss"),
    take_profit: str(fd, "take_profit") ?? null,
    exit_price: str(fd, "exit_price") ?? null,
    quantity: str(fd, "quantity"),
    risk_pct: str(fd, "risk_pct"),
    leverage: str(fd, "leverage") ?? 1,
    fees: str(fd, "fees") ?? 0,
    capital_at_entry: str(fd, "capital_at_entry"),
    bias_1h: str(fd, "bias_1h") ?? null,
    confirmation_5m: str(fd, "confirmation_5m") ?? null,
    trigger_1m: str(fd, "trigger_1m") ?? null,
    setup: str(fd, "setup") ?? null,
    emotion_before: str(fd, "emotion_before") ?? null,
    emotion_after: str(fd, "emotion_after") ?? null,
    notes: str(fd, "notes") ?? null,
    lesson: str(fd, "lesson") ?? null,
    rule_checks: ruleIds.map((rule_id) => ({ rule_id, passed: passed.has(rule_id) })),
    tags,
  };
}

async function saveMedia(fd: FormData, tradeId: string) {
  const errors: string[] = [];
  for (const { field, kind } of MEDIA_FIELDS) {
    for (const file of fd.getAll(field)) {
      if (!(file instanceof File) || file.size === 0) continue;
      try {
        const img = await storeImage(Buffer.from(await file.arrayBuffer()), "trades");
        await attachMedia("trade", tradeId, kind, img);
      } catch (e) {
        errors.push(`${file.name}: ${e instanceof Error ? e.message : "error"}`);
      }
    }
  }
  return errors;
}

function fail(e: unknown): FormState {
  if (e instanceof ServiceError) return { ok: false, message: e.message, errors: e.details };
  if (e instanceof ImageError) return { ok: false, message: e.message };
  console.error(e);
  return { ok: false, message: e instanceof Error ? e.message : "Error inesperat" };
}

function revalidateTrades(id?: string) {
  revalidatePath("/", "layout");
  if (id) revalidatePath(`/diari/${id}`);
}

export async function createTradeAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = tradeCreateSchema.safeParse(parseTradeForm(fd));
  if (!parsed.success) return { ok: false, message: "Revisa els camps marcats.", errors: fieldErrors(parsed.error) };
  let id: string;
  try {
    id = (await createTrade(parsed.data)).id;
    const mediaErrors = await saveMedia(fd, id);
    if (mediaErrors.length) console.warn("Captures amb error:", mediaErrors);
  } catch (e) {
    return fail(e);
  }
  revalidateTrades(id);
  redirect(`/diari/${id}?creada=1`);
}

export async function updateTradeAction(id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = tradeUpdateSchema.safeParse(parseTradeForm(fd));
  if (!parsed.success) return { ok: false, message: "Revisa els camps marcats.", errors: fieldErrors(parsed.error) };
  try {
    await updateTrade(id, parsed.data);
    await saveMedia(fd, id);
  } catch (e) {
    return fail(e);
  }
  revalidateTrades(id);
  redirect(`/diari/${id}?desada=1`);
}

export async function closeTradeAction(id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = tradeCloseSchema.safeParse({
    exit_price: str(fd, "exit_price"),
    exit_at: dt(fd, "exit_at") ?? undefined,
    fees: str(fd, "fees"),
    emotion_after: str(fd, "emotion_after"),
    lesson: str(fd, "lesson"),
  });
  if (!parsed.success) return { ok: false, message: "Revisa els camps.", errors: fieldErrors(parsed.error) };
  try {
    await closeTrade(id, parsed.data);
    await saveMedia(fd, id);
  } catch (e) {
    return fail(e);
  }
  revalidateTrades(id);
  return { ok: true, message: "Operació tancada" };
}

export async function setTradeStatusAction(id: string, status: "open" | "cancelled"): Promise<FormState> {
  try {
    await updateTrade(id, { status });
  } catch (e) {
    return fail(e);
  }
  revalidateTrades(id);
  return { ok: true, message: status === "open" ? "Operació oberta" : "Operació cancel·lada" };
}

export async function deleteTradeAction(id: string): Promise<FormState> {
  try {
    const paths = await deleteTrade(id);
    await Promise.all(paths.map((p) => deleteStoredImage(p)));
  } catch (e) {
    return fail(e);
  }
  revalidateTrades();
  redirect("/diari?esborrada=1");
}

export async function uploadTradeMediaAction(id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const errors = await saveMedia(fd, id);
  revalidateTrades(id);
  return errors.length ? { ok: false, message: errors.join(" · ") } : { ok: true, message: "Captures pujades" };
}

export async function deleteMediaAction(mediaId: string, tradeId: string): Promise<FormState> {
  const row = await db().from("media").select("storage_path").eq("id", mediaId).maybeSingle();
  await db().from("media").delete().eq("id", mediaId);
  await deleteStoredImage(row.data?.storage_path ?? null);
  revalidateTrades(tradeId);
  return { ok: true, message: "Captura eliminada" };
}
