"use client";
import { motion, useReducedMotion } from "framer-motion";

/** Indicador semicircular 0–100. */
export function Gauge({ value, color, label }: { value: number; color: string; label: string }) {
  const reduce = useReducedMotion();
  const v = Math.max(0, Math.min(100, value));
  const r = 80;
  const c = Math.PI * r;
  const angle = Math.PI * (1 - v / 100);
  const nx = 100 + Math.cos(angle) * (r - 22);
  const ny = 100 - Math.sin(angle) * (r - 22);
  return (
    <svg viewBox="0 0 200 112" className="w-full max-w-[240px]" role="img" aria-label={label}>
      <defs>
        <linearGradient id="gauge-track" x1="0" x2="1">
          <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
          <stop offset="50%" stopColor="#F59E0B" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#EF4444" stopOpacity="0.25" />
        </linearGradient>
      </defs>
      <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="url(#gauge-track)" strokeWidth="14" strokeLinecap="round" />
      <motion.path
        d="M20 100 A80 80 0 0 1 180 100"
        fill="none"
        stroke={color}
        strokeWidth="14"
        strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c * (1 - v / 100) }}
        transition={{ duration: reduce ? 0 : 0.9, ease: [0.16, 1, 0.3, 1] }}
        style={{ filter: `drop-shadow(0 0 6px ${color})` }}
      />
      <motion.line x1="100" y1="100" initial={false} animate={{ x2: nx, y2: ny }} transition={{ duration: reduce ? 0 : 0.9 }} stroke="#E5E7EB" strokeWidth="3" strokeLinecap="round" />
      <circle cx="100" cy="100" r="6" fill="#E5E7EB" />
    </svg>
  );
}
