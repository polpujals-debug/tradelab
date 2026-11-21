import "server-only";
import { db, must } from "@/lib/supabase/server";
import { getSettings, listAccounts, listAssets } from "@/features/settings/queries";
import type { StrategyOption } from "./components/trade-form";

export async function getTradeFormOptions() {
  const [settings, accounts, assets, strategies, rules, tags, analyses] = await Promise.all([
    getSettings(),
    listAccounts(),
    listAssets(),
    db().from("strategies").select("id, name, version, is_active").order("version", { ascending: false }),
    db().from("strategy_rules").select("id, strategy_id, text, is_required, sort_order").order("sort_order"),
    db().from("tags").select("name, kind").order("name"),
    db().from("analyses").select("id, title, analyzed_at").order("analyzed_at", { ascending: false }).limit(40),
  ]);
  const ruleRows = must(rules, "Regles");
  const strategyOptions: StrategyOption[] = must(strategies, "Estratègies").map((s) => ({
    ...s,
    rules: ruleRows.filter((r) => r.strategy_id === s.id).map((r) => ({ id: r.id, text: r.text, is_required: r.is_required })),
  }));
  const tagRows = must(tags, "Etiquetes");
  return {
    settings,
    accounts: accounts
      .filter((a) => a.account_id)
      .map((a) => ({ id: a.account_id, name: a.name, capital: Number(a.current_capital ?? a.initial_capital) }))
      .sort((a) => (a.id === settings.default_account_id ? -1 : 1)),
    assets: assets.map((a) => ({ symbol: a.symbol, is_favorite: a.is_favorite })),
    strategies: strategyOptions,
    errorTags: tagRows.filter((t) => t.kind === "error").map((t) => t.name),
    setups: tagRows.filter((t) => t.kind === "setup").map((t) => t.name),
    analyses: must(analyses, "Anàlisis").map((a) => ({ id: a.id, title: a.title })),
  };
}
