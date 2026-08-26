"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { dashboardChartColors } from "./dashboard-chart-colors";
import { DashboardChartEmpty } from "./dashboard-chart-empty";
import { formatDashboardNumber } from "../../lib/dashboard-formatters";

type StockPoint = {
  status: "in_stock" | "low_stock" | "out_of_stock";
  label: string;
  products: number;
};

type DashboardStockChartProps = {
  data: StockPoint[];
  compactEmpty?: boolean;
};

const stockColors: Record<StockPoint["status"], string> = {
  in_stock: "#10b981",
  low_stock: "#f59e0b",
  out_of_stock: "#f43f5e",
};

export function DashboardStockChart({ data, compactEmpty = false }: DashboardStockChartProps) {
  const visibleData = [...data].filter((item) => item.products > 0);
  const totalProducts = visibleData.reduce((accumulator, item) => accumulator + item.products, 0);

  if (visibleData.length === 0) {
    return <DashboardChartEmpty compact={compactEmpty} />;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.04fr)_minmax(0,0.96fr)]">
      <div className="relative h-[270px] min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              content={({ active, payload }) => {
                const point = payload?.[0]?.payload as StockPoint | undefined;

                if (!active || !point) {
                  return null;
                }

                const share = totalProducts > 0 ? (point.products / totalProducts) * 100 : 0;

                return (
                  <div className="rounded-[16px] border border-slate-200/80 bg-white px-3 py-2.5 shadow-[0_14px_28px_rgba(15,23,42,0.08)]">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{point.label}</p>
                    <div className="mt-2 space-y-1.5 text-sm">
                      <p className="flex items-center justify-between gap-4 text-slate-700">
                        <span>Productos</span>
                        <span className="font-semibold text-slate-950">{formatDashboardNumber(point.products)}</span>
                      </p>
                      <p className="flex items-center justify-between gap-4 text-slate-700">
                        <span>Participación</span>
                        <span className="font-semibold text-slate-950">
                          {new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 }).format(share)}%
                        </span>
                      </p>
                    </div>
                  </div>
                );
              }}
            />
            <Pie
              data={visibleData}
              dataKey="products"
              nameKey="label"
              cx="46%"
              cy="50%"
              innerRadius={60}
              outerRadius={96}
              paddingAngle={3}
              strokeWidth={0}
            >
              {visibleData.map((entry) => (
                <Cell key={entry.status} fill={stockColors[entry.status] ?? dashboardChartColors.slate} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-3xl font-semibold tracking-[-0.05em] text-slate-950">{formatDashboardNumber(totalProducts)}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">productos</p>
          </div>
        </div>
      </div>

      <div className="space-y-2.5">
        {visibleData.map((item) => {
          const share = totalProducts > 0 ? (item.products / totalProducts) * 100 : 0;
          const color = stockColors[item.status] ?? dashboardChartColors.slate;

          return (
            <div key={item.status} className="rounded-[16px] border border-slate-200/70 bg-slate-50 px-3 py-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{item.label}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{formatDashboardNumber(item.products)} productos</p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-slate-950">{formatDashboardNumber(item.products)}</p>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white">
                  <div className="h-full rounded-full" style={{ width: `${Math.max(8, share)}%`, backgroundColor: color }} />
                </div>
                <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">
                  {new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 }).format(share)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
