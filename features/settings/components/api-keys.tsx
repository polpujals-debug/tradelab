"use client";
import { Check, Copy, KeyRound, Loader2, Plus, ShieldOff } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { PanelTitle } from "@/components/shared/hero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDateTime, formatRelative } from "@/lib/format";
import { createApiKeyAction, revokeApiKeyAction } from "../api-key-actions";

interface Key { id: string; name: string; prefix: string; created_at: string; last_used_at: string | null; revoked_at: string | null }

export function ApiKeys({ keys }: { keys: Key[] }) {
  const [name, setName] = useState("");
  const [fresh, setFresh] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <PanelTitle icon={KeyRound}>Claus d&apos;API</PanelTitle>
          <Link href="/docs/api" className="text-xs text-muted hover:text-accent">Documentació</Link>
        </div>
        <p className="text-xs text-muted">Per a Claude (xat i tasca programada). Fes servir una clau diferent per a cada ús i revoca-la si es filtra.</p>

        {fresh && (
          <div className="space-y-2 rounded-xl border border-warning/40 bg-warning/10 p-3">
            <p className="text-xs font-medium text-warning">Copia-la ara: no es tornarà a mostrar.</p>
            <div className="flex gap-2">
              <code className="num min-w-0 flex-1 truncate rounded-lg border border-border bg-bg px-2.5 py-2 text-xs text-fg">{fresh}</code>
              <Button size="sm" variant="secondary" onClick={async () => { await navigator.clipboard.writeText(fresh); setCopied(true); toast.success("Clau copiada"); }}>
                {copied ? <Check /> : <Copy />}
              </Button>
            </div>
            <button className="text-[11px] text-dim underline cursor-pointer" onClick={() => { setFresh(null); setCopied(false); }}>Ja l&apos;he desada</button>
          </div>
        )}

        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await createApiKeyAction(name); if (r.ok) { setFresh(r.key); setName(""); } else toast.error(r.message); }); }}>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom (ex.: Claude xat)" aria-label="Nom de la clau" />
          <Button type="submit" disabled={pending}>{pending ? <Loader2 className="animate-spin" /> : <Plus />} Crear</Button>
        </form>

        <ul className="divide-y divide-border/60">
          {keys.length === 0 && <li className="py-3 text-sm text-dim">Encara no hi ha cap clau.</li>}
          {keys.map((k) => (
            <li key={k.id} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm text-fg">{k.name} {k.revoked_at ? <Badge tone="loss">Revocada</Badge> : <Badge tone="profit">Activa</Badge>}</p>
                <p className="num truncate text-[11px] text-dim">{k.prefix}… · creada {formatDateTime(k.created_at)} · {k.last_used_at ? `darrer ús ${formatRelative(k.last_used_at)}` : "mai utilitzada"}</p>
              </div>
              {!k.revoked_at && (
                <Button size="sm" variant="danger" disabled={pending} onClick={() => confirm(`Revocar "${k.name}"? Les crides amb aquesta clau deixaran de funcionar.`) && start(async () => { await revokeApiKeyAction(k.id); toast.success("Clau revocada"); })}>
                  <ShieldOff /> Revocar
                </Button>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
