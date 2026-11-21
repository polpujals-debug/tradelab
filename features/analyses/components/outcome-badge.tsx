import { Badge } from "@/components/ui/badge";
import { L } from "@/lib/i18n/ca";
import type { Enum } from "@/lib/supabase/types";

const tone = { pending: "neutral", fulfilled: "profit", partial: "warning", failed: "loss" } as const;
export function OutcomeBadge({ outcome }: { outcome: Enum<"analysis_outcome"> }) {
  return <Badge tone={tone[outcome]}>{L.outcome[outcome]}</Badge>;
}
