"use client";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Brain, ClipboardCheck, Crosshair, ImageIcon, Loader2, Save } from "lucide-react";
import { useActionState, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/input";
import { PanelTitle } from "@/components/shared/hero";
import { ImagePicker } from "@/components/shared/image-picker";
import { calcPositionSize, calcTradePnl, plannedRR } from "@/lib/finance";
import { formatMoney, formatPct, formatPrice, formatQty, formatR } from "@/lib/format";
import { EMOTIONS, L } from "@/lib/i18n/ca";
import { cn } from "@/lib/utils";
import type { FormState } from "../actions";

export interface TradeFormDefaults {
  asset?: string;
  status?: "planned" | "open" | "closed" | "cancelled";
  account_id?: string;
  strategy_id?: string | null;
  analysis_id?: string | null;
  entry_at?: string;
  exit_at?: string;
  entry_price?: string;
  stop_loss?: string;
  take_profit?: string;
  exit_price?: string;
  quantity?: string;
  leverage?: string;
  fees?: string;
  bias_1h?: string;
  confirmation_5m?: string;
  trigger_1m?: string;
  setup?: string;
  emotion_before?: string;
  emotion_after?: string;
  notes?: string;
  lesson?: string;
  rulesPassed?: string[];
  errorTags?: string[];
}

export interface StrategyOption {
  id: string;
  name: string;
  version: number;
  is_active: boolean;
  rules: { id: string; text: string; is_required: boolean }[];
}

interface Props {
  mode: "create" | "edit";
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  defaults: TradeFormDefaults;
  assets: { symbol: string; is_favorite: boolean }[];
  strategies: StrategyOption[];
  errorTags: string[];
  setups: string[];
  analyses: { id: string; title: string }[];
  accounts: { id: string; name: string; capital: number }[];
  defaultRiskPct: number;
  riskWarningPct: number;
  currency: string;
}

const num = (v: string) => {
  const n = Number(v.replace(",", "."));
  return v.trim() !== "" && Number.isFinite(n) ? n : null;
};

export function TradeForm(p: Props) {
  const [state, formAction, pending] = useActionState(p.action, { ok: false });
  const d = p.defaults;
  const [asset, setAsset] = useState(d.asset ?? p.assets[0]?.symbol ?? "BTC/USDT");
  const [status, setStatus] = useState(d.status ?? "open");
  const [accountId, setAccountId] = useState(d.account_id ?? p.accounts[0]?.id ?? "");
  const [entry, setEntry] = useState(d.entry_price ?? "");
  const [stop, setStop] = useState(d.stop_loss ?? "");
  const [tp, setTp] = useState(d.take_profit ?? "");
  const [exit, setExit] = useState(d.exit_price ?? "");
  const [qty, setQty] = useState(d.quantity ?? "");
  const [riskPct, setRiskPct] = useState(String(p.defaultRiskPct));
  const [fees, setFees] = useState(d.fees ?? "0");
  const [strategyId, setStrategyId] = useState(d.strategy_id ?? p.strategies.find((s) => s.is_active)?.id ?? "");
  const [passed, setPassed] = useState<Set<string>>(new Set(d.rulesPassed ?? []));
  const [errors, setErrors] = useState<Set<string>>(new Set(d.errorTags ?? []));
  const [newError, setNewError] = useState("");

  const capital = p.accounts.find((a) => a.id === accountId)?.capital ?? 0;
  const strategy = p.strategies.find((s) => s.id === strategyId);
  const fe = state.errors ?? {};

  const live = useMemo(() => {
    const e = num(entry), s = num(stop), t = num(tp), x = num(exit), r = num(riskPct), q = num(qty), f = num(fees) ?? 0;
    if (e === null || s === null || e === s || capital <= 0) return null;
    const direction = s < e ? "long" : "short";
    const sized = r ? (() => { try { return calcPositionSize({ capital, riskPct: r, entry: e, stop: s }); } catch { return null; } })() : null;
    const quantity = q ?? sized?.quantity ?? null;
    const riskAmount = quantity !== null ? Math.abs(e - s) * quantity : null;
    const rr = t !== null && ((direction === "long" && t > e) || (direction === "short" && t < e)) ? plannedRR(direction, e, s, t) : null;
    const pnl = x !== null && quantity !== null ? calcTradePnl({ direction, entry: e, exit: x, stop: s, quantity, fees: f, capitalAtEntry: capital }) : null;
    return {
      direction, quantity, suggested: sized?.quantity ?? null, riskAmount,
      riskPctReal: riskAmount !== null ? (riskAmount / capital) * 100 : null,
      positionValue: quantity !== null ? quantity * e : null, rr, pnl,
    } as const;
  }, [entry, stop, tp, exit, riskPct, qty, fees, capital]);

  const compliance = strategy && strategy.rules.length ? Math.round((strategy.rules.filter((r) => passed.has(r.id)).length / strategy.rules.length) * 100) : null;
  const overRisk = live?.riskPctReal != null && live.riskPctReal > p.riskWarningPct;
  const showExit = status === "closed";

  const toggle = (set: Set<string>, value: string) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  };

  return (
    <form action={formAction} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-6">
        {/* ── Operació ── */}
        <Card>
          <CardContent className="space-y-5">
            <PanelTitle icon={Crosshair}>Operació</PanelTitle>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Actiu" htmlFor="asset" error={fe.asset}>
                <Input id="asset" name="asset" list="assets-list" value={asset} onChange={(e) => setAsset(e.target.value.toUpperCase())} required autoComplete="off" />
                <datalist id="assets-list">{p.assets.map((a) => <option key={a.symbol} value={a.symbol} />)}</datalist>
              </Field>
              <Field label="Estat" htmlFor="status">
                <NativeSelect id="status" name="status" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
                  {(["planned", "open", "closed", "cancelled"] as const).map((s) => <option key={s} value={s}>{L.status[s]}</option>)}
                </NativeSelect>
              </Field>
              <Field label="Compte" htmlFor="account_id">
                <NativeSelect id="account_id" name="account_id" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                  {p.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </NativeSelect>
              </Field>
              <Field label="Direcció" hint="Es dedueix de l'SL">
                <div className={cn("flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-medium",
                  live?.direction === "long" ? "border-profit/40 bg-profit/10 text-profit" : live?.direction === "short" ? "border-loss/40 bg-loss/10 text-loss" : "border-border text-dim")}>
                  {live?.direction === "long" ? <ArrowUpRight className="size-4" /> : live?.direction === "short" ? <ArrowDownRight className="size-4" /> : null}
                  {live ? L.direction[live.direction] : "—"}
                </div>
                {live && <input type="hidden" name="direction" value={live.direction} />}
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Preu d'entrada" htmlFor="entry_price" error={fe.entry_price}>
                <Input id="entry_price" name="entry_price" inputMode="decimal" value={entry} onChange={(e) => setEntry(e.target.value)} required className="num" />
              </Field>
              <Field label="Stop loss" htmlFor="stop_loss" error={fe.stop_loss}>
                <Input id="stop_loss" name="stop_loss" inputMode="decimal" value={stop} onChange={(e) => setStop(e.target.value)} required className="num" />
              </Field>
              <Field label="Take profit" htmlFor="take_profit" error={fe.take_profit}>
                <Input id="take_profit" name="take_profit" inputMode="decimal" value={tp} onChange={(e) => setTp(e.target.value)} className="num" />
              </Field>
              <Field label="Mida (unitats)" htmlFor="quantity" error={fe.quantity} hint={!qty && live?.suggested ? `Auto: ${formatQty(live.suggested)} (${riskPct} %)` : undefined}>
                <Input id="quantity" name="quantity" inputMode="decimal" value={qty} placeholder={live?.suggested ? formatQty(live.suggested) : "Auto"} onChange={(e) => setQty(e.target.value)} className="num" />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Risc per a la mida automàtica (%)" htmlFor="risk_pct">
                <Input id="risk_pct" name="risk_pct" inputMode="decimal" value={riskPct} onChange={(e) => setRiskPct(e.target.value)} className="num" />
              </Field>
              <Field label="Palanquejament" htmlFor="leverage">
                <Input id="leverage" name="leverage" inputMode="decimal" defaultValue={d.leverage ?? "1"} className="num" />
              </Field>
              <Field label="Data d'entrada" htmlFor="entry_at" error={fe.entry_at}>
                <Input id="entry_at" name="entry_at" type="datetime-local" defaultValue={d.entry_at} />
              </Field>
              <Field label="Anàlisi vinculada" htmlFor="analysis_id">
                <NativeSelect id="analysis_id" name="analysis_id" defaultValue={d.analysis_id ?? ""}>
                  <option value="">Cap</option>
                  {p.analyses.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
                </NativeSelect>
              </Field>
            </div>

            {showExit && (
              <div className="grid gap-4 rounded-xl border border-border bg-bg/40 p-4 sm:grid-cols-3">
                <Field label="Preu de sortida" htmlFor="exit_price" error={fe.exit_price}>
                  <Input id="exit_price" name="exit_price" inputMode="decimal" value={exit} onChange={(e) => setExit(e.target.value)} required className="num" />
                </Field>
                <Field label="Data de sortida" htmlFor="exit_at" error={fe.exit_at}>
                  <Input id="exit_at" name="exit_at" type="datetime-local" defaultValue={d.exit_at} />
                </Field>
                <Field label="Comissions (€)" htmlFor="fees" error={fe.fees}>
                  <Input id="fees" name="fees" inputMode="decimal" value={fees} onChange={(e) => setFees(e.target.value)} className="num" />
                </Field>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Estratègia ── */}
        <Card>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <PanelTitle icon={ClipboardCheck}>Estratègia · 1H → 5m → 1m</PanelTitle>
              <NativeSelect name="strategy_id" aria-label="Versió de l'estratègia" value={strategyId} onChange={(e) => setStrategyId(e.target.value)} className="h-8 w-auto text-xs">
                <option value="">Sense estratègia</option>
                {p.strategies.map((s) => <option key={s.id} value={s.id}>{s.name} v{s.version}{s.is_active ? " (activa)" : ""}</option>)}
              </NativeSelect>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Biaix 1H" htmlFor="bias_1h">
                <NativeSelect id="bias_1h" name="bias_1h" defaultValue={d.bias_1h ?? ""}>
                  <option value="">—</option>
                  {(["bullish", "bearish", "neutral"] as const).map((b) => <option key={b} value={b}>{L.bias[b]}</option>)}
                </NativeSelect>
              </Field>
              <Field label="Confirmació 5m" htmlFor="confirmation_5m">
                <Input id="confirmation_5m" name="confirmation_5m" defaultValue={d.confirmation_5m} placeholder="Màxims i mínims creixents…" />
              </Field>
              <Field label="Gatell 1m" htmlFor="trigger_1m">
                <Input id="trigger_1m" name="trigger_1m" defaultValue={d.trigger_1m} placeholder="Trencament del mínim del retrocés…" />
              </Field>
            </div>
            <Field label="Setup" htmlFor="setup">
              <Input id="setup" name="setup" list="setups-list" defaultValue={d.setup} placeholder="Retrocés a MA50" />
              <datalist id="setups-list">{p.setups.map((s) => <option key={s} value={s} />)}</datalist>
            </Field>

            {strategy && strategy.rules.length > 0 && (
              <fieldset className="space-y-2">
                <legend className="mb-2 flex w-full items-center justify-between text-xs font-medium text-muted">
                  <span>Checklist d&apos;entrada</span>
                  <span className={cn("num", compliance === 100 ? "text-profit" : compliance !== null && compliance >= 70 ? "text-warning" : "text-loss")}>{compliance} %</span>
                </legend>
                {strategy.rules.map((r) => (
                  <label key={r.id} className={cn("flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors",
                    passed.has(r.id) ? "border-profit/30 bg-profit/[0.06] text-fg" : "border-border text-muted hover:border-border-strong")}>
                    <input type="hidden" name="rule_ids" value={r.id} />
                    <Checkbox checked={passed.has(r.id)} onCheckedChange={() => setPassed((s) => toggle(s, r.id))} name="rules_passed" value={r.id} />
                    <span className="flex-1">{r.text}</span>
                    {r.is_required && <span className="text-[10px] uppercase tracking-wider text-dim">obligatòria</span>}
                  </label>
                ))}
              </fieldset>
            )}
          </CardContent>
        </Card>

        {/* ── Psicologia ── */}
        <Card>
          <CardContent className="space-y-5">
            <PanelTitle icon={Brain}>Psicologia i aprenentatge</PanelTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Emoció abans" htmlFor="emotion_before">
                <NativeSelect id="emotion_before" name="emotion_before" defaultValue={d.emotion_before ?? ""}>
                  <option value="">—</option>
                  {EMOTIONS.map((e) => <option key={e} value={e}>{e}</option>)}
                </NativeSelect>
              </Field>
              <Field label="Emoció després" htmlFor="emotion_after">
                <NativeSelect id="emotion_after" name="emotion_after" defaultValue={d.emotion_after ?? ""}>
                  <option value="">—</option>
                  {EMOTIONS.map((e) => <option key={e} value={e}>{e}</option>)}
                </NativeSelect>
              </Field>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-muted">Errors comesos</p>
              <div className="flex flex-wrap gap-2">
                {[...new Set([...p.errorTags, ...errors])].map((t) => {
                  const on = errors.has(t);
                  return (
                    <button key={t} type="button" aria-pressed={on} onClick={() => setErrors((s) => toggle(s, t))}
                      className={cn("rounded-full border px-3 py-1 text-xs transition-colors cursor-pointer", on ? "border-loss/50 bg-loss/15 text-loss" : "border-border text-muted hover:border-border-strong hover:text-fg")}>
                      {t}
                    </button>
                  );
                })}
                <input
                  value={newError}
                  onChange={(e) => setNewError(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newError.trim()) {
                      e.preventDefault();
                      setErrors((s) => new Set(s).add(newError.trim()));
                      setNewError("");
                    }
                  }}
                  placeholder="+ nou error (Enter)"
                  aria-label="Afegir una etiqueta d'error"
                  className="h-7 w-40 rounded-full border border-dashed border-border bg-transparent px-3 text-xs text-fg placeholder:text-faint focus:border-primary/60 focus:outline-none"
                />
              </div>
              {[...errors].map((t) => <input key={t} type="hidden" name="tags_error" value={t} />)}
            </div>
            <Field label="Notes" htmlFor="notes">
              <Textarea id="notes" name="notes" defaultValue={d.notes} placeholder="Què veia, per què vaig entrar, com ho vaig gestionar…" />
            </Field>
            <Field label="Lliçó apresa" htmlFor="lesson">
              <Textarea id="lesson" name="lesson" defaultValue={d.lesson} className="min-h-16" placeholder="Una frase que vulguis recordar." />
            </Field>
          </CardContent>
        </Card>

        {/* ── Captures ── */}
        <Card>
          <CardContent className="space-y-5">
            <PanelTitle icon={ImageIcon}>Captures</PanelTitle>
            <div className="grid gap-5 sm:grid-cols-3">
              <ImagePicker name="media_before" label="Abans" hint="Pots enganxar amb Ctrl+V" pasteTarget />
              <ImagePicker name="media_during" label="Durant" />
              <ImagePicker name="media_after" label="Després" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Resum en viu ── */}
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <Card className="border-primary/25">
          <CardContent className="space-y-4">
            <PanelTitle icon={Crosshair}>Resum en viu</PanelTitle>
            <dl className="grid grid-cols-2 gap-3">
              <Metric label="Risc" value={formatMoney(live?.riskAmount, { currency: p.currency })} tone={overRisk ? "warning" : "fg"} />
              <Metric label="% del compte" value={formatPct(live?.riskPctReal, { decimals: 2 })} tone={overRisk ? "warning" : "profit"} />
              <Metric label="R:R planificat" value={live?.rr != null ? `1:${live.rr.toFixed(2)}` : "—"} tone={live?.rr != null && live.rr < 2 ? "warning" : "fg"} />
              <Metric label="Valor posició" value={formatMoney(live?.positionValue, { currency: p.currency })} />
              <Metric label="Unitats" value={formatQty(live?.quantity)} />
              <Metric label="Capital" value={formatMoney(capital, { currency: p.currency })} />
              {live?.pnl && (
                <>
                  <Metric label="P&L net" value={formatMoney(live.pnl.netPnl, { currency: p.currency, sign: true })} tone={live.pnl.netPnl >= 0 ? "profit" : "loss"} />
                  <Metric label="R aconseguit" value={formatR(live.pnl.rMultiple)} tone={live.pnl.rMultiple >= 0 ? "profit" : "loss"} />
                </>
              )}
            </dl>
            {overRisk && (
              <p className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                Arrisques més del {p.riskWarningPct} % del compte. En real, l&apos;objectiu és ≤ {p.riskWarningPct} %.
              </p>
            )}
            {live?.rr != null && live.rr < 2 && (
              <p className="text-xs text-warning">R:R per sota de 1:2 (regla de l&apos;estratègia).</p>
            )}
            {live && <p className="text-[11px] text-dim">Entrada {formatPrice(num(entry))} · SL {formatPrice(num(stop))}{num(tp) ? ` · TP ${formatPrice(num(tp))}` : ""}</p>}
            {state.message && !state.ok && <p role="alert" className="rounded-xl border border-loss/30 bg-loss/10 p-3 text-xs text-loss">{state.message}</p>}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : <Save />}
              {p.mode === "create" ? "Desar operació" : "Desar canvis"}
            </Button>
          </CardContent>
        </Card>
      </aside>
    </form>
  );
}

function Metric({ label, value, tone = "fg" }: { label: string; value: string; tone?: "fg" | "profit" | "loss" | "warning" }) {
  const c = { fg: "text-fg", profit: "text-profit", loss: "text-loss", warning: "text-warning" }[tone];
  return (
    <div className="rounded-xl border border-border bg-bg/50 px-3 py-2.5">
      <dt className="text-[10px] uppercase tracking-[0.16em] text-dim">{label}</dt>
      <dd className={cn("num mt-0.5 truncate text-[15px] font-semibold", c)}>{value}</dd>
    </div>
  );
}
