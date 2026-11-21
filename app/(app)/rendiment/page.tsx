import { TrendingUp } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";

export const metadata = { title: "Rendiment" };

export default function Page() {
  return (
    <>
      <PageHeader title="Rendiment" description="Resums diaris, setmanals i mensuals." />
      <EmptyState icon={TrendingUp} title="En construcció" description="Aquesta secció arriba a la fase 3." />
    </>
  );
}
