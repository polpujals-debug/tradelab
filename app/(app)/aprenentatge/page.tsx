import { GraduationCap } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";

export const metadata = { title: "Aprenentatge" };

export default function Page() {
  return (
    <>
      <PageHeader title="Aprenentatge" description="Conceptes, mode pràctica, errors i objectius." />
      <EmptyState icon={GraduationCap} title="En construcció" description="Aquesta secció arriba a la fase 5." />
    </>
  );
}
