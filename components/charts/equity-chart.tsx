"use client";
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { ChartTooltipBox } from "./chart-tooltip";

export interface EquityPoint { date: string; equity: number; pnl: number; drawdown: number }

export function EquityChart({ data, start, currency }: { data: EquityPoint[]; start: number; currency: string }) {
  const values = data.map((d) => d.equity);
  const min = Math.min(...values, start);
  const max = Math.max(...values, start);
  const pad = Math.max((max - min) * 0.12, 1);
  const up = (values.at(-1) ?? start) >= start;
  return (
    <div className="h-64 w-full sm:h-72" role="img" aria-label={`Corba de capital: de ${formatMoney(start, { currency })} a ${formatMoney(values.at(-1), { currency })}`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="eq-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#1E293B" strokeOpacity={0.6} vertical={false} />
          <XAxis dataKey="date" tickFormatter={(v: string) => formatDate(v, { day: "numeric", month: "short" })} tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={40} />
          <YAxis domain={[min - pad, max + pad]} tickFormatter={(v: number) => formatMoney(v, { currency, decimals: 0 })} tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} width={64} />
          <ReferenceLine y={start} stroke="#475569" strokeDasharray="4 4" />
          <Tooltip
            cursor={{ stroke: "#60A5FA", strokeOpacity: 0.5, strokeDasharray: "3 3" }}
            content={({ active, payload }) => {
              const p = active && payload?.[0]?.payload as EquityPoint | undefined;
              if (!p) return null;
              return (
                <ChartTooltipBox
                  title={formatDateTime(p.date)}
                  rows={[
                    { label: "Capital", value: formatMoney(p.equity, { currency }), swatch: "#3B82F6" },
                    { label: "Operació", value: <span className={p.pnl >= 0 ? "text-profit" : "text-loss"}>{formatMoney(p.pnl, { currency, sign: true })}</span> },
                    { label: "Drawdown", value: formatMoney(p.drawdown, { currency }) },
                  ]}
                />
              );
            }}
          />
          <Area type="monotone" dataKey="equity" stroke={up ? "#60A5FA" : "#EF4444"} strokeWidth={2} fill="url(#eq-fill)" activeDot={{ r: 5, stroke: "#05070D", strokeWidth: 2, fill: "#60A5FA" }} isAnimationActive />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
