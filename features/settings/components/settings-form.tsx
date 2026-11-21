"use client";
import { Loader2, Save, ShieldCheck, Star, Wallet } from "lucide-react";
import { useActionState, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { PanelTitle } from "@/components/shared/hero";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, NativeSelect } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { addAssetAction, saveSettingsAction, toggleFavoriteAction } from "../actions";

interface Props {
  account: { id: string; name: string; initialCapital: number; currency: string };
  settings: {
    default_risk_pct: number; risk_warning_pct: number; max_daily_loss: number | null; max_weekly_loss: number | null;
    max_trades_per_day: number | null; timezone: string; locale: string;
  };
}

export function SettingsForm({ account, settings: s }: Props) {
  const [state, action, pending] = useActionState(saveSettingsAction, { ok: false });
  useEffect(() => {
    if (state.ok) toast.success(state.message);
    else if (state.message) toast.error(state.message);
  }, [state]);
  const e = state.errors ?? {};
  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="account_id" value={account.id} />
      <Card>
        <CardContent className="space-y-5">
          <PanelTitle icon={Wallet}>Compte i capital</PanelTitle>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Nom del compte" htmlFor="account_name" error={e.account_name}><Input id="account_name" name="account_name" defaultValue={account.name} /></Field>
            <Field label="Capital inicial" htmlFor="initial_capital" error={e.initial_capital} hint="El capital actual = inicial + P&L realitzat"><Input id="initial_capital" name="initial_capital" inputMode="decimal" defaultValue={account.initialCapital} className="num" /></Field>
            <Field label="Moneda" htmlFor="currency">
              <NativeSelect id="currency" name="currency" defaultValue={account.currency}>
                <option value="EUR">EUR (€)</option><option value="USD">USD ($)</option><option value="USDT">USDT</option>
              </NativeSelect>
            </Field>
            <Field label="Zona horària" htmlFor="timezone" hint="Els dies (P&L diari, calendari, ratxa) es tallen a mitjanit d'aquesta zona">
              <NativeSelect id="timezone" name="timezone" defaultValue={s.timezone}>
                <option value="Europe/Madrid">Europe/Madrid</option>
              </NativeSelect>
            </Field>
            <Field label="Idioma de la interfície" htmlFor="locale">
              <NativeSelect id="locale" name="locale" defaultValue={s.locale}><option value="ca">Català</option></NativeSelect>
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-5">
          <PanelTitle icon={ShieldCheck}>Risc i disciplina</PanelTitle>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="% de risc per defecte" htmlFor="default_risk_pct" error={e.default_risk_pct}><Input id="default_risk_pct" name="default_risk_pct" inputMode="decimal" defaultValue={s.default_risk_pct} className="num" /></Field>
            <Field label="Avís quan el risc supera (%)" htmlFor="risk_warning_pct" error={e.risk_warning_pct}><Input id="risk_warning_pct" name="risk_warning_pct" inputMode="decimal" defaultValue={s.risk_warning_pct} className="num" /></Field>
            <div />
            <Field label="Pèrdua màxima diària" htmlFor="max_daily_loss" error={e.max_daily_loss} hint="Buit = sense límit"><Input id="max_daily_loss" name="max_daily_loss" inputMode="decimal" defaultValue={s.max_daily_loss ?? ""} className="num" /></Field>
            <Field label="Pèrdua màxima setmanal" htmlFor="max_weekly_loss" error={e.max_weekly_loss}><Input id="max_weekly_loss" name="max_weekly_loss" inputMode="decimal" defaultValue={s.max_weekly_loss ?? ""} className="num" /></Field>
            <Field label="Màxim d'operacions al dia" htmlFor="max_trades_per_day" error={e.max_trades_per_day}><Input id="max_trades_per_day" name="max_trades_per_day" inputMode="numeric" defaultValue={s.max_trades_per_day ?? ""} className="num" /></Field>
          </div>
        </CardContent>
      </Card>
      <Button type="submit" disabled={pending}>{pending ? <Loader2 className="animate-spin" /> : <Save />} Desar configuració</Button>
    </form>
  );
}

export function FavoriteAssets({ assets }: { assets: { id: string; symbol: string; is_favorite: boolean }[] }) {
  const [symbol, setSymbol] = useState("");
  const [pending, start] = useTransition();
  return (
    <Card>
      <CardContent className="space-y-4">
        <PanelTitle icon={Star}>Actius favorits</PanelTitle>
        <div className="flex flex-wrap gap-2">
          {assets.map((a) => (
            <button
              key={a.id}
              type="button"
              aria-pressed={a.is_favorite}
              disabled={pending}
              onClick={() => start(async () => { await toggleFavoriteAction(a.id, !a.is_favorite); })}
              className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors cursor-pointer",
                a.is_favorite ? "border-warning/40 bg-warning/10 text-warning" : "border-border text-muted hover:text-fg")}
            >
              <Star className={cn("size-3.5", a.is_favorite && "fill-current")} /> {a.symbol}
            </button>
          ))}
        </div>
        <form className="flex gap-2" onSubmit={(ev) => { ev.preventDefault(); start(async () => { const r = await addAssetAction(symbol); if (r.ok) { toast.success(r.message); setSymbol(""); } else toast.error(r.message); }); }}>
          <Input value={symbol} onChange={(ev) => setSymbol(ev.target.value.toUpperCase())} placeholder="AVAX/USDT" aria-label="Nou actiu" className="max-w-48" />
          <Button type="submit" variant="secondary" disabled={pending || symbol.length < 3}>Afegir</Button>
        </form>
      </CardContent>
    </Card>
  );
}
