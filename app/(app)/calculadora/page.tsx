import { Calculator } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";

export const metadata = { title: "Calculadora de risc" };

export default function Page() {
  return (
    <>
      <PageHeader title="Calculadora de risc" description="Mida de posició, pèrdua màxima i objectius en R." />
      <EmptyState icon={Calculator} title="En construcció" description="Aquesta secció arriba a la fase 2." />
    </>
  );
}
