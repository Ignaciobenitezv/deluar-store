"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { dashboardChartColors, orderStatusChartColors } from "./dashboard-chart-colors";
import { DashboardChartEmpty } from "./dashboard-chart-empty";
import { useElementWidth } from "./use-element-width";
import { formatDashboardNumber } from "../../lib/dashboard-formatters";

type OrderStatusPoint = {
  status: string;
  label: string;
  orders: number;
};

type DashboardOrdersStatusChartProps = {
  data: OrderStatusPoint[];
};

function getOrderStatusColor(status: string) {
  return orderStatusChartColors[status] ?? dashboardChartColors.slate;
}

function OrdersDonut({ data }: { data: OrderStatusPoint[] }) {
  const totalOrders = data.reduce((accumulator, item) => accumulator + item.orders, 0);

  return (
    <div className="relative flex h-[290px] min-w-0 items-center justify-center px-3 sm:px-4">
      <div className="h-full w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 12, right: 18, bottom: 12, left: 18 }}>
            <Tooltip
              content={({ active, payload }) => {
                const point = payload?.[0]?.payload as OrderStatusPoint | undefined;

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
            <Pie
              data={data}
              dataKey="orders"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={56}
              outerRadius={84}
              paddingAngle={3}
              strokeWidth={0}
            >
              {data.map((entry) => (
                <Cell key={entry.status} fill={getOrderStatusColor(entry.status)} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <p className="text-3xl font-semibold tracking-[-0.05em] text-slate-950">{formatDashboardNumber(totalOrders)}</p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">órdenes</p>
        </div>
      </div>
    </div>
  );
}

function OrdersLegend({ data }: { data: OrderStatusPoint[] }) {
  const totalOrders = data.reduce((accumulator, item) => accumulator + item.orders, 0);

  return (
    <div className="grid min-w-0 gap-2.5">
      {data.map((item) => {
        const share = totalOrders > 0 ? (item.orders / totalOrders) * 100 : 0;
        const color = getOrderStatusColor(item.status);

        return (
          <div key={item.status} className="min-w-0 rounded-[16px] border border-slate-200/70 bg-slate-50 px-3 py-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900" title={item.label}>
                  {item.label}
                </p>
                <p className="mt-0.5 truncate text-xs text-slate-500" title={item.status}>
                  {item.status}
                </p>
              </div>
              <p className="shrink-0 text-sm font-semibold text-slate-950">{formatDashboardNumber(item.orders)}</p>
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
  );
}

export function DashboardOrdersStatusChart({ data }: DashboardOrdersStatusChartProps) {
  const visibleData = data.filter((item) => item.orders > 0);
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const useSideLegend = width >= 760;

  if (visibleData.length === 0) {
    return <DashboardChartEmpty />;
  }

  return (
    <div ref={ref} className="w-full min-w-0">
      {useSideLegend ? (
        <div className="grid gap-4 grid-cols-[minmax(0,1fr)_minmax(0,190px)]">
          <OrdersDonut data={visibleData} />
          <OrdersLegend data={visibleData} />
        </div>
      ) : (
        <div className="grid gap-4">
          <OrdersDonut data={visibleData} />
          <div className="grid min-w-0 gap-2.5 sm:grid-cols-2">
            {visibleData.map((item) => {
              const totalOrders = visibleData.reduce((accumulator, entry) => accumulator + entry.orders, 0);
              const share = totalOrders > 0 ? (item.orders / totalOrders) * 100 : 0;
              const color = getOrderStatusColor(item.status);

              return (
                <div key={item.status} className="min-w-0 rounded-[16px] border border-slate-200/70 bg-slate-50 px-3 py-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900" title={item.label}>
                        {item.label}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-500" title={item.status}>
                        {item.status}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-slate-950">{formatDashboardNumber(item.orders)}</p>
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
      )}
    </div>
  );
}
