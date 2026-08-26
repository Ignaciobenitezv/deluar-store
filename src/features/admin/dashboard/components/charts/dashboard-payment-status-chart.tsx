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
} from "recharts";
import { dashboardChartColors } from "./dashboard-chart-colors";
import { DashboardChartEmpty } from "./dashboard-chart-empty";
import { formatDashboardNumber } from "../../lib/dashboard-formatters";

type PaymentStatusPoint = {
  status: string;
  label: string;
  orders: number;
};

type DashboardPaymentStatusChartProps = {
  data: PaymentStatusPoint[];
};

function statusColor(status: string) {
  switch (status) {
    case "APPROVED":
      return "#10b981";
    case "PENDING":
      return "#f59e0b";
    case "REJECTED":
    case "CHARGED_BACK":
      return "#f43f5e";
    case "CANCELLED":
      return "#64748b";
    default:
      return dashboardChartColors.slate;
  }
}

export function DashboardPaymentStatusChart({ data }: DashboardPaymentStatusChartProps) {
  const visibleData = [...data].filter((item) => item.orders > 0).sort((left, right) => right.orders - left.orders);
  const totalOrders = visibleData.reduce((accumulator, item) => accumulator + item.orders, 0);

  if (visibleData.length === 0) {
    return <DashboardChartEmpty />;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[18px] border border-slate-200/70 bg-slate-50 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Total</p>
        <p className="mt-1 text-lg font-semibold tracking-[-0.04em] text-slate-950">
          {formatDashboardNumber(totalOrders)} órdenes
        </p>
      </div>

      <div className="h-[320px] w-full min-w-0">
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
              width={160}
              tick={{ fill: "#64748b", fontSize: 11 }}
            />
            <Tooltip
              content={({ active, payload }) => {
                const point = payload?.[0]?.payload as PaymentStatusPoint | undefined;

                if (!active || !point) {
                  return null;
                }

                const share = totalOrders > 0 ? (point.orders / totalOrders) * 100 : 0;

                return (
                  <div className="rounded-[16px] border border-slate-200/80 bg-white px-3 py-2.5 shadow-[0_14px_28px_rgba(15,23,42,0.08)]">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{point.label}</p>
                    <div className="mt-2 space-y-1.5 text-sm">
                      <p className="flex items-center justify-between gap-4 text-slate-700">
                        <span>Órdenes</span>
                        <span className="font-semibold text-slate-950">{formatDashboardNumber(point.orders)}</span>
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
            <Bar dataKey="orders" radius={[0, 999, 999, 0]} barSize={18}>
              {visibleData.map((entry) => (
                <Cell key={entry.status} fill={statusColor(entry.status)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
