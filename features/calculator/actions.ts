"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/supabase/server";
import { fieldErrors, tradeCreateSchema } from "@/features/trades/schemas";
import { createTrade, ServiceError } from "@/features/trades/service";
import type { FormState } from "@/features/trades/actions";

export async function createPlannedTradeAction(input: {
  asset: string; entry: number; stop: number; takeProfit: number | null; quantity: number; leverage: number; riskPct: number; capital: number;
}): Promise<FormState> {
  const parsed = tradeCreateSchema.safeParse({
    asset: input.asset,
    status: "planned",
    entry_price: input.entry,
    stop_loss: input.stop,
    take_profit: input.takeProfit,
    quantity: input.quantity,
    leverage: input.leverage,
    capital_at_entry: input.capital,
    risk_pct: input.riskPct,
    notes: `Planificada des de la calculadora (risc ${input.riskPct} %).`,
  });
  if (!parsed.success) return { ok: false, message: Object.values(fieldErrors(parsed.error))[0] ?? "Dades invàlides" };
  let id: string;
  try {
    id = (await createTrade(parsed.data)).id;
  } catch (e) {
    return { ok: false, message: e instanceof ServiceError || e instanceof Error ? e.message : "Error" };
  }
  revalidatePath("/", "layout");
  redirect(`/diari/${id}?creada=1`);
}

export async function saveDefaultRiskAction(riskPct: number): Promise<FormState> {
  const v = z.number().positive().max(100).safeParse(riskPct);
  if (!v.success) return { ok: false, message: "Risc invàlid" };
  const res = await db().from("settings").update({ default_risk_pct: v.data }).eq("id", 1);
  if (res.error) return { ok: false, message: res.error.message };
  revalidatePath("/", "layout");
  return { ok: true, message: `Risc per defecte: ${v.data} %` };
}
