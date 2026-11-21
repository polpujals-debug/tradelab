import "server-only";
import { db, must } from "@/lib/supabase/server";

/**
 * Configuració inicial mínima si la base de dades està buida (per exemple, si no s'ha
 * executat el seed): compte de paper de 150 €, configuració, estratègia v1 amb la
 * checklist i les etiquetes bàsiques. És idempotent.
 */
export async function ensureBootstrap(): Promise<void> {
  const existing = await db().from("settings").select("id").eq("id", 1).maybeSingle();
  if (existing.error) throw new Error(`No es pot llegir la configuració: ${existing.error.message}. Has executat 1-estructura.sql a Supabase?`);
  if (existing.data) return;

  let account = (await db().from("accounts").select("id").eq("is_default", true).maybeSingle()).data;
  if (!account) {
    account = must(await db().from("accounts").insert({ name: "Paper TradingView", type: "paper", initial_capital: 150, currency: "EUR", is_default: true }).select("id").single(), "Crear compte");
  }
  await db().from("settings").upsert({ id: 1, default_account_id: account.id, currency: "EUR", default_risk_pct: 3, risk_warning_pct: 2, max_daily_loss: 9, max_weekly_loss: 20, max_trades_per_day: 4 }, { onConflict: "id", ignoreDuplicates: true });

  const strategies = await db().from("strategies").select("id").limit(1);
  if (!strategies.data?.length) {
    const s = must(await db().from("strategies").insert({
      name: "MTF MA50", version: 1, is_active: true,
      description_md: "## Idea\nOperar **a favor del biaix de 1H** i entrar només quan l'estructura de 5m ho confirma. Execució a 1m.\n\n## Temporalitats\n- **1H:** biaix (preu respecte a la MA50)\n- **5m:** confirmació amb l'estructura\n- **1m:** gatell d'entrada\n\n## Indicador\nUna sola **MA50**. Per sobre → llargs; per sota → curts; MA plana → no operar.\n\n## Gestió del risc\n_Pendent de definir: % de risc, mida de posició i regles d'entrada._",
    }).select("id").single(), "Crear estratègia");
    const rules = ["Preu per sobre/sota la MA50 a 1H (biaix clar)", "Estructura alcista/baixista confirmada a 5m", "Retrocés a zona (MA50 o suport/resistència a 5m)", "Gatell d'entrada a 1m", "R:R ≥ 1:2", "SL definit abans d'entrar"];
    await db().from("strategy_rules").insert(rules.map((text, i) => ({ strategy_id: s.id, text, sort_order: i + 1 })));
  }

  const tags = await db().from("tags").select("id").limit(1);
  if (!tags.data?.length) {
    const t = (kind: "error" | "emotion" | "setup", names: string[]) => names.map((name) => ({ kind, name }));
    await db().from("tags").insert([
      ...t("error", ["FOMO", "Entrada precipitada", "Moure el SL", "Sense setup", "Sobreoperar", "Operació de revenja", "Tancar abans d'hora"]),
      ...t("emotion", ["Calma", "Confiança", "Ansietat", "Eufòria", "Frustració", "Por"]),
      ...t("setup", ["Retrocés a MA50", "Ruptura i retest", "Rebot en suport", "Rebuig en resistència"]),
    ]);
  }
  for (const symbol of ["BTC/USDT", "ETH/USDT", "SOL/USDT"]) {
    await db().from("assets").upsert({ symbol, is_favorite: true }, { onConflict: "symbol", ignoreDuplicates: true });
  }
}
