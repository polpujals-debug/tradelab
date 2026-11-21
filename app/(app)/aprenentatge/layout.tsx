import { GraduationCap } from "lucide-react";
import { Suspense } from "react";
import { Hero } from "@/components/shared/hero";
import { Skeleton } from "@/components/ui/skeleton";
import { LearnTabs } from "@/features/learning/components/learn-tabs";

export default function LearningLayout({ children }: LayoutProps<"/aprenentatge">) {
  return (
    <>
      <Hero icon={GraduationCap} eyebrow="Escola d'anàlisi tècnica" title="Aprenentatge" description="Conceptes amb exemples reals, pràctica amb captures antigues, els teus errors i els teus objectius." />
      <Suspense fallback={<Skeleton className="mb-6 h-10" />}><LearnTabs /></Suspense>
      {children}
    </>
  );
}
