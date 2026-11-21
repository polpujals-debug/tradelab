"use client";
import { animate, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { formatMoney, formatNumber, formatPct, formatR } from "@/lib/format";

export type CountKind = "money" | "money-signed" | "pct" | "pct-signed" | "r" | "int" | "ratio";

function fmt(kind: CountKind, v: number, currency?: string) {
  switch (kind) {
    case "money": return formatMoney(v, { currency });
    case "money-signed": return formatMoney(v, { currency, sign: true });
    case "pct": return formatPct(v);
    case "pct-signed": return formatPct(v, { sign: true, decimals: 2 });
    case "r": return formatR(v);
    case "int": return formatNumber(Math.round(v), 0);
    case "ratio": return formatNumber(v, 2);
  }
}

/** Comptador suau per als KPIs. Respecta prefers-reduced-motion. */
export function CountUp({ value, kind, currency }: { value: number; kind: CountKind; currency?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, value, { duration: reduce ? 0 : 0.9, ease: [0.16, 1, 0.3, 1], onUpdate: setDisplay });
    return () => controls.stop();
  }, [inView, value, reduce]);

  return (
    <span ref={ref} aria-label={fmt(kind, value, currency)}>
      <span aria-hidden>{fmt(kind, display, currency)}</span>
    </span>
  );
}
