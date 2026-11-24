"use client";
import { AlertTriangle, RotateCw } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface Detail { message: string | null; path?: string; at?: string; stack?: string | null }

/** Error d'una pàgina: mostra el missatge real (desat pel servidor) per poder-lo arreglar. */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [detail, setDetail] = useState<Detail | null>(null);
  useEffect(() => {
    console.error(error);
    if (!error.digest) return;
    let tries = 0;
    const load = () =>
      fetch(`/registre-errors?d=${encodeURIComponent(error.digest!)}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: Detail | null) => {
          if (d?.message) setDetail(d);
          else if (++tries < 4) setTimeout(load, 1500);
        })
        .catch(() => undefined);
    load();
  }, [error]);

  return (
    <div className="mx-auto mt-10 max-w-lg rounded-2xl border border-loss/30 bg-card p-6 text-center">
      <AlertTriangle className="mx-auto size-8 text-loss" />
      <h1 className="mt-3 text-lg font-semibold text-fg">No s&apos;ha pogut carregar aquesta pàgina</h1>
      {detail?.message ? (
        <div className="mt-4 rounded-xl border border-border bg-bg/60 p-3 text-left">
          <p className="text-[10px] uppercase tracking-[0.18em] text-dim">Missatge de l&apos;error (envia&apos;l a Claude)</p>
          <p className="num mt-1 break-words text-sm text-loss">{detail.message}</p>
          {detail.stack && <pre className="num mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words text-[10px] text-dim">{detail.stack}</pre>}
          {detail.path && <p className="mt-2 text-[11px] text-dim">Pàgina: {detail.path}</p>}
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted">{error.digest ? "Buscant el detall de l'error…" : error.message}</p>
      )}
      {error.digest && <p className="num mt-3 text-xs text-dim">Codi d&apos;error: {error.digest}</p>}
      <Button className="mt-5" onClick={reset}><RotateCw /> Torna-ho a provar</Button>
    </div>
  );
}
