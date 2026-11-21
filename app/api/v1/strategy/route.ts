import { api } from "@/lib/api/handler";
import { ok } from "@/lib/api/respond";
import { getDefaultAccount, getSettings } from "@/features/settings/queries";
import { db, must } from "@/lib/supabase/server";

/** Estratègia activa, checklist i paràmetres de risc actuals. */
export const GET = api(async () => {
  const [strategy, settings, account] = await Promise.all([
    db().from("strategies").select("id, name, version, description_md, timeframes, indicators, created_at").eq("is_active", true).maybeSingle(),
    getSettings(),
    getDefaultAccount(),
  ]);
  const s = strategy.data;
  const rules = s ? must(await db().from("strategy_rules").select("id, text, sort_order, is_required").eq("strategy_id", s.id).order("sort_order"), "Regles") : [];
  return ok({
    strategy: s ? { ...s, rules } : null,
    risk: {
      default_risk_pct: Number(settings.default_risk_pct),
      risk_warning_pct: Number(settings.risk_warning_pct),
      max_daily_loss: settings.max_daily_loss,
      max_weekly_loss: settings.max_weekly_loss,
      max_trades_per_day: settings.max_trades_per_day,
    },
    account: { name: account.name, type: account.type, currency: account.currency, initial_capital: account.initialCapital, current_capital: account.currentCapital },
    timezone: settings.timezone,
  });
});
