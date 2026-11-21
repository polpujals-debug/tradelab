import { Settings } from "lucide-react";
import { Suspense } from "react";
import { Hero } from "@/components/shared/hero";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiKeys } from "@/features/settings/components/api-keys";
import { FavoriteAssets, SettingsForm } from "@/features/settings/components/settings-form";
import { db, must } from "@/lib/supabase/server";
import { getDefaultAccount, getSettings, listAssets } from "@/features/settings/queries";

export const metadata = { title: "Configuració" };

async function Content() {
  const [settings, account, assets, keys] = await Promise.all([
    getSettings(), getDefaultAccount(), listAssets(),
    db().from("api_keys").select("id, name, prefix, created_at, last_used_at, revoked_at").order("created_at", { ascending: false }),
  ]);
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <SettingsForm
        account={{ id: account.id, name: account.name, initialCapital: account.initialCapital, currency: account.currency }}
        settings={{
          default_risk_pct: Number(settings.default_risk_pct), risk_warning_pct: Number(settings.risk_warning_pct),
          max_daily_loss: settings.max_daily_loss == null ? null : Number(settings.max_daily_loss),
          max_weekly_loss: settings.max_weekly_loss == null ? null : Number(settings.max_weekly_loss),
          max_trades_per_day: settings.max_trades_per_day, timezone: settings.timezone, locale: settings.locale,
        }}
      />
      <div className="space-y-6">
        <FavoriteAssets assets={assets} />
        <ApiKeys keys={must(keys, "Claus")} />
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <>
      <Hero icon={Settings} eyebrow="Sistema" title="Configuració" description="Capital, risc per defecte, límits de disciplina i actius." />
      <Suspense fallback={<Skeleton className="h-[600px]" />}>
        <Content />
      </Suspense>
    </>
  );
}
