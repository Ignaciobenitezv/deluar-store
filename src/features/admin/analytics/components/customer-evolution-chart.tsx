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
import { dashboardChartColors } from "@/features/admin/dashboard/components/charts/dashboard-chart-colors";
import { DashboardChartEmpty } from "@/features/admin/dashboard/components/charts/dashboard-chart-empty";
import { formatDashboardNumber, formatDashboardPrice } from "@/features/admin/dashboard/lib/dashboard-formatters";

type CustomerEvolutionPoint = {
  date: string;
  label: string;
  newCustomers: number;
  recurrentCustomers: number;
  newRevenue: number;
  recurrentRevenue: number;
};

type CustomerEvolutionChartProps = {
  data: CustomerEvolutionPoint[];
};

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("es-AR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number.isFinite(value) ? value : 0);
}

export function CustomerEvolutionChart({ data }: CustomerEvolutionChartProps) {
  const visibleData = data.filter(
    (item) => item.newCustomers > 0 || item.recurrentCustomers > 0 || item.newRevenue > 0 || item.recurrentRevenue > 0,
  );

  if (visibleData.length === 0) {
    return (
      <DashboardChartEmpty
        compact
        title="No hay actividad suficiente para graficar la evolución."
        description="Cuando haya compras nuevas o recurrentes, la serie temporal se mostrará aquí."
      />
    );
  }

  const totalNewCustomers = visibleData.reduce((accumulator, item) => accumulator + item.newCustomers, 0);
  const totalRecurrentCustomers = visibleData.reduce((accumulator, item) => accumulator + item.recurrentCustomers, 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-[16px] border border-slate-200/70 bg-slate-50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Nuevos</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{formatDashboardNumber(totalNewCustomers)}</p>
        </div>
        <div className="rounded-[16px] border border-slate-200/70 bg-slate-50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Recurrentes</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{formatDashboardNumber(totalRecurrentCustomers)}</p>
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
              minTickGap={18}
              tickMargin={10}
              tick={{ fill: "#64748b", fontSize: 12 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={56}
              tickFormatter={(value) => formatCompactNumber(Number(value))}
              tick={{ fill: "#64748b", fontSize: 12 }}
            />
            <Tooltip
              content={({ active, payload }) => {
                const point = payload?.[0]?.payload as CustomerEvolutionPoint | undefined;

                if (!active || !point) {
                  return null;
                }

                return (
                  <div className="rounded-[16px] border border-slate-200/80 bg-white px-3 py-2.5 shadow-[0_14px_28px_rgba(15,23,42,0.08)]">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{point.label}</p>
                    <div className="mt-2 space-y-1.5 text-sm">
                      <p className="flex items-center justify-between gap-4 text-slate-700">
                        <span>Nuevos</span>
                        <span className="font-semibold text-slate-950">{formatDashboardNumber(point.newCustomers)}</span>
                      </p>
                      <p className="flex items-center justify-between gap-4 text-slate-700">
                        <span>Recurrentes</span>
                        <span className="font-semibold text-slate-950">{formatDashboardNumber(point.recurrentCustomers)}</span>
                      </p>
                      <p className="flex items-center justify-between gap-4 text-slate-700">
                        <span>Facturación de nuevos</span>
                        <span className="font-semibold text-slate-950">{formatDashboardPrice(point.newRevenue)}</span>
                      </p>
                      <p className="flex items-center justify-between gap-4 text-slate-700">
                        <span>Facturación de recurrentes</span>
                        <span className="font-semibold text-slate-950">{formatDashboardPrice(point.recurrentRevenue)}</span>
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
            <Bar dataKey="newCustomers" name="Nuevos" stackId="customers" fill={dashboardChartColors.sky} radius={[8, 8, 0, 0]} barSize={16} />
            <Bar
              dataKey="recurrentCustomers"
              name="Recurrentes"
              stackId="customers"
              fill={dashboardChartColors.emerald}
              radius={[8, 8, 0, 0]}
              barSize={16}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
