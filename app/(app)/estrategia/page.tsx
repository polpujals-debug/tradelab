import { BarChart3, GitBranch, Target } from "lucide-react";
import { Suspense } from "react";
import { Hero, PanelTitle, StatTile } from "@/components/shared/hero";
import { EmptyState } from "@/components/shared/empty-state";
import { Pnl } from "@/components/shared/pnl";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, Td, Th, THead, Tr } from "@/components/ui/table";
import { ChecklistEditor, PlaybookEditor, VersionActions } from "@/features/strategy/components/strategy-editor";
import { getStrategyOverview } from "@/features/strategy/queries";
import { formatDate, formatPct, formatR } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata = { title: "Estratègia" };

async function Content() {
  const o = await getStrategyOverview();
  if (!o.active) return <EmptyState icon={Target} title="Encara no hi ha cap estratègia" />;
  const a = o.active;
  const full = o.fullCompliance;
  const partial = o.partialCompliance;

  // Estadístiques per regla: compleixo vs no compleixo
  const byRule = a.rules.map((r) => {
    const yes = o.ruleStats.find((s) => s.rule_id === r.id && s.passed === true);
    const no = o.ruleStats.find((s) => s.rule_id === r.id && s.passed === false);
    const wr = (s: typeof yes) => (s && Number(s.trades) > 0 ? (Number(s.wins) / Number(s.trades)) * 100 : null);
    return { ...r, yes, no, wrYes: wr(yes), wrNo: wr(no) };
  });

  return (
    <>
      <Hero icon={Target} eyebrow="Playbook" title="Estratègia i regles" description="1H biaix → 5m estructura → 1m execució · MA50 com a únic indicador.">
        <StatTile label="Versió activa" value={`v${a.version}`} tone="primary" hint={`${a.rules.length} regles · des del ${formatDate(a.created_at)}`} />
        <StatTile label="Compliment mitjà" value={formatPct(a.compliance, { decimals: 0 })} tone={a.compliance !== null && a.compliance >= 85 ? "profit" : "warning"} hint={`${a.stats.trades} operacions v${a.version}`} />
        <StatTile label="Checklist al 100 %" value={formatPct(full.winRate, { decimals: 0 })} tone="profit" hint={`encert · ${full.trades} ops · ${formatR(full.avgR)} mitjà`} />
        <StatTile label="Checklist incompleta" value={formatPct(partial.winRate, { decimals: 0 })} tone="loss" hint={`encert · ${partial.trades} ops · ${formatR(partial.avgR)} mitjà`} />
      </Hero>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <PlaybookEditor strategyId={a.id} description={a.description_md} name={a.name} version={a.version} />
        <div className="space-y-6">
          <ChecklistEditor strategyId={a.id} rules={a.rules} />

          <Card>
            <CardContent className="space-y-4">
              <PanelTitle icon={BarChart3}>Quines regles funcionen</PanelTitle>
              <p className="text-xs text-muted">Taxa d&apos;encert quan compleixes cada regla i quan no (operacions tancades de la v{a.version}).</p>
              <ul className="space-y-3">
                {byRule.map((r) => {
                  const diff = r.wrYes !== null && r.wrNo !== null ? r.wrYes - r.wrNo : null;
                  return (
                    <li key={r.id} className="rounded-xl border border-border bg-bg/40 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm text-fg">{r.text}</p>
                        {diff !== null && (
                          <span className={cn("num shrink-0 text-xs font-semibold", diff >= 0 ? "text-profit" : "text-loss")}>{diff >= 0 ? "+" : ""}{diff.toFixed(0)} pp</span>
                        )}
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                        <div className="rounded-lg bg-profit/[0.07] px-2 py-1.5">
                          <span className="text-dim">Complerta · </span>
                          <span className="num text-profit">{formatPct(r.wrYes, { decimals: 0 })}</span>
                          <span className="num text-dim"> ({r.yes?.trades ?? 0}) · {formatR(r.yes?.avg_r)}</span>
                        </div>
                        <div className="rounded-lg bg-loss/[0.07] px-2 py-1.5">
                          <span className="text-dim">No complerta · </span>
                          <span className="num text-loss">{formatPct(r.wrNo, { decimals: 0 })}</span>
                          <span className="num text-dim"> ({r.no?.trades ?? 0}) · {formatR(r.no?.avg_r)}</span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="mt-6">
        <CardContent className="space-y-4">
          <PanelTitle icon={GitBranch}>Versions de l&apos;estratègia</PanelTitle>
          <Table>
            <THead>
              <tr>
                <Th>Versió</Th><Th>Creada</Th><Th className="text-right">Regles</Th><Th className="text-right">Operacions</Th>
                <Th className="text-right">Encert</Th><Th className="text-right">R mitjà</Th><Th className="text-right">Profit factor</Th>
                <Th className="text-right">P&amp;L</Th><Th className="text-right">Compliment</Th><Th />
              </tr>
            </THead>
            <tbody>
              {o.strategies.map((s) => (
                <Tr key={s.id}>
                  <Td className="font-medium text-fg">{s.name} v{s.version}</Td>
                  <Td className="text-muted">{formatDate(s.created_at)}</Td>
                  <Td className="num text-right text-muted">{s.rules.length}</Td>
                  <Td className="num text-right text-muted">{s.stats.trades}</Td>
                  <Td className="num text-right">{formatPct(s.stats.winRate)}</Td>
                  <Td className="text-right"><Pnl value={s.stats.avgR} kind="r" /></Td>
                  <Td className="num text-right text-muted">{s.stats.profitFactor?.toFixed(2) ?? "—"}</Td>
                  <Td className="text-right"><Pnl value={s.stats.netPnl} /></Td>
                  <Td className="num text-right text-muted">{formatPct(s.compliance, { decimals: 0 })}</Td>
                  <Td><VersionActions id={s.id} isActive={s.is_active} /></Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

export default function StrategyPage() {
  return (
    <Suspense fallback={<><Skeleton className="mb-6 h-56" /><div className="grid gap-6 xl:grid-cols-2"><Skeleton className="h-[520px]" /><Skeleton className="h-[520px]" /></div></>}>
      <Content />
    </Suspense>
  );
}
