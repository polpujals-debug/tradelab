"use client";
import { Loader2, Save } from "lucide-react";
import { useActionState } from "react";
import { ImagePicker } from "@/components/shared/image-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/input";
import { L } from "@/lib/i18n/ca";
import { createAnalysisAction } from "../actions";
import { TIMEFRAMES } from "../schemas";

export function AnalysisForm({ assets }: { assets: string[] }) {
  const [state, action, pending] = useActionState(createAnalysisAction, { ok: false });
  const e = state.errors ?? {};
  return (
    <form action={action}>
      <Card>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Actiu" htmlFor="asset" error={e.asset}>
              <Input id="asset" name="asset" list="a-assets" defaultValue={assets[0]} required />
              <datalist id="a-assets">{assets.map((a) => <option key={a} value={a} />)}</datalist>
            </Field>
            <Field label="Biaix" htmlFor="bias" error={e.bias}>
              <NativeSelect id="bias" name="bias" defaultValue="bullish">{(["bullish", "bearish", "neutral"] as const).map((b) => <option key={b} value={b}>{L.bias[b]}</option>)}</NativeSelect>
            </Field>
            <Field label="Revisar en (dies)" htmlFor="review_in_days"><Input id="review_in_days" name="review_in_days" type="number" min={1} max={60} defaultValue={3} /></Field>
          </div>
          <fieldset>
            <legend className="mb-1.5 text-xs font-medium text-muted">Temporalitats</legend>
            <div className="flex flex-wrap gap-2">
              {TIMEFRAMES.map((t) => (
                <label key={t} className="cursor-pointer">
                  <input type="checkbox" name="timeframes" value={t} defaultChecked={t === "1H" || t === "5m"} className="peer sr-only" />
                  <span className="inline-block rounded-full border border-border px-3 py-1 text-xs text-muted peer-checked:border-primary/60 peer-checked:bg-primary/15 peer-checked:text-accent peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-accent">{t}</span>
                </label>
              ))}
            </div>
            {e.timeframes && <p className="mt-1 text-xs text-loss">{e.timeframes}</p>}
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Suports (separats per comes)" htmlFor="supports"><Input id="supports" name="supports" className="num" placeholder="91200, 90500" /></Field>
            <Field label="Resistències" htmlFor="resistances"><Input id="resistances" name="resistances" className="num" placeholder="93400" /></Field>
            <Field label="MA50" htmlFor="ma50"><Input id="ma50" name="ma50" className="num" inputMode="decimal" /></Field>
          </div>
          <Field label="Escenari" htmlFor="scenario"><Input id="scenario" name="scenario" placeholder="Continuació cap a 93.400 mentre aguanti 91.200" /></Field>
          <Field label="Explicació (Markdown)" htmlFor="content_md" error={e.content_md}><Textarea id="content_md" name="content_md" className="min-h-48" required /></Field>
          <ImagePicker name="images" label="Captures" hint="Pots enganxar amb Ctrl+V" pasteTarget />
          {state.message && !state.ok && <p className="text-xs text-loss">{state.message}</p>}
          <Button type="submit" disabled={pending}>{pending ? <Loader2 className="animate-spin" /> : <Save />} Desar anàlisi</Button>
        </CardContent>
      </Card>
    </form>
  );
}
