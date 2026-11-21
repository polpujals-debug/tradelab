import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { L } from "@/lib/i18n/ca";
import type { MarketBias, TradeDirection, TradeStatus } from "@/lib/supabase/types";

export function DirectionBadge({ direction }: { direction: TradeDirection | null }) {
  if (!direction) return null;
  return (
    <Badge tone={direction === "long" ? "profit" : "loss"}>
      {direction === "long" ? <ArrowUpRight /> : <ArrowDownRight />}
      {L.direction[direction]}
    </Badge>
  );
}

const statusTone = { planned: "primary", open: "cyan", closed: "neutral", cancelled: "warning" } as const;
export function StatusBadge({ status }: { status: TradeStatus | null }) {
  if (!status) return null;
  return (
    <Badge tone={statusTone[status]}>
      {status === "open" && <span className="size-1.5 animate-pulse rounded-full bg-cyan" />}
      {L.status[status]}
    </Badge>
  );
}

export function BiasBadge({ bias }: { bias: MarketBias | null }) {
  if (!bias) return null;
  return <Badge tone={bias === "bullish" ? "profit" : bias === "bearish" ? "loss" : "neutral"}>{L.bias[bias]}</Badge>;
}
