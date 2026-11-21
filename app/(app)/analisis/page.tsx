import { ChartCandlestick } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";

export const metadata = { title: "Anàlisis de gràfics" };

export default function Page() {
  return (
    <>
      <PageHeader title="Anàlisis de gràfics" description="Les anàlisis que Claude envia des de TradingView." />
      <EmptyState icon={ChartCandlestick} title="En construcció" description="Aquesta secció arriba a la fase 4." />
    </>
  );
}
