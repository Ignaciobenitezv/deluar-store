"use client";

import { useId } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { dashboardChartColors } from "./dashboard-chart-colors";
import { DashboardChartEmpty } from "./dashboard-chart-empty";
import {
  formatDashboardNumber,
  formatDashboardPrice,
  formatDashboardShortDate,
} from "../../lib/dashboard-formatters";

type RevenuePoint = {
  date: string;
  label: string;
  createdOrders: number;
  paidOrders: number;
  unitsSold: number;
  revenue: number;
};

type DashboardRevenueChartProps = {
  data: RevenuePoint[];
};

function formatCompactCurrency(value: number) {
  const formatted = new Intl.NumberFormat("es-AR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number.isFinite(value) ? value : 0);

  return `$ ${formatted}`;
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("es-AR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number.isFinite(value) ? value : 0);
}

export function DashboardRevenueChart({ data }: DashboardRevenueChartProps) {
  const gradientId = useId();
  const totalRevenue = data.reduce((accumulator, item) => accumulator + item.revenue, 0);
  const totalOrders = data.reduce((accumulator, item) => accumulator + item.paidOrders, 0);
  const totalUnits = data.reduce((accumulator, item) => accumulator + item.unitsSold, 0);

  if (data.length === 0) {
    return <DashboardChartEmpty />;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-[16px] border border-slate-200/70 bg-slate-50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Facturación</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{formatDashboardPrice(totalRevenue)}</p>
        </div>
        <div className="rounded-[16px] border border-slate-200/70 bg-slate-50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Pedidos</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{formatDashboardNumber(totalOrders)}</p>
        </div>
        <div className="rounded-[16px] border border-slate-200/70 bg-slate-50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Unidades</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{formatDashboardNumber(totalUnits)}</p>
        </div>
      </div>

      <div className="h-[340px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 12, right: 20, bottom: 18, left: 12 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="5%" stopColor={dashboardChartColors.navy} stopOpacity={0.28} />
                <stop offset="95%" stopColor={dashboardChartColors.navy} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={dashboardChartColors.grid} strokeDasharray="4 4" vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={26}
              tickMargin={10}
              tick={{ fill: "#64748b", fontSize: 12 }}
            />
            <YAxis
              yAxisId="revenue"
              tickLine={false}
              axisLine={false}
              width={88}
              tickFormatter={(value) => formatCompactCurrency(Number(value))}
              tick={{ fill: "#64748b", fontSize: 12 }}
            />
            <YAxis
              yAxisId="orders"
              orientation="right"
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={(value) => formatCompactNumber(Number(value))}
              tick={{ fill: "#64748b", fontSize: 12 }}
            />
            <Tooltip
              content={({ active, payload }) => {
                const point = payload?.[0]?.payload as RevenuePoint | undefined;

                if (!active || !point) {
                  return null;
                }

                return (
                  <div className="rounded-[16px] border border-slate-200/80 bg-white px-3 py-2.5 shadow-[0_14px_28px_rgba(15,23,42,0.08)]">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      {formatDashboardShortDate(point.date)}
                    </p>
                    <div className="mt-2 space-y-1.5 text-sm">
                      <p className="flex items-center justify-between gap-4 text-slate-700">
                        <span>Facturación</span>
                        <span className="font-semibold text-slate-950">{formatDashboardPrice(point.revenue)}</span>
                      </p>
                      <p className="flex items-center justify-between gap-4 text-slate-700">
                        <span>Pedidos</span>
                        <span className="font-semibold text-slate-950">{formatDashboardNumber(point.paidOrders)}</span>
                      </p>
                      <p className="flex items-center justify-between gap-4 text-slate-700">
                        <span>Unidades</span>
                        <span className="font-semibold text-slate-950">{formatDashboardNumber(point.unitsSold)}</span>
                      </p>
                    </div>
                  </div>
                );
              }}
            />
            <Area
              yAxisId="revenue"
              type="monotone"
              dataKey="revenue"
              stroke={dashboardChartColors.navy}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={false}
              activeDot={{ r: 4, stroke: dashboardChartColors.navy, strokeWidth: 2, fill: "#ffffff" }}
            />
            <Line
              yAxisId="orders"
              type="monotone"
              dataKey="paidOrders"
              stroke={dashboardChartColors.emerald}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, stroke: dashboardChartColors.emerald, strokeWidth: 2, fill: "#ffffff" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
