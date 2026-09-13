"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CheckoutDailyPoint } from "@/features/admin/analytics/server/checkout-funnel-service";
import { overviewColor } from "../overview/overview-ui";
import { checkoutSeriesColor } from "./checkout-ui";
import { formatDashboardNumber } from "../../lib/dashboard-formatters";

const SERIES = [
  { key: "carts", label: "Carrito", color: checkoutSeriesColor.carts },
  { key: "checkouts", label: "Checkout", color: checkoutSeriesColor.checkouts },
  { key: "orders", label: "Orden", color: checkoutSeriesColor.orders },
  { key: "purchases", label: "Compra", color: checkoutSeriesColor.purchases },
] as const;

export function CheckoutEvolutionLegend() {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-slate-600">
      {SERIES.map((series) => (
        <span key={series.key} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="h-[2px] w-[14px] rounded-full"
            style={{ backgroundColor: series.color }}
          />
          {series.label}
        </span>
      ))}
    </div>
  );
}

/**
 * Four lines, one per stage, over the period's own days. Where every series is
 * flat at zero the axis still shows a readable scale and the chart says so in
 * words, rather than drawing a shape that implies movement.
 */
export function CheckoutEvolution({
  data,
  height = 250,
}: {
  data: CheckoutDailyPoint[];
  height?: number;
}) {
  const hasValues = data.some(
    (point) => point.carts > 0 || point.checkouts > 0 || point.orders > 0 || point.purchases > 0,
  );

  return (
    <div className="px-5 pb-5">
      <div style={{ height }} className="relative w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#eef2f7" vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={{ stroke: "#e2e8f0" }}
              interval="preserveStartEnd"
              minTickGap={36}
              tickMargin={12}
              tick={{ fill: overviewColor.muted, fontSize: 12 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={34}
              tickCount={5}
              allowDecimals={false}
              domain={hasValues ? undefined : [0, 4]}
              tick={{ fill: overviewColor.muted, fontSize: 12 }}
            />
            {hasValues ? (
              <Tooltip
                cursor={{ stroke: "#cbd5e1", strokeWidth: 1 }}
                content={({ active, payload }) => {
                  const point = payload?.[0]?.payload as CheckoutDailyPoint | undefined;

                  if (!active || !point) {
                    return null;
                  }

                  return (
                    <div className="rounded-[6px] border border-[#e2e8f0] bg-white px-3.5 py-2.5 shadow-[0_6px_20px_rgba(15,23,42,0.10)]">
                      <p className="text-[12px] text-slate-500">{point.label}</p>
                      {SERIES.map((series) => (
                        <p
                          key={series.key}
                          className="mt-1.5 flex items-center justify-between gap-6 text-[13px]"
                        >
                          <span className="flex items-center gap-2 text-slate-600">
                            <span
                              aria-hidden
                              className="h-[7px] w-[7px] rounded-full"
                              style={{ backgroundColor: series.color }}
                            />
                            {series.label}
                          </span>
                          <span className="font-semibold tabular-nums text-slate-900">
                            {formatDashboardNumber(point[series.key])}
                          </span>
                        </p>
                      ))}
                    </div>
                  );
                }}
              />
            ) : null}
            {SERIES.map((series) => (
              <Line
                key={series.key}
                type="monotone"
                dataKey={series.key}
                stroke={series.color}
                strokeWidth={1.9}
                dot={data.length <= 31 ? { r: 2.4, strokeWidth: 0, fill: series.color } : false}
                activeDot={{ r: 4, strokeWidth: 0 }}
                animationDuration={600}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>

        {!hasValues ? (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center pb-6 text-[12.5px] text-slate-500">
            Sin carritos registrados en el período.
          </p>
        ) : null}
      </div>
    </div>
  );
}
