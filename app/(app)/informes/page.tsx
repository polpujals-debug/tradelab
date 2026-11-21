import { Newspaper } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";

export const metadata = { title: "Informes de mercat" };

export default function Page() {
  return (
    <>
      <PageHeader title="Informes de mercat" description="Informes diaris i setmanals de la tasca programada." />
      <EmptyState icon={Newspaper} title="En construcció" description="Aquesta secció arriba a la fase 4." />
    </>
  );
}
