import { LayoutDashboard } from "lucide-react";
import { connection } from "next/server";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CountUp } from "@/components/shared/count-up";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { db, must } from "@/lib/supabase/server";

async function Balances() {
  await connection();
  const balances = must(await db().from("v_account_balance").select("name, type, currency, initial_capital, current_capital, realized_pnl"), "Saldo");
  return balances.map((b) => (
    <Card key={b.name} interactive>
      <CardHeader>
        <CardTitle>{b.name}</CardTitle>
        <Badge tone={b.type === "paper" ? "cyan" : "warning"}>{b.type === "paper" ? "Paper" : "Real"}</Badge>
      </CardHeader>
      <CardContent>
        <p className="num text-3xl font-semibold text-fg"><CountUp value={Number(b.current_capital)} kind="money" currency={b.currency} /></p>
        <p className={`num mt-1 text-sm ${Number(b.realized_pnl) >= 0 ? "text-profit" : "text-loss"}`}>
          <CountUp value={Number(b.realized_pnl)} kind="money-signed" currency={b.currency} />
        </p>
      </CardContent>
    </Card>
  ));
}

export default function DashboardPage() {
  return (
    <>
      <PageHeader eyebrow="Fase 1 · fonaments" title="Dashboard" description="Connexió amb Supabase verificada. El dashboard complet arriba a la fase 3." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Suspense fallback={<><Skeleton className="h-36" /><Skeleton className="h-36" /></>}>
          <Balances />
        </Suspense>
      </div>
      <EmptyState className="mt-6" icon={LayoutDashboard} title="KPIs, corba de capital i heatmap" description="Arriben a la fase 3." />
    </>
  );
}
