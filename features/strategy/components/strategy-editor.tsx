"use client";
import { ArrowDown, ArrowUp, Check, Eye, GitBranchPlus, ListChecks, Loader2, Pencil, Plus, ScrollText, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { PanelTitle } from "@/components/shared/hero";
import { Markdown } from "@/components/shared/markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { FormState } from "@/features/trades/actions";
import {
  activateStrategyAction, addRuleAction, deleteRuleAction, moveRuleAction, newVersionAction, saveDescriptionAction, updateRuleAction,
} from "../actions";

interface Rule { id: string; text: string; is_required: boolean }

function useRun() {
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<FormState>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) toast.error(r.message ?? "Error");
      else {
        if (r.message) toast.success(r.message);
        after?.();
      }
    });
  return { pending, run };
}

export function PlaybookEditor({ strategyId, description, name, version }: { strategyId: string; description: string; name: string; version: number }) {
  const [editing, setEditing] = useState(false);
  const [md, setMd] = useState(description);
  const { pending, run } = useRun();
  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <PanelTitle icon={ScrollText}>Playbook · {name} v{version}</PanelTitle>
          {editing ? (
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => { setMd(description); setEditing(false); }}>Cancel·lar</Button>
              <Button size="sm" disabled={pending} onClick={() => run(() => saveDescriptionAction(strategyId, md), () => setEditing(false))}>
                {pending ? <Loader2 className="animate-spin" /> : <Check />} Desar
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => setEditing(true)}><Pencil /> Editar</Button>
          )}
        </div>
        {editing ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <Textarea value={md} onChange={(e) => setMd(e.target.value)} className="num min-h-[420px] text-[13px]" aria-label="Playbook en Markdown" />
            <div className="rounded-xl border border-border bg-bg/40 p-4">
              <p className="mb-3 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-dim"><Eye className="size-3" /> Previsualització</p>
              <Markdown>{md}</Markdown>
            </div>
          </div>
        ) : (
          <Markdown>{description || "_Encara no has escrit l'estratègia._"}</Markdown>
        )}
      </CardContent>
    </Card>
  );
}

export function ChecklistEditor({ strategyId, rules }: { strategyId: string; rules: Rule[] }) {
  const [text, setText] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const { pending, run } = useRun();
  return (
    <Card>
      <CardContent className="space-y-4">
        <PanelTitle icon={ListChecks}>Checklist d&apos;entrada</PanelTitle>
        <ol className="space-y-2">
          {rules.map((r, i) => (
            <li key={r.id} className="group flex items-center gap-2 rounded-xl border border-border bg-bg/40 px-3 py-2">
              <span className="num w-5 text-xs text-dim">{i + 1}</span>
              {editId === r.id ? (
                <form className="flex flex-1 gap-2" onSubmit={(e) => { e.preventDefault(); run(() => updateRuleAction(r.id, { text: editText }), () => setEditId(null)); }}>
                  <Input value={editText} onChange={(e) => setEditText(e.target.value)} className="h-8" autoFocus aria-label="Text de la regla" />
                  <Button size="sm" type="submit" disabled={pending}><Check /></Button>
                </form>
              ) : (
                <button type="button" className="flex-1 text-left text-sm text-fg cursor-text" onClick={() => { setEditId(r.id); setEditText(r.text); }}>{r.text}</button>
              )}
              <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-dim">
                <Switch checked={r.is_required} disabled={pending} onCheckedChange={(v) => run(() => updateRuleAction(r.id, { is_required: v }))} aria-label="Obligatòria" />
                <span className="hidden sm:inline">Oblig.</span>
              </label>
              <div className="flex">
                <Button size="icon" variant="ghost" className="size-7" disabled={pending || i === 0} onClick={() => run(() => moveRuleAction(strategyId, r.id, -1))} aria-label="Pujar"><ArrowUp /></Button>
                <Button size="icon" variant="ghost" className="size-7" disabled={pending || i === rules.length - 1} onClick={() => run(() => moveRuleAction(strategyId, r.id, 1))} aria-label="Baixar"><ArrowDown /></Button>
                <Button size="icon" variant="ghost" className="size-7 hover:text-loss" disabled={pending} onClick={() => confirm("Eliminar la regla? Les operacions antigues perdran aquesta comprovació.") && run(() => deleteRuleAction(r.id))} aria-label="Eliminar"><Trash2 /></Button>
              </div>
            </li>
          ))}
        </ol>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); run(() => addRuleAction(strategyId, text), () => setText("")); }}>
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Nova regla (ex.: No operar 15 min abans de notícies)" aria-label="Nova regla" />
          <Button type="submit" disabled={pending || text.trim().length < 3}><Plus /> Afegir</Button>
        </form>
        <p className="text-[11px] text-dim">Per a canvis importants, crea una versió nova: així podràs comparar resultats entre versions.</p>
      </CardContent>
    </Card>
  );
}

export function VersionActions({ id, isActive }: { id: string; isActive: boolean }) {
  const { pending, run } = useRun();
  return (
    <div className="flex gap-2">
      {isActive ? <Badge tone="profit">Activa</Badge> : (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => activateStrategyAction(id))}>Activar</Button>
      )}
      <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => newVersionAction(id))} className={cn(!isActive && "hidden")}>
        {pending ? <Loader2 className="animate-spin" /> : <GitBranchPlus />} Nova versió
      </Button>
    </div>
  );
}
