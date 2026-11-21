import { ChartCandlestick } from "lucide-react";
import { Suspense } from "react";
import { Hero } from "@/components/shared/hero";
import { Skeleton } from "@/components/ui/skeleton";
import { AnalysisForm } from "@/features/analyses/components/analysis-form";
import { listAssets } from "@/features/settings/queries";

export const metadata = { title: "Nova anàlisi" };

async function Form() {
  const assets = await listAssets();
  return <AnalysisForm assets={assets.map((a) => a.symbol)} />;
}

export default function NewAnalysisPage() {
  return (
    <>
      <Hero icon={ChartCandlestick} eyebrow="Anàlisis" title="Nova anàlisi manual" description="Les anàlisis de Claude arriben soles per l'API; aquí pots afegir-ne una de pròpia." />
      <Suspense fallback={<Skeleton className="h-[600px]" />}><Form /></Suspense>
    </>
  );
}
