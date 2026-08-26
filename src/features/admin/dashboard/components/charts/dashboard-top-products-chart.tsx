"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { dashboardChartColors } from "./dashboard-chart-colors";
import { DashboardChartEmpty } from "./dashboard-chart-empty";
import { formatDashboardNumber, formatDashboardPrice } from "../../lib/dashboard-formatters";

type TopProductPoint = {
  productId: string;
  productName: string;
  productSlug: string;
  unitsSold: number;
  revenue: number;
  stock?: number;
};

type DashboardTopProductsChartProps = {
  data: TopProductPoint[];
};

function truncateLabel(value: string, maxLength = 26) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1)}…`;
}

export function DashboardTopProductsChart({ data }: DashboardTopProductsChartProps) {
  const visibleData = [...data]
    .filter((item) => item.unitsSold > 0)
    .sort((left, right) => right.unitsSold - left.unitsSold || right.revenue - left.revenue)
    .slice(0, 10);
  const totalUnits = visibleData.reduce((accumulator, item) => accumulator + item.unitsSold, 0);
  const totalRevenue = visibleData.reduce((accumulator, item) => accumulator + item.revenue, 0);

  if (visibleData.length === 0) {
    return <DashboardChartEmpty />;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-[16px] border border-slate-200/70 bg-slate-50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Unidades</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{formatDashboardNumber(totalUnits)}</p>
        </div>
        <div className="rounded-[16px] border border-slate-200/70 bg-slate-50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Facturación</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{formatDashboardPrice(totalRevenue)}</p>
        </div>
      </div>

      <div className="h-[360px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={visibleData} layout="vertical" margin={{ top: 16, right: 28, bottom: 16, left: 18 }}>
            <CartesianGrid stroke={dashboardChartColors.grid} strokeDasharray="4 4" horizontal={false} />
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#64748b", fontSize: 12 }}
              tickFormatter={(value) => formatDashboardNumber(Number(value))}
            />
            <YAxis
              type="category"
              dataKey="productName"
              tickLine={false}
              axisLine={false}
              width={188}
              tickFormatter={(value) => truncateLabel(String(value))}
              tick={{ fill: "#64748b", fontSize: 11 }}
            />
            <Tooltip
              content={({ active, payload }) => {
                const point = payload?.[0]?.payload as TopProductPoint | undefined;

                if (!active || !point) {
                  return null;
                }

                return (
                  <div className="rounded-[16px] border border-slate-200/80 bg-white px-3 py-2.5 shadow-[0_14px_28px_rgba(15,23,42,0.08)]">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      {point.productName}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{point.productSlug}</p>
                    <div className="mt-2 space-y-1.5 text-sm">
                      <p className="flex items-center justify-between gap-4 text-slate-700">
                        <span>Unidades</span>
                        <span className="font-semibold text-slate-950">{formatDashboardNumber(point.unitsSold)}</span>
                      </p>
                      <p className="flex items-center justify-between gap-4 text-slate-700">
                        <span>Facturación</span>
                        <span className="font-semibold text-slate-950">{formatDashboardPrice(point.revenue)}</span>
                      </p>
                      {typeof point.stock === "number" ? (
                        <p className="flex items-center justify-between gap-4 text-slate-700">
                          <span>Stock</span>
                          <span className="font-semibold text-slate-950">{formatDashboardNumber(point.stock)}</span>
                        </p>
                      ) : null}
                    </div>
                  </div>
                );
              }}
            />
            <Bar dataKey="unitsSold" radius={[0, 999, 999, 0]} barSize={18}>
              {visibleData.map((entry) => (
                <Cell key={entry.productId} fill={dashboardChartColors.navy} />
              ))}
              <LabelList
                dataKey="unitsSold"
                position="right"
                formatter={(value: unknown) => formatDashboardNumber(Number(value))}
                fill="#334155"
                fontSize={12}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
