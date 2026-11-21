import { Target } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";

export const metadata = { title: "Estratègia i regles" };

export default function Page() {
  return (
    <>
      <PageHeader title="Estratègia i regles" description="El teu playbook: 1H biaix → 5m estructura → 1m execució." />
      <EmptyState icon={Target} title="En construcció" description="Aquesta secció arriba a la fase 2." />
    </>
  );
}
