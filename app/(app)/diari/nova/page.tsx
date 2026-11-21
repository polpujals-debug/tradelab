import { PenLine } from "lucide-react";
import { Suspense } from "react";
import { Hero } from "@/components/shared/hero";
import { Skeleton } from "@/components/ui/skeleton";
import { createTradeAction } from "@/features/trades/actions";
import { TradeForm } from "@/features/trades/components/trade-form";
import { getTradeFormOptions } from "@/features/trades/form-options";

export const metadata = { title: "Nova operació" };

async function NewTradeForm({ searchParams }: { searchParams: PageProps<"/diari/nova">["searchParams"] }) {
  const [sp, o] = await Promise.all([searchParams, getTradeFormOptions()]);
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const status = get("status");
  return (
    <TradeForm
      mode="create"
      action={createTradeAction}
      defaults={{
        asset: get("asset"),
        status: status === "planned" || status === "closed" || status === "cancelled" ? status : "open",
        entry_price: get("entry"),
        stop_loss: get("stop"),
        take_profit: get("tp"),
        quantity: get("qty"),
        leverage: get("leverage"),
        analysis_id: get("analysis"),
      }}
      {...o}
      defaultRiskPct={Number(get("risk") ?? o.settings.default_risk_pct)}
      riskWarningPct={Number(o.settings.risk_warning_pct)}
      currency={o.settings.currency}
    />
  );
}

export default function NewTradePage(props: PageProps<"/diari/nova">) {
  return (
    <>
      <Hero icon={PenLine} eyebrow="Diari d'operacions" title="Nova operació" description="Registra-la mentre la tens fresca: el que veies, el que vas sentir i el que has après." />
      <Suspense fallback={<div className="grid gap-6 lg:grid-cols-[1fr_340px]"><Skeleton className="h-[640px]" /><Skeleton className="h-96" /></div>}>
        <NewTradeForm searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
