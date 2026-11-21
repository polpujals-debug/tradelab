"use client";
import { Ban, CheckCircle2, Loader2, Pencil, Play, Trash2 } from "lucide-react";
import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/input";
import { ImagePicker } from "@/components/shared/image-picker";
import { EMOTIONS } from "@/lib/i18n/ca";
import type { TradeStatus } from "@/lib/supabase/types";
import { closeTradeAction, deleteTradeAction, setTradeStatusAction, type FormState } from "../actions";

export function TradeActions({ id, status, takeProfit, nowLocal }: { id: string; status: TradeStatus; takeProfit: number | null; nowLocal: string }) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [state, closeAction, closing] = useActionState(async (prev: FormState, fd: FormData) => {
    const res = await closeTradeAction(id, prev, fd);
    if (res.ok) {
      toast.success(res.message);
      setOpen(false);
    }
    return res;
  }, { ok: false });

  const run = (fn: () => Promise<FormState>) =>
    start(async () => {
      const res = await fn();
      if (res && !res.ok) toast.error(res.message);
      else if (res?.message) toast.success(res.message);
    });

  return (
    <div className="flex flex-wrap gap-2">
      {(status === "open" || status === "planned") && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="profit"><CheckCircle2 /> Tancar operació</Button>
          </DialogTrigger>
          <DialogContent title="Tancar operació" description="Introdueix el preu de sortida. El P&L i l'R es calculen automàticament.">
            <form action={closeAction} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Preu de sortida" htmlFor="exit_price" error={state.errors?.exit_price}>
                  <Input id="exit_price" name="exit_price" inputMode="decimal" required defaultValue={takeProfit ?? ""} className="num" autoFocus />
                </Field>
                <Field label="Data de sortida" htmlFor="exit_at">
                  <Input id="exit_at" name="exit_at" type="datetime-local" defaultValue={nowLocal} />
                </Field>
                <Field label="Comissions (€)" htmlFor="fees">
                  <Input id="fees" name="fees" inputMode="decimal" defaultValue="0" className="num" />
                </Field>
                <Field label="Emoció després" htmlFor="emotion_after">
                  <NativeSelect id="emotion_after" name="emotion_after" defaultValue="">
                    <option value="">—</option>
                    {EMOTIONS.map((e) => <option key={e}>{e}</option>)}
                  </NativeSelect>
                </Field>
              </div>
              <Field label="Lliçó apresa" htmlFor="lesson">
                <Textarea id="lesson" name="lesson" className="min-h-16" />
              </Field>
              <ImagePicker name="media_after" label="Captura del resultat" hint="Pots enganxar amb Ctrl+V" pasteTarget />
              {state.message && !state.ok && <p className="text-xs text-loss">{state.message}</p>}
              <Button type="submit" className="w-full" disabled={closing}>{closing && <Loader2 className="animate-spin" />} Tancar i calcular</Button>
            </form>
          </DialogContent>
        </Dialog>
      )}
      {status === "planned" && (
        <Button variant="secondary" disabled={pending} onClick={() => run(() => setTradeStatusAction(id, "open"))}><Play /> Marcar com a oberta</Button>
      )}
      {(status === "planned" || status === "open") && (
        <Button variant="ghost" disabled={pending} onClick={() => run(() => setTradeStatusAction(id, "cancelled"))}><Ban /> Cancel·lar</Button>
      )}
      <Button variant="secondary" asChild><Link href={`/diari/${id}/editar`}><Pencil /> Editar</Link></Button>
      <Button
        variant="danger"
        size="icon"
        aria-label="Esborrar l'operació"
        disabled={pending}
        onClick={() => {
          if (confirm("Segur que vols esborrar aquesta operació? No es pot desfer.")) run(() => deleteTradeAction(id));
        }}
      >
        {pending ? <Loader2 className="animate-spin" /> : <Trash2 />}
      </Button>
    </div>
  );
}
