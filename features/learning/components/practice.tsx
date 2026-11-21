"use client";
import { ArrowDownRight, ArrowRight, ArrowUpRight, CheckCircle2, Loader2, Minus, XCircle } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Markdown } from "@/components/shared/markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { formatDate, formatPrice } from "@/lib/format";
import { L } from "@/lib/i18n/ca";
import { cn } from "@/lib/utils";
import { answerAction, nextQuestionAction } from "../actions";
import type { PracticeQuestion, PracticeReveal } from "../service";

type Bias = "bullish" | "bearish" | "neutral";

export function Practice({ first }: { first: PracticeQuestion | null }) {
  const [q, setQ] = useState(first);
  const [seen, setSeen] = useState<string[]>(first ? [first.id] : []);
  const [bias, setBias] = useState<Bias | null>(null);
  const [stop, setStop] = useState("");
  const [reveal, setReveal] = useState<PracticeReveal | null>(null);
  const [score, setScore] = useState({ ok: 0, total: 0 });
  const [pending, start] = useTransition();

  if (!q) return <Card><CardContent className="text-sm text-muted">Encara no hi ha anàlisis revisades ni operacions amb captura per practicar.</CardContent></Card>;

  const next = () => start(async () => {
    const n = await nextQuestionAction(seen.slice(-30));
    setQ(n); setBias(null); setStop(""); setReveal(null);
    if (n) setSeen((s) => [...s, n.id]);
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <Card className="overflow-hidden">
        <img src={q.image} alt="Captura per practicar" className="w-full bg-bg object-contain" />
        <div className="flex flex-wrap items-center gap-2 p-4 text-xs text-dim">
          <Badge tone="primary">{q.asset}</Badge>{q.timeframes.map((t) => <Badge key={t}>{t}</Badge>)}<span>{formatDate(q.date)}</span>
          <span className="ml-auto">Intenta respondre sense mirar les marques del gràfic.</span>
        </div>
      </Card>

      <div className="space-y-4">
        <Card className="border-primary/25">
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">Pregunta</p>
              <span className="num text-xs text-muted">Sessió: {score.ok}/{score.total}</span>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-fg">1. Quin és el biaix?</p>
              <div className="grid grid-cols-3 gap-2">
                {([["bullish", ArrowUpRight, "border-profit/50 bg-profit/15 text-profit"], ["bearish", ArrowDownRight, "border-loss/50 bg-loss/15 text-loss"], ["neutral", Minus, "border-border-strong bg-white/5 text-fg"]] as const).map(([b, Icon, on]) => (
                  <button key={b} type="button" disabled={!!reveal} aria-pressed={bias === b} onClick={() => setBias(b)}
                    className={cn("flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-sm font-medium transition-colors cursor-pointer disabled:cursor-default", bias === b ? on : "border-border text-muted hover:text-fg")}>
                    <Icon className="size-4" /> {L.bias[b]}
                  </button>
                ))}
              </div>
            </div>
            <Field label="2. On posaries l'stop loss?" htmlFor="p-stop" hint={q.entry ? `Entrada de referència: ${formatPrice(q.entry)}` : "Opcional"}>
              <Input id="p-stop" inputMode="decimal" value={stop} disabled={!!reveal} onChange={(e) => setStop(e.target.value)} className="num" />
            </Field>
            {!reveal ? (
              <Button className="w-full" disabled={!bias || pending} onClick={() => bias && start(async () => {
                const r = await answerAction(q.kind, q.id, bias, stop ? Number(stop.replace(",", ".")) : null);
                setReveal(r);
                setScore((s) => ({ ok: s.ok + (r.biasCorrect ? 1 : 0), total: s.total + 1 }));
              })}>{pending ? <Loader2 className="animate-spin" /> : null} Revelar resposta</Button>
            ) : (
              <Button className="w-full" variant="secondary" onClick={next} disabled={pending}>{pending ? <Loader2 className="animate-spin" /> : <ArrowRight />} Següent captura</Button>
            )}
          </CardContent>
        </Card>

        {reveal && (
          <Card className={reveal.biasCorrect ? "border-profit/40" : "border-loss/40"}>
            <CardContent className="space-y-4">
              <p className={cn("flex items-center gap-2 text-sm font-semibold", reveal.biasCorrect ? "text-profit" : "text-loss")}>
                {reveal.biasCorrect ? <CheckCircle2 className="size-5" /> : <XCircle className="size-5" />}
                {reveal.biasCorrect ? "Correcte!" : `No: el biaix era ${reveal.correctBias ? L.bias[reveal.correctBias].toLowerCase() : "—"}`}
              </p>
              {reveal.stop != null && (
                <p className="text-sm text-muted">SL de referència: <span className="num text-fg">{formatPrice(reveal.stop)}</span>
                  {reveal.stopDiffPct != null && <> · el teu està a <span className={cn("num", Math.abs(reveal.stopDiffPct) < 0.3 ? "text-profit" : "text-warning")}>{reveal.stopDiffPct > 0 ? "+" : ""}{reveal.stopDiffPct.toFixed(2)} %</span></>}
                </p>
              )}
              {reveal.outcome && <p className="text-xs text-dim">Resultat de l&apos;escenari: {L.outcome[reveal.outcome as keyof typeof L.outcome]}</p>}
              <div className="max-h-80 overflow-y-auto rounded-xl border border-border bg-bg/40 p-3"><Markdown className="text-sm">{reveal.explanation}</Markdown></div>
              <Link href={reveal.link} className="inline-flex items-center gap-1 text-xs text-accent">Obrir l&apos;original <ArrowRight className="size-3" /></Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
