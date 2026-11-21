import { Settings } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";

export const metadata = { title: "Configuració" };

export default function Page() {
  return (
    <>
      <PageHeader title="Configuració" description="Capital, risc, límits de disciplina i claus d'API." />
      <EmptyState icon={Settings} title="En construcció" description="Aquesta secció arriba a la fase 2." />
    </>
  );
}
