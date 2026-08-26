"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  LabelList,
} from "recharts";
import { dashboardChartColors, paymentMethodChartColors } from "./dashboard-chart-colors";
import { DashboardChartEmpty } from "./dashboard-chart-empty";
import { formatDashboardNumber, formatDashboardPrice } from "../../lib/dashboard-formatters";

type PaymentMethodPoint = {
  method: string;
  label: string;
  orders: number;
  revenue: number;
};

type DashboardPaymentMethodsChartProps = {
  data: PaymentMethodPoint[];
};

function truncateLabel(value: string, maxLength = 24) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1)}…`;
}

export function DashboardPaymentMethodsChart({ data }: DashboardPaymentMethodsChartProps) {
  const visibleData = [...data]
    .filter((item) => item.orders > 0)
    .sort((left, right) => right.orders - left.orders || right.revenue - left.revenue);
  const totalOrders = visibleData.reduce((accumulator, item) => accumulator + item.orders, 0);
  const totalRevenue = visibleData.reduce((accumulator, item) => accumulator + item.revenue, 0);

  if (visibleData.length === 0) {
    return <DashboardChartEmpty />;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-[16px] border border-slate-200/70 bg-slate-50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Pedidos</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{formatDashboardNumber(totalOrders)}</p>
        </div>
        <div className="rounded-[16px] border border-slate-200/70 bg-slate-50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Facturación</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{formatDashboardPrice(totalRevenue)}</p>
        </div>
      </div>

      <div className="h-[340px] w-full min-w-0">
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
              dataKey="label"
              tickLine={false}
              axisLine={false}
              width={176}
              tickFormatter={(value) => truncateLabel(String(value))}
              tick={{ fill: "#64748b", fontSize: 11 }}
            />
            <Tooltip
              content={({ active, payload }) => {
                const point = payload?.[0]?.payload as PaymentMethodPoint | undefined;

                if (!active || !point) {
                  return null;
                }

                return (
                  <div className="rounded-[16px] border border-slate-200/80 bg-white px-3 py-2.5 shadow-[0_14px_28px_rgba(15,23,42,0.08)]">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{point.label}</p>
                    <div className="mt-2 space-y-1.5 text-sm">
                      <p className="flex items-center justify-between gap-4 text-slate-700">
                        <span>Pedidos</span>
                        <span className="font-semibold text-slate-950">{formatDashboardNumber(point.orders)}</span>
                      </p>
                      <p className="flex items-center justify-between gap-4 text-slate-700">
                        <span>Facturación</span>
                        <span className="font-semibold text-slate-950">{formatDashboardPrice(point.revenue)}</span>
                      </p>
                    </div>
                  </div>
                );
              }}
            />
            <Bar dataKey="orders" radius={[0, 999, 999, 0]} barSize={18}>
              {visibleData.map((entry, index) => (
                <Cell
                  key={entry.method}
                  fill={paymentMethodChartColors[index % paymentMethodChartColors.length] ?? dashboardChartColors.navy}
                />
              ))}
              <LabelList
                dataKey="orders"
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
