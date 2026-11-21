"use client";
import { CheckCircle2, Flag, Loader2, Minus, Plus, Trash2 } from "lucide-react";
import { useActionState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import { PanelTitle } from "@/components/shared/hero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, NativeSelect } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { formatDate, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { bumpGoalAction, createGoalAction, deleteGoalAction } from "../actions";
import type { GoalProgress } from "../goals";

const KIND_LABEL = {
  journal_streak: "Dies seguits registrant", winning_trades: "Operacions guanyadores", trades_count: "Operacions tancades",
  net_pnl: "P&L net (€)", win_rate: "Taxa d'encert (%)", custom: "Manual",
} as const;
type Kind = keyof typeof KIND_LABEL;

export interface GoalView { id: string; title: string; kind: Kind; starts_on: string; deadline: string | null; progress: GoalProgress }

export function GoalCard({ g }: { g: GoalView }) {
  const [pending, start] = useTransition();
  const p = g.progress;
  return (
    <Card className={cn("p-5", p.done && "border-profit/40", p.expired && "border-loss/30 opacity-80")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-fg">{g.title}</p>
          <p className="mt-0.5 text-[11px] text-dim">{KIND_LABEL[g.kind]} · {formatDate(g.starts_on, { day: "numeric", month: "short" })}{g.deadline ? ` → ${formatDate(g.deadline, { day: "numeric", month: "short", year: "numeric" })}` : ""}</p>
        </div>
        {p.done ? <Badge tone="profit"><CheckCircle2 /> Assolit</Badge> : p.expired ? <Badge tone="loss">Vençut</Badge> : <Badge tone="primary">En curs</Badge>}
      </div>
      <div className="mt-4 flex items-baseline justify-between">
        <span className="num text-2xl font-semibold text-fg">{formatNumber(p.current, 2)}<span className="text-sm font-normal text-dim"> / {formatNumber(p.target, 2)} {p.unit}</span></span>
        <span className="num text-sm text-muted">{Math.round(p.pct)} %</span>
      </div>
      <Progress className="mt-2" value={p.pct} tone={p.done ? "profit" : p.expired ? "loss" : "primary"} label={g.title} />
      <div className="mt-4 flex justify-end gap-1">
        {g.kind === "custom" && (
          <>
            <Button size="icon" variant="ghost" className="size-8" disabled={pending} aria-label="Restar" onClick={() => start(async () => { await bumpGoalAction(g.id, -1); })}><Minus /></Button>
            <Button size="icon" variant="ghost" className="size-8" disabled={pending} aria-label="Sumar" onClick={() => start(async () => { await bumpGoalAction(g.id, 1); })}><Plus /></Button>
          </>
        )}
        <Button size="icon" variant="ghost" className="size-8 hover:text-loss" disabled={pending} aria-label="Eliminar l'objectiu" onClick={() => confirm("Eliminar l'objectiu?") && start(async () => { await deleteGoalAction(g.id); })}><Trash2 /></Button>
      </div>
    </Card>
  );
}

export function NewGoal({ today }: { today: string }) {
  const [state, action, pending] = useActionState(createGoalAction, { ok: false });
  useEffect(() => { if (state.ok) toast.success(state.message); else if (state.message) toast.error(state.message); }, [state]);
  return (
    <Card>
      <CardContent>
        <PanelTitle icon={Flag}>Nou objectiu</PanelTitle>
        <form action={action} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Títol" htmlFor="g-title" className="lg:col-span-2"><Input id="g-title" name="title" placeholder="Desembre: 10 operacions amb checklist al 100 %" required /></Field>
          <Field label="Tipus" htmlFor="g-kind">
            <NativeSelect id="g-kind" name="kind" defaultValue="winning_trades">{(Object.keys(KIND_LABEL) as Kind[]).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}</NativeSelect>
          </Field>
          <Field label="Objectiu" htmlFor="g-target"><Input id="g-target" name="target" inputMode="decimal" defaultValue="1" className="num" required /></Field>
          <div className="grid grid-cols-2 gap-2 sm:col-span-2">
            <Field label="Inici" htmlFor="g-start"><Input id="g-start" name="starts_on" type="date" defaultValue={today} required /></Field>
            <Field label="Límit" htmlFor="g-end"><Input id="g-end" name="deadline" type="date" /></Field>
          </div>
          <div className="flex items-end sm:col-span-2"><Button type="submit" disabled={pending}>{pending ? <Loader2 className="animate-spin" /> : <Plus />} Crear objectiu</Button></div>
        </form>
      </CardContent>
    </Card>
  );
}
