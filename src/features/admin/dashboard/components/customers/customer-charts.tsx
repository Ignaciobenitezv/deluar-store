"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CustomerEvolutionPoint } from "@/features/admin/analytics/server/customer-analytics-service";
import { overviewColor } from "../overview/overview-ui";
import { customerColor } from "./customer-palette";
import { formatDashboardNumber } from "../../lib/dashboard-formatters";

/**
 * One segment, one tone: new customers take the analytics blue and returning
 * customers its lighter sibling. The pair is used identically in the chart, the
 * donut and the legend, so the reader learns it once.
 */
export const SEGMENT_COLOR = {
  nuevo: customerColor.primary,
  recurrente: customerColor.secondary,
} as const;

export function CustomerEvolution({
  data,
  height = 240,
}: {
  data: CustomerEvolutionPoint[];
  height?: number;
}) {
  const hasValues = data.some(
    (point) => point.newCustomers > 0 || point.recurrentCustomers > 0,
  );

  return (
    <div className="px-5 pb-5">
      <div style={{ height }} className="relative w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
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
              domain={hasValues ? undefined : [0, 40]}
              tick={{ fill: overviewColor.muted, fontSize: 12 }}
            />
            {hasValues ? (
              <Tooltip
                cursor={{ fill: "rgba(15,23,42,0.045)" }}
                content={({ active, payload }) => {
                  const point = payload?.[0]?.payload as CustomerEvolutionPoint | undefined;

                  if (!active || !point) {
                    return null;
                  }

                  return (
                    <div className="rounded-[6px] border border-border bg-surface px-3.5 py-2.5 shadow-[var(--admin-shadow-md)]">
                      <p className="text-[12px] text-text-secondary">{point.label}</p>
                      <p className="mt-2 flex items-center justify-between gap-6 text-[13px]">
                        <span className="flex items-center gap-2 text-text-secondary">
                          <span
                            aria-hidden
                            className="h-[7px] w-[7px] rounded-full"
                            style={{ backgroundColor: SEGMENT_COLOR.nuevo }}
                          />
                          Nuevos
                        </span>
                        <span className="font-semibold tabular-nums text-text-primary">
                          {formatDashboardNumber(point.newCustomers)}
                        </span>
                      </p>
                      <p className="mt-1 flex items-center justify-between gap-6 text-[13px]">
                        <span className="flex items-center gap-2 text-text-secondary">
                          <span
                            aria-hidden
                            className="h-[7px] w-[7px] rounded-full"
                            style={{ backgroundColor: SEGMENT_COLOR.recurrente }}
                          />
                          Recurrentes
                        </span>
                        <span className="font-semibold tabular-nums text-text-primary">
                          {formatDashboardNumber(point.recurrentCustomers)}
                        </span>
                      </p>
                    </div>
                  );
                }}
              />
            ) : null}
            <Bar
              dataKey="newCustomers"
              stackId="customers"
              fill={SEGMENT_COLOR.nuevo}
              maxBarSize={18}
              animationDuration={600}
            />
            <Bar
              dataKey="recurrentCustomers"
              stackId="customers"
              fill={SEGMENT_COLOR.recurrente}
              radius={[2, 2, 0, 0]}
              maxBarSize={18}
              animationDuration={600}
            />
          </BarChart>
        </ResponsiveContainer>

        {!hasValues ? (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center pb-6 text-[12.5px] text-text-secondary">
            Sin compradores registrados en el período.
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function SegmentLegend() {
  return (
    <div className="flex shrink-0 items-center gap-4 text-[12px] text-text-secondary">
      <span className="flex items-center gap-2">
        <span
          aria-hidden
          className="h-[8px] w-[8px] rounded-full"
          style={{ backgroundColor: SEGMENT_COLOR.nuevo }}
        />
        Nuevos
      </span>
      <span className="flex items-center gap-2">
        <span
          aria-hidden
          className="h-[8px] w-[8px] rounded-full"
          style={{ backgroundColor: SEGMENT_COLOR.recurrente }}
        />
        Recurrentes
      </span>
    </div>
  );
}
