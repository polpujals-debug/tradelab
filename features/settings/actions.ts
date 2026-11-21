"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/supabase/server";
import { fieldErrors, symbolSchema } from "@/features/trades/schemas";
import type { FormState } from "@/features/trades/actions";

const optionalNum = z.preprocess((v) => (v === "" || v == null ? null : v), z.coerce.number().positive().nullable());

const settingsSchema = z.object({
  account_id: z.uuid(),
  account_name: z.string().trim().min(1).max(60),
  initial_capital: z.coerce.number().positive("Ha de ser positiu"),
  currency: z.enum(["EUR", "USD", "USDT"]),
  default_risk_pct: z.coerce.number().positive().max(100),
  risk_warning_pct: z.coerce.number().positive().max(100),
  max_daily_loss: optionalNum,
  max_weekly_loss: optionalNum,
  max_trades_per_day: z.preprocess((v) => (v === "" || v == null ? null : v), z.coerce.number().int().positive().nullable()),
  timezone: z.string().min(3).max(60),
  locale: z.enum(["ca"]),
});

export async function saveSettingsAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = settingsSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, message: "Revisa els camps marcats.", errors: fieldErrors(parsed.error) };
  const s = parsed.data;
  const [a, b] = await Promise.all([
    db().from("accounts").update({ name: s.account_name, initial_capital: s.initial_capital, currency: s.currency }).eq("id", s.account_id),
    db().from("settings").update({
      default_account_id: s.account_id, currency: s.currency, default_risk_pct: s.default_risk_pct, risk_warning_pct: s.risk_warning_pct,
      max_daily_loss: s.max_daily_loss, max_weekly_loss: s.max_weekly_loss, max_trades_per_day: s.max_trades_per_day,
      timezone: s.timezone, locale: s.locale,
    }).eq("id", 1),
  ]);
  if (a.error || b.error) return { ok: false, message: (a.error ?? b.error)?.message };
  revalidatePath("/", "layout");
  return { ok: true, message: "Configuració desada" };
}

export async function toggleFavoriteAction(id: string, favorite: boolean): Promise<FormState> {
  const res = await db().from("assets").update({ is_favorite: favorite }).eq("id", z.uuid().parse(id));
  if (res.error) return { ok: false, message: res.error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function addAssetAction(symbol: string): Promise<FormState> {
  const s = symbolSchema.safeParse(symbol);
  if (!s.success) return { ok: false, message: s.error.issues[0]?.message };
  const res = await db().from("assets").upsert({ symbol: s.data, is_favorite: true }, { onConflict: "symbol" });
  if (res.error) return { ok: false, message: res.error.message };
  revalidatePath("/", "layout");
  return { ok: true, message: `${s.data} afegit` };
}
