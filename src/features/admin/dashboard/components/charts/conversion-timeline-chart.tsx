"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { dashboardChartColors } from "./dashboard-chart-colors";
import { DashboardChartEmpty } from "./dashboard-chart-empty";
import { formatDashboardNumber, formatDashboardShortDate } from "../../lib/dashboard-formatters";
import type { ConversionTimelinePoint } from "@/features/admin/analytics/server/conversion-analytics-service";

type ConversionTimelineChartProps = {
  data: ConversionTimelinePoint[];
};

function compactNumber(value: number) {
  return new Intl.NumberFormat("es-AR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number.isFinite(value) ? value : 0);
}

export function ConversionTimelineChart({ data }: ConversionTimelineChartProps) {
  const visibleData = data.filter(
    (item) => item.sessions > 0 || item.addToCart > 0 || item.checkoutStarted > 0 || item.purchases > 0,
  );

  if (visibleData.length === 0) {
    return (
      <DashboardChartEmpty
        compact
        title="Sin actividad suficiente."
        description="La serie temporal se mostrará cuando haya eventos."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-4">
        <div className="rounded-[16px] border border-slate-200/70 bg-slate-50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Sesiones</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">
            {formatDashboardNumber(visibleData.reduce((accumulator, item) => accumulator + item.sessions, 0))}
          </p>
        </div>
        <div className="rounded-[16px] border border-slate-200/70 bg-slate-50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Add to cart</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">
            {formatDashboardNumber(visibleData.reduce((accumulator, item) => accumulator + item.addToCart, 0))}
          </p>
        </div>
        <div className="rounded-[16px] border border-slate-200/70 bg-slate-50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Checkout</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">
            {formatDashboardNumber(visibleData.reduce((accumulator, item) => accumulator + item.checkoutStarted, 0))}
          </p>
        </div>
        <div className="rounded-[16px] border border-slate-200/70 bg-slate-50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Compras</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">
            {formatDashboardNumber(visibleData.reduce((accumulator, item) => accumulator + item.purchases, 0))}
          </p>
        </div>
      </div>

      <div className="h-[340px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={visibleData} margin={{ top: 12, right: 20, bottom: 18, left: 12 }}>
            <CartesianGrid stroke={dashboardChartColors.grid} strokeDasharray="4 4" vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={16}
              tickMargin={10}
              tick={{ fill: "#64748b", fontSize: 12 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={48}
              tickFormatter={(value) => compactNumber(Number(value))}
              tick={{ fill: "#64748b", fontSize: 12 }}
            />
            <Tooltip
              content={({ active, payload }) => {
                const point = payload?.[0]?.payload as ConversionTimelinePoint | undefined;

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
                        <span>Sesiones</span>
                        <span className="font-semibold text-slate-950">{formatDashboardNumber(point.sessions)}</span>
                      </p>
                      <p className="flex items-center justify-between gap-4 text-slate-700">
                        <span>Add to cart</span>
                        <span className="font-semibold text-slate-950">{formatDashboardNumber(point.addToCart)}</span>
                      </p>
                      <p className="flex items-center justify-between gap-4 text-slate-700">
                        <span>Checkout</span>
                        <span className="font-semibold text-slate-950">{formatDashboardNumber(point.checkoutStarted)}</span>
                      </p>
                      <p className="flex items-center justify-between gap-4 text-slate-700">
                        <span>Compras</span>
                        <span className="font-semibold text-slate-950">{formatDashboardNumber(point.purchases)}</span>
                      </p>
                    </div>
                  </div>
                );
              }}
            />
            <Legend
              verticalAlign="top"
              height={28}
              formatter={(value) => <span className="text-[12px] text-slate-600">{String(value)}</span>}
            />
            <Bar dataKey="sessions" name="Sesiones" fill={dashboardChartColors.navy} radius={[8, 8, 0, 0]} barSize={14} />
            <Bar dataKey="addToCart" name="Add to cart" fill={dashboardChartColors.sky} radius={[8, 8, 0, 0]} barSize={14} />
            <Bar dataKey="checkoutStarted" name="Checkout" fill={dashboardChartColors.amber} radius={[8, 8, 0, 0]} barSize={14} />
            <Bar dataKey="purchases" name="Compras" fill={dashboardChartColors.emerald} radius={[8, 8, 0, 0]} barSize={14} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
