import { BookOpenText, Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Hero, StatTile } from "@/components/shared/hero";
import { EmptyState } from "@/components/shared/empty-state";
import { Pnl } from "@/components/shared/pnl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, Td, Th, THead, Tr } from "@/components/ui/table";
import { listAssets, listTags } from "@/features/settings/queries";
import { DirectionBadge, StatusBadge } from "@/features/trades/components/badges";
import { TradeFilters } from "@/features/trades/components/trade-filters";
import { listTrades, type TradeListItem } from "@/features/trades/queries";
import { tradeListQuerySchema } from "@/features/trades/schemas";
import { computeStats } from "@/lib/finance";
import { formatDate, formatDateTime, formatMoney, formatPct, formatPrice, formatR } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata = { title: "Diari d'operacions" };

type SP = PageProps<"/diari">["searchParams"];

function parseFilters(sp: Record<string, string | string[] | undefined>) {
  const raw = Object.fromEntries(Object.entries(sp).filter(([, v]) => typeof v === "string" && v !== ""));
  const parsed = tradeListQuerySchema.safeParse({ ...raw, limit: 500 });
  return parsed.success ? parsed.data : { limit: 500 };
}

async function JournalStats({ searchParams }: { searchParams: SP }) {
  const trades = await listTrades(parseFilters(await searchParams));
  const closed = trades.filter((t) => t.status === "closed");
  const s = computeStats(closed.map((t) => ({ id: t.id ?? "", netPnl: Number(t.net_pnl), rMultiple: t.r_multiple, exitAt: t.exit_at ?? "" })), 0);
  const avgCompliance = closed.length ? closed.reduce((a, t) => a + Number(t.compliance_pct ?? 0), 0) / closed.length : null;
  return (
    <>
      <StatTile label="Operacions" value={`${trades.length}`} hint={`${closed.length} tancades`} tone="primary" />
      <StatTile label="Taxa d'encert" value={formatPct(s.winRate)} tone={s.winRate !== null && s.winRate >= 50 ? "profit" : "warning"} hint={`${s.wins} G · ${s.losses} P`} />
      <StatTile label="P&L net" value={formatMoney(s.netPnl, { sign: true })} tone={s.netPnl >= 0 ? "profit" : "loss"} hint={formatR(s.totalR) + " total"} />
      <StatTile label="Compliment" value={formatPct(avgCompliance, { decimals: 0 })} tone={avgCompliance !== null && avgCompliance >= 80 ? "profit" : "warning"} hint="de la checklist" />
    </>
  );
}

async function Filters() {
  const [assets, tags] = await Promise.all([listAssets(), listTags()]);
  return (
    <TradeFilters
      assets={assets.map((a) => a.symbol)}
      setups={tags.filter((t) => t.kind === "setup").map((t) => t.name)}
      tags={tags.filter((t) => t.kind !== "setup").map((t) => t.name)}
    />
  );
}

async function JournalList({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const trades = await listTrades(parseFilters(sp));
  if (trades.length === 0) {
    return (
      <EmptyState
        icon={BookOpenText}
        title="Cap operació amb aquests filtres"
        description="Prova de treure algun filtre o registra la teva primera operació."
        action={<Button asChild><Link href="/diari/nova"><Plus /> Nova operació</Link></Button>}
      />
    );
  }
  return sp.vista === "targetes" ? <CardsView trades={trades} /> : <TableView trades={trades} />;
}

function TableView({ trades }: { trades: TradeListItem[] }) {
  return (
    <Card className="overflow-hidden">
      <Table>
        <THead>
          <tr>
            <Th>Data</Th>
            <Th>Actiu</Th>
            <Th>Direcció</Th>
            <Th>Estat</Th>
            <Th className="text-right">Entrada</Th>
            <Th className="text-right">Sortida</Th>
            <Th className="text-right">Risc</Th>
            <Th className="text-right">R</Th>
            <Th className="text-right">P&amp;L</Th>
            <Th>Checklist</Th>
            <Th>Etiquetes</Th>
          </tr>
        </THead>
        <tbody>
          {trades.map((t) => (
            <Tr key={t.id} className="relative">
              <Td className="text-muted">
                <Link href={`/diari/${t.id}`} className="after:absolute after:inset-0 hover:text-fg focus-visible:outline-none">
                  {formatDateTime(t.exit_at ?? t.entry_at ?? t.created_at)}
                </Link>
              </Td>
              <Td className="font-medium text-fg">{t.symbol}</Td>
              <Td><DirectionBadge direction={t.direction} /></Td>
              <Td><StatusBadge status={t.status} /></Td>
              <Td className="num text-right text-muted">{formatPrice(t.entry_price)}</Td>
              <Td className="num text-right text-muted">{formatPrice(t.exit_price)}</Td>
              <Td className={cn("num text-right", Number(t.risk_pct) > 2 ? "text-warning" : "text-muted")}>{formatPct(t.risk_pct, { decimals: 1 })}</Td>
              <Td className="text-right"><Pnl value={t.r_multiple} kind="r" /></Td>
              <Td className="text-right font-medium"><Pnl value={t.net_pnl} /></Td>
              <Td><Compliance value={t.compliance_pct} /></Td>
              <Td>
                <div className="flex max-w-[220px] gap-1 overflow-hidden">
                  {t.tags.filter((g) => g.kind === "error").slice(0, 2).map((g) => <Badge key={g.id} tone="loss">{g.name}</Badge>)}
                  {t.setup && <Badge tone="primary">{t.setup}</Badge>}
                </div>
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );
}

function Compliance({ value }: { value: number | null }) {
  if (value == null) return <span className="text-dim">—</span>;
  const v = Number(value);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-white/5">
        <div className={cn("h-full rounded-full", v >= 100 ? "bg-profit" : v >= 70 ? "bg-warning" : "bg-loss")} style={{ width: `${v}%` }} />
      </div>
      <span className="num text-[11px] text-muted">{Math.round(v)}%</span>
    </div>
  );
}

function CardsView({ trades }: { trades: TradeListItem[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {trades.map((t) => {
        const pnl = Number(t.net_pnl ?? 0);
        return (
          <Link key={t.id} href={`/diari/${t.id}`} className="group">
            <Card interactive className={cn("h-full overflow-hidden", t.status === "closed" && (pnl > 0 ? "border-profit/25" : pnl < 0 ? "border-loss/25" : ""))}>
              <div className="relative aspect-video bg-bg">
                {t.thumb ? (
                  <img src={t.thumb} alt={`Captura ${t.symbol}`} loading="lazy" className="size-full object-cover opacity-90 transition-opacity group-hover:opacity-100" />
                ) : (
                  <div className="grid size-full place-items-center bg-[radial-gradient(circle_at_50%_40%,rgb(37_99_235/0.15),transparent_60%)] text-xs text-dim">Sense captura</div>
                )}
                <div className="absolute left-3 top-3 flex gap-1.5"><DirectionBadge direction={t.direction} /><StatusBadge status={t.status} /></div>
              </div>
              <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-fg">{t.symbol}</p>
                    <p className="text-xs text-dim">{formatDate(t.exit_at ?? t.entry_at ?? t.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <Pnl value={t.net_pnl} className="text-lg font-semibold" />
                    <p><Pnl value={t.r_multiple} kind="r" className="text-xs" /></p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {t.setup && <Badge tone="primary">{t.setup}</Badge>}
                  {t.tags.filter((g) => g.kind === "error").map((g) => <Badge key={g.id} tone="loss">{g.name}</Badge>)}
                </div>
              </div>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

export default function JournalPage(props: PageProps<"/diari">) {
  return (
    <>
      <Hero
        icon={BookOpenText}
        eyebrow="Registre de disciplina"
        title="Diari d'operacions"
        description="Cada operació amb el seu pla, la checklist, les captures i la lliçó."
        actions={<Button asChild><Link href="/diari/nova"><Plus /> Nova operació</Link></Button>}
      >
        <Suspense fallback={<>{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[74px]" />)}</>}>
          <JournalStats searchParams={props.searchParams} />
        </Suspense>
      </Hero>
      <Suspense fallback={<Skeleton className="mb-4 h-9" />}>
        <Filters />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-[480px]" />}>
        <JournalList searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
