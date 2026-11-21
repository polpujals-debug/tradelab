"use client";
import { AlertTriangle, CalendarPlus, Gauge as GaugeIcon, Loader2, Save, Skull } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Gauge } from "@/components/shared/gauge";
import { PanelTitle } from "@/components/shared/hero";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { calcPositionSize, PositionSizeError, riskOfRuin, type PositionSizeResult } from "@/lib/finance";
import { formatMoney, formatNumber, formatPct, formatPrice, formatQty } from "@/lib/format";
import { cn } from "@/lib/utils";
import { createPlannedTradeAction, saveDefaultRiskAction } from "../actions";

const num = (v: string) => {
  const n = Number(v.replace(",", "."));
  return v.trim() !== "" && Number.isFinite(n) ? n : null;
};

const VERDICT = {
  bulletproof: { label: "A prova de bales", text: "Molt baix. Sostenible.", color: "#10B981", tone: "text-profit" },
  low: { label: "Baix", text: "Risc assumible amb disciplina.", color: "#22D3EE", tone: "text-cyan" },
  moderate: { label: "Moderat", text: "Vigila: una mala ratxa et pot fer molt mal.", color: "#F59E0B", tone: "text-warning" },
  high: { label: "Alt", text: "Redueix el risc per operació o millora el R:R.", color: "#F97316", tone: "text-orange-400" },
  critical: { label: "Crític", text: "Amb aquests números, el compte no sobreviu.", color: "#EF4444", tone: "text-loss" },
} as const;

export function Calculator(p: {
  capital: number; defaultRiskPct: number; riskWarningPct: number; currency: string; assets: string[];
  stats: { winRate: number | null; avgWinR: number | null; trades: number };
}) {
  const [capital, setCapital] = useState(p.capital.toFixed(2));
  const [risk, setRisk] = useState(String(p.defaultRiskPct));
  const [asset, setAsset] = useState(p.assets[0] ?? "BTC/USDT");
  const [entry, setEntry] = useState("");
  const [stop, setStop] = useState("");
  const [tp, setTp] = useState("");
  const [lev, setLev] = useState("");
  const [feePct, setFeePct] = useState("0.04");
  const [winRate, setWinRate] = useState(String(Math.round(p.stats.winRate ?? 45)));
  const [rr, setRr] = useState((p.stats.avgWinR ?? 2).toFixed(1));
  const [ruinR, setRuinR] = useState("20");
  const [pending, start] = useTransition();

  const calc = useMemo((): { ok: true; r: PositionSizeResult } | { ok: false; error: string } | null => {
    const c = num(capital), rk = num(risk), e = num(entry), s = num(stop);
    if (c === null || rk === null || e === null || s === null) return null;
    try {
      return { ok: true, r: calcPositionSize({ capital: c, riskPct: rk, entry: e, stop: s, takeProfit: num(tp), leverage: num(lev), feePct: num(feePct) }) };
    } catch (err) {
      return { ok: false, error: err instanceof PositionSizeError ? err.message : "Error de càlcul" };
    }
  }, [capital, risk, entry, stop, tp, lev, feePct]);

  const ruin = useMemo(() => {
    const w = num(winRate), b = num(rr), z = num(ruinR);
    if (w === null || b === null || z === null) return null;
    return riskOfRuin({ winRate: w, rewardRisk: b, ruinR: z });
  }, [winRate, rr, ruinR]);

  const riskNum = num(risk) ?? 0;
  const over = riskNum > p.riskWarningPct;
  const r = calc?.ok ? calc.r : null;
  const ruinR_money = (num(ruinR) ?? 0) * ((num(capital) ?? 0) * riskNum) / 100;
  const v = ruin ? VERDICT[ruin.verdict] : null;

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      {/* ── Mida de la posició ── */}
      <Card className={cn("border-primary/25", over && "border-warning/40")}>
        <CardContent className="space-y-5">
          <PanelTitle icon={GaugeIcon}>Mida de la posició</PanelTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={`Capital (${p.currency})`} htmlFor="c-capital"><Input id="c-capital" inputMode="decimal" value={capital} onChange={(e) => setCapital(e.target.value)} className="num" /></Field>
            <Field label="% de risc per operació" htmlFor="c-risk" error={over ? `Per sobre del ${p.riskWarningPct} %` : undefined}>
              <Input id="c-risk" inputMode="decimal" value={risk} onChange={(e) => setRisk(e.target.value)} className={cn("num", over && "border-warning/60 text-warning")} />
            </Field>
            <Field label="Actiu" htmlFor="c-asset">
              <Input id="c-asset" list="c-assets" value={asset} onChange={(e) => setAsset(e.target.value.toUpperCase())} />
              <datalist id="c-assets">{p.assets.map((a) => <option key={a} value={a} />)}</datalist>
            </Field>
            <Field label="Preu d'entrada" htmlFor="c-entry"><Input id="c-entry" inputMode="decimal" value={entry} onChange={(e) => setEntry(e.target.value)} className="num" placeholder="92000" /></Field>
            <Field label="Stop loss" htmlFor="c-stop"><Input id="c-stop" inputMode="decimal" value={stop} onChange={(e) => setStop(e.target.value)} className="num" placeholder="91650" /></Field>
            <Field label="Take profit (opcional)" htmlFor="c-tp"><Input id="c-tp" inputMode="decimal" value={tp} onChange={(e) => setTp(e.target.value)} className="num" /></Field>
            <Field label="Palanquejament (opcional)" htmlFor="c-lev"><Input id="c-lev" inputMode="decimal" value={lev} onChange={(e) => setLev(e.target.value)} className="num" placeholder="1" /></Field>
            <Field label="Comissió per costat (%)" htmlFor="c-fee"><Input id="c-fee" inputMode="decimal" value={feePct} onChange={(e) => setFeePct(e.target.value)} className="num" /></Field>
          </div>

          <div className="rounded-2xl border border-border bg-bg/60 p-4">
            {calc && !calc.ok ? (
              <p className="text-sm text-loss">{calc.error}</p>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <Out label="Unitats" value={formatQty(r?.quantity)} big />
                  <Out label="En risc" value={formatMoney(r?.riskAmount ?? ((num(capital) ?? 0) * riskNum) / 100, { currency: p.currency })} big tone="warning" />
                  <Out label="% del compte" value={formatPct(riskNum, { decimals: 2 })} big tone={over ? "warning" : "profit"} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 border-t border-border pt-4 text-xs sm:grid-cols-3">
                  <Mini label="Direcció" value={r ? (r.direction === "long" ? "Long ↑" : "Short ↓") : "—"} className={r?.direction === "long" ? "text-profit" : r ? "text-loss" : ""} />
                  <Mini label="Valor posició" value={formatMoney(r?.positionValue, { currency: p.currency })} />
                  <Mini label="Marge" value={formatMoney(r?.margin, { currency: p.currency })} />
                  <Mini label="Distància SL" value={formatPct(r?.stopDistancePct, { decimals: 2 })} />
                  <Mini label="Pèrdua màx." value={formatMoney(r?.maxLoss, { currency: p.currency })} className="text-loss" />
                  <Mini label="R:R" value={r?.rr != null ? `1:${formatNumber(r.rr)}` : "—"} className={r?.rr != null && r.rr < 2 ? "text-warning" : "text-fg"} />
                  <Mini label="Palanq. necessari" value={r ? `${formatNumber(r.requiredLeverage)}x` : "—"} />
                </div>
                {r && (
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {([["1R", r.targets.r1], ["2R", r.targets.r2], ["3R", r.targets.r3]] as const).map(([k, val]) => (
                      <div key={k} className="rounded-xl border border-profit/25 bg-profit/[0.06] px-3 py-2">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-profit/80">TP {k}</p>
                        <p className="num text-sm font-semibold text-profit">{formatPrice(val)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {over && (
            <p className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              Estàs arriscant {formatPct(riskNum, { decimals: 1 })} per operació: {formatNumber(riskNum / p.riskWarningPct, 1)}× el màxim recomanat ({p.riskWarningPct} %). Està bé per practicar en paper; en real, redueix-lo.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              disabled={!r || pending}
              onClick={() =>
                r && start(async () => {
                  const res = await createPlannedTradeAction({
                    asset, entry: num(entry)!, stop: num(stop)!, takeProfit: num(tp), quantity: r.quantity,
                    leverage: Math.max(1, num(lev) ?? 1), riskPct: riskNum, capital: num(capital)!,
                  });
                  if (res && !res.ok) toast.error(res.message);
                })
              }
            >
              {pending ? <Loader2 className="animate-spin" /> : <CalendarPlus />} Crear operació planificada
            </Button>
            <Button
              variant="secondary"
              disabled={pending || riskNum <= 0}
              onClick={() => start(async () => {
                const res = await saveDefaultRiskAction(riskNum);
                if (res.ok) toast.success(res.message); else toast.error(res.message);
              })}
            >
              <Save /> Desa el % com a predeterminat
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Risc de ruïna ── */}
      <Card className="relative overflow-hidden border-loss/25">
        <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-24 size-72 rounded-full bg-loss/10 blur-3xl" />
        <CardContent className="relative space-y-5">
          <PanelTitle icon={Skull} tone="loss">Risc de ruïna</PanelTitle>
          <p className="text-sm text-muted">
            {p.stats.trades > 0
              ? <>Basat en les teves <span className="num text-fg">{p.stats.trades}</span> operacions tancades: taxa d&apos;encert <span className="num text-fg">{formatPct(p.stats.winRate)}</span>, guany mitjà <span className="num text-fg">{formatNumber(p.stats.avgWinR)}R</span>. Canvia els valors per simular escenaris.</>
              : "Encara no tens operacions tancades: ajusta els valors per simular escenaris."}
          </p>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Taxa d'encert (%)" htmlFor="r-wr"><Input id="r-wr" inputMode="decimal" value={winRate} onChange={(e) => setWinRate(e.target.value)} className="num" /></Field>
            <Field label="R:R mitjà" htmlFor="r-rr"><Input id="r-rr" inputMode="decimal" value={rr} onChange={(e) => setRr(e.target.value)} className="num" /></Field>
            <Field label="Ruïna a (R)" htmlFor="r-ruin"><Input id="r-ruin" inputMode="decimal" value={ruinR} onChange={(e) => setRuinR(e.target.value)} className="num" /></Field>
          </div>
          {ruin && v && (
            <div className="flex flex-col items-center pt-2 text-center">
              <Gauge value={ruin.probability} color={v.color} label={`Risc de ruïna ${ruin.probability} %`} />
              <p className={cn("num -mt-2 text-5xl font-semibold", v.tone)} style={{ textShadow: `0 0 24px ${v.color}55` }}>{formatPct(ruin.probability, { decimals: 2 })}</p>
              <p className={cn("mt-2 text-xs font-semibold uppercase tracking-[0.28em]", v.tone)}>{v.label}</p>
              <p className="mt-1 text-sm text-muted">{v.text}</p>
              <div className="mt-5 grid w-full grid-cols-2 gap-3 text-left">
                <Mini label="Esperança per operació" value={`${ruin.expectancyR >= 0 ? "+" : ""}${formatNumber(ruin.expectancyR, 3)}R`} className={ruin.expectancyR >= 0 ? "text-profit" : "text-loss"} />
                <Mini label={`${ruinR}R amb el risc actual`} value={formatMoney(ruinR_money, { currency: p.currency })} className="text-loss" />
              </div>
              <p className="mt-4 text-[11px] text-dim">Simulació Monte Carlo: 4.000 camins de 500 operacions amb risc fix. Probabilitat de perdre {ruinR}R abans d&apos;acabar.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Out({ label, value, big, tone = "fg" }: { label: string; value: string; big?: boolean; tone?: "fg" | "profit" | "warning" }) {
  const c = { fg: "text-fg", profit: "text-profit", warning: "text-warning" }[tone];
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-[0.18em] text-dim">{label}</p>
      <p className={cn("num mt-1 truncate font-semibold", big ? "text-xl sm:text-2xl" : "text-sm", c)}>{value}</p>
    </div>
  );
}

function Mini({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-border/70 bg-bg/40 px-3 py-2">
      <p className="truncate text-[10px] uppercase tracking-[0.14em] text-dim">{label}</p>
      <p className={cn("num truncate text-sm font-medium text-fg", className)}>{value}</p>
    </div>
  );
}
