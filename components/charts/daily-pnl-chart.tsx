"use client";
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDate, formatMoney, formatR } from "@/lib/format";
import { ChartTooltipBox } from "./chart-tooltip";

export interface DailyPoint { day: string; pnl: number; trades: number; r: number }

export function DailyPnlChart({ data, currency }: { data: DailyPoint[]; currency: string }) {
  return (
    <div className="h-64 w-full sm:h-72" role="img" aria-label="P&L per dia">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barCategoryGap={2}>
          <CartesianGrid stroke="#1E293B" strokeOpacity={0.6} vertical={false} />
          <XAxis dataKey="day" tickFormatter={(v: string) => formatDate(v, { day: "numeric", month: "short" })} tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={24} />
          <YAxis tickFormatter={(v: number) => formatMoney(v, { currency, decimals: 0 })} tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} width={56} />
          <ReferenceLine y={0} stroke="#334155" />
          <Tooltip
            cursor={{ fill: "rgba(96,165,250,0.08)" }}
            content={({ active, payload }) => {
              const p = active && payload?.[0]?.payload as DailyPoint | undefined;
              if (!p) return null;
              return (
                <ChartTooltipBox
                  title={formatDate(p.day, { weekday: "long", day: "numeric", month: "long" })}
                  rows={[
                    { label: "P&L", value: <span className={p.pnl > 0 ? "text-profit" : p.pnl < 0 ? "text-loss" : ""}>{formatMoney(p.pnl, { currency, sign: true })}</span> },
                    { label: "R", value: formatR(p.r) },
                    { label: "Operacions", value: p.trades },
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="pnl" radius={[4, 4, 4, 4]} maxBarSize={28}>
            {data.map((d) => <Cell key={d.day} fill={d.pnl >= 0 ? "#10B981" : "#EF4444"} fillOpacity={d.trades ? 0.9 : 0} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
