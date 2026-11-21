import { PenLine } from "lucide-react";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Hero } from "@/components/shared/hero";
import { Skeleton } from "@/components/ui/skeleton";
import { updateTradeAction } from "@/features/trades/actions";
import { TradeForm } from "@/features/trades/components/trade-form";
import { getTradeFormOptions } from "@/features/trades/form-options";
import { getTrade } from "@/features/trades/queries";
import { isoToLocalInput } from "@/lib/time";

export const metadata = { title: "Editar operació" };

const s = (v: number | null | undefined) => (v == null ? "" : String(v));

async function EditForm({ params }: { params: PageProps<"/diari/[id]/editar">["params"] }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [detail, o] = await Promise.all([getTrade(id), getTradeFormOptions()]);
  if (!detail) notFound();
  const t = detail.trade;
  return (
    <TradeForm
      mode="edit"
      action={updateTradeAction.bind(null, id)}
      defaults={{
        asset: detail.metrics.symbol ?? undefined,
        status: t.status,
        account_id: t.account_id,
        strategy_id: t.strategy_id,
        analysis_id: t.analysis_id,
        entry_at: isoToLocalInput(t.entry_at),
        exit_at: isoToLocalInput(t.exit_at),
        entry_price: s(t.entry_price),
        stop_loss: s(t.stop_loss),
        take_profit: s(t.take_profit),
        exit_price: s(t.exit_price),
        quantity: s(t.quantity),
        leverage: s(t.leverage),
        fees: s(t.fees),
        bias_1h: t.bias_1h ?? undefined,
        confirmation_5m: t.confirmation_5m ?? undefined,
        trigger_1m: t.trigger_1m ?? undefined,
        setup: t.setup ?? undefined,
        emotion_before: t.emotion_before ?? undefined,
        emotion_after: t.emotion_after ?? undefined,
        notes: t.notes ?? undefined,
        lesson: t.lesson ?? undefined,
        rulesPassed: detail.checklist.filter((c) => c.passed).map((c) => c.id),
        errorTags: detail.tags.filter((tg) => tg.kind === "error").map((tg) => tg.name),
      }}
      {...o}
      accounts={o.accounts.map((a) => (a.id === t.account_id ? { ...a, capital: Number(t.capital_at_entry) } : a))}
      defaultRiskPct={Number(o.settings.default_risk_pct)}
      riskWarningPct={Number(o.settings.risk_warning_pct)}
      currency={o.settings.currency}
    />
  );
}

export default function EditTradePage(props: PageProps<"/diari/[id]/editar">) {
  return (
    <>
      <Hero icon={PenLine} eyebrow="Diari d'operacions" title="Editar operació" />
      <Suspense fallback={<div className="grid gap-6 lg:grid-cols-[1fr_340px]"><Skeleton className="h-[640px]" /><Skeleton className="h-96" /></div>}>
        <EditForm params={props.params} />
      </Suspense>
    </>
  );
}
