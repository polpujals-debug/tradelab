"use client";
import { AlertTriangle, RotateCw } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/** Error d'una pàgina: missatge en català amb les causes més habituals. */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="mx-auto mt-16 max-w-lg rounded-2xl border border-loss/30 bg-card p-6 text-center">
      <AlertTriangle className="mx-auto size-8 text-loss" />
      <h1 className="mt-3 text-lg font-semibold text-fg">No s&apos;ha pogut carregar aquesta pàgina</h1>
      <p className="mt-2 text-sm text-muted">Normalment és perquè la connexió amb la base de dades no està ben configurada.</p>
      <ul className="mt-4 space-y-1.5 text-left text-sm text-muted">
        <li>• A Vercel, revisa <code className="text-fg">NEXT_PUBLIC_SUPABASE_URL</code> i <code className="text-fg">SUPABASE_SERVICE_ROLE_KEY</code> (sense espais ni cometes).</li>
        <li>• A Supabase, comprova que has executat <code className="text-fg">1-estructura.sql</code>.</li>
        <li>• Si canvies variables a Vercel, cal fer <b>Redeploy</b>.</li>
      </ul>
      {error.digest && <p className="num mt-4 text-xs text-dim">Codi d&apos;error: {error.digest}</p>}
      <Button className="mt-5" onClick={reset}><RotateCw /> Torna-ho a provar</Button>
    </div>
  );
}
