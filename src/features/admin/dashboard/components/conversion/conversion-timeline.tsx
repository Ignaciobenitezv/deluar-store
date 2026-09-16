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
import type { ConversionTimelinePoint } from "@/features/admin/analytics/server/conversion-analytics-service";
import { overviewColor, overviewUi } from "../overview/overview-ui";
import { formatDashboardNumber } from "../../lib/dashboard-formatters";
import { cn } from "@/lib/utils";

/**
 * Four real stages of the same journey, so they take one scale of the analytics
 * blue rather than four unrelated hues: the deeper the tone, the further down
 * the funnel the stage sits.
 */
const SERIES = [
  { key: "sessions", label: "Sesiones", color: "#4f52c9" },
  { key: "addToCart", label: "Add to cart", color: "#2b87c4" },
  { key: "checkoutStarted", label: "Checkout", color: "#0d8b9b" },
  { key: "purchases", label: "Compras", color: "#14804b" },
] as const;

export function ConversionTimeline({
  data,
  height = 300,
}: {
  data: ConversionTimelinePoint[];
  height?: number;
}) {
  const hasValues = data.some(
    (point) =>
      point.sessions > 0 ||
      point.addToCart > 0 ||
      point.checkoutStarted > 0 ||
      point.purchases > 0,
  );

  return (
    <div className="px-6 pb-6">
      <div className="mb-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
        {SERIES.map((series) => (
          <span key={series.key} className="flex items-center gap-2 text-[12.5px] text-text-secondary">
            <span
              aria-hidden
              className="h-[8px] w-[8px] shrink-0 rounded-full"
              style={{ backgroundColor: series.color }}
            />
            {series.label}
          </span>
        ))}
      </div>

      {hasValues ? (
        <div style={{ height }} className="w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barGap={2}>
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
                width={40}
                tickCount={5}
                allowDecimals={false}
                tick={{ fill: overviewColor.muted, fontSize: 12 }}
              />
              <Tooltip
                cursor={{ fill: "var(--admin-surface-elevated)" }}
                content={({ active, payload }) => {
                  const point = payload?.[0]?.payload as ConversionTimelinePoint | undefined;

                  if (!active || !point) {
                    return null;
                  }

                  return (
                    <div className="rounded-lg border border-border bg-surface px-4 py-3 shadow-[var(--admin-shadow-md)]">
                      <p className="text-[12px] text-text-secondary">{point.label}</p>
                      <div className="mt-2 space-y-1">
                        {SERIES.map((series) => (
                          <p
                            key={series.key}
                            className="flex items-center justify-between gap-6 text-[13px]"
                          >
                            <span className="flex items-center gap-2 text-text-secondary">
                              <span
                                aria-hidden
                                className="h-[7px] w-[7px] shrink-0 rounded-full"
                                style={{ backgroundColor: series.color }}
                              />
                              {series.label}
                            </span>
                            <span className="font-semibold tabular-nums text-text-primary">
                              {formatDashboardNumber(point[series.key])}
                            </span>
                          </p>
                        ))}
                      </div>
                    </div>
                  );
                }}
              />
              {SERIES.map((series) => (
                <Bar
                  key={series.key}
                  dataKey={series.key}
                  fill={series.color}
                  radius={[2, 2, 0, 0]}
                  maxBarSize={14}
                  animationDuration={700}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div style={{ height }} className="flex items-center justify-center">
          <p className={overviewUi.note}>Sin actividad registrada en el período.</p>
        </div>
      )}
    </div>
  );
}
