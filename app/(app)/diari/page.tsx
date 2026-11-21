import { BookOpenText } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";

export const metadata = { title: "Diari d'operacions" };

export default function Page() {
  return (
    <>
      <PageHeader title="Diari d'operacions" description="Totes les teves operacions, amb captures, checklist i lliçons." />
      <EmptyState icon={BookOpenText} title="En construcció" description="Aquesta secció arriba a la fase 2." />
    </>
  );
}
