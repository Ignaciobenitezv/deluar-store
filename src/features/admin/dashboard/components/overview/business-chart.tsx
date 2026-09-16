"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { overviewColor, overviewUi } from "./overview-ui";
import {
  formatDashboardNumber,
  formatDashboardPrice,
} from "../../lib/dashboard-formatters";
import { cn } from "@/lib/utils";

export type BusinessPoint = {
  date: string;
  label: string;
  revenue: number;
  paidOrders: number;
  previousLabel: string | null;
  previousRevenue: number;
  previousPaidOrders: number;
};

type SeriesKey = "revenue" | "paidOrders";

const SERIES: Record<
  SeriesKey,
  { label: string; money: boolean; unit: string; color: string }
> = {
  revenue: { label: "Facturación", money: true, unit: "", color: overviewColor.series },
  paidOrders: {
    label: "Pedidos",
    money: false,
    unit: "pedidos",
    color: overviewColor.seriesSecondary,
  },
};

function formatAxis(value: number, money: boolean) {
  if (value === 0) {
    return "0";
  }

  const compact = new Intl.NumberFormat("es-AR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

  return money ? `$ ${compact}` : compact;
}

function formatValue(value: number, money: boolean, unit: string) {
  return money
    ? formatDashboardPrice(value)
    : `${formatDashboardNumber(value)}${unit ? ` ${unit}` : ""}`;
}

/**
 * The reference's central chart: the current period drawn solid against the
 * equivalent previous window, both from real orders, on one shared day axis.
 */
export function BusinessChart({
  data,
  currentTotal,
  previousTotal,
  comparisonAvailable,
  height = 280,
}: {
  data: BusinessPoint[];
  currentTotal: string;
  previousTotal: string;
  comparisonAvailable: boolean;
  height?: number;
}) {
  const [seriesKey, setSeriesKey] = useState<SeriesKey>("revenue");
  const config = SERIES[seriesKey];
  const previousKey = seriesKey === "revenue" ? "previousRevenue" : "previousPaidOrders";

  const hasValues = data.some((point) => point[seriesKey] > 0 || point[previousKey] > 0);

  return (
    <div className="flex h-full flex-col px-4 pb-4">
      <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
        <div className="flex flex-wrap items-start gap-x-10 gap-y-3">
          <div>
            <p className="text-[1.5rem] font-semibold leading-none tracking-[-0.02em] tabular-nums text-text-primary">
              {currentTotal}
            </p>
            <p className="mt-2 flex items-center gap-2 text-[12px] text-text-secondary">
              <span aria-hidden className="h-[7px] w-[7px] rounded-full" style={{ backgroundColor: config.color }} />
              Período actual
            </p>
          </div>
          <div>
            <p className="text-[1.5rem] font-semibold leading-none tracking-[-0.02em] tabular-nums text-text-secondary">
              {comparisonAvailable ? previousTotal : "—"}
            </p>
            <p className="mt-2 flex items-center gap-2 text-[12px] text-text-secondary">
              <span aria-hidden className="h-[7px] w-[7px] rounded-full bg-text-secondary/50" />
              Período anterior
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-border bg-surface-elevated p-[3px]">
          {(Object.keys(SERIES) as SeriesKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setSeriesKey(key)}
              aria-pressed={seriesKey === key}
              style={seriesKey === key ? { backgroundColor: SERIES[key].color } : undefined}
              className={cn(
                "rounded-md px-3 py-[6px] text-[12px] font-medium transition-colors duration-150",
                seriesKey === key ? "text-white" : "text-text-secondary hover:bg-surface hover:text-text-primary",
              )}
            >
              {SERIES[key].label}
            </button>
          ))}
        </div>
      </div>

      {!comparisonAvailable ? (
        <p className={cn(overviewUi.note, "mt-2")}>
          La tienda no tiene historia suficiente para cubrir el período anterior completo.
        </p>
      ) : null}

      <div className="mt-4 min-h-0 flex-1" style={{ minHeight: height }}>
        {hasValues ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 6, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="overview-current" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={config.color} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={config.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
                interval="preserveStartEnd"
                minTickGap={40}
                tickMargin={12}
                tick={{ fill: "var(--admin-text-secondary)", fontSize: 12 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={config.money ? 66 : 42}
                tickCount={5}
                tickFormatter={(value) => formatAxis(Number(value), config.money)}
                tick={{ fill: "var(--admin-text-secondary)", fontSize: 12 }}
              />
              <Tooltip
                cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
                content={({ active, payload }) => {
                  const point = payload?.[0]?.payload as BusinessPoint | undefined;

                  if (!active || !point) {
                    return null;
                  }

                  return (
                    <div className="rounded-lg border border-border bg-surface px-3.5 py-2.5 shadow-[var(--admin-shadow-md)]">
                      <p className="text-[12px] text-text-secondary">{point.label}</p>
                      <p className="mt-2 flex items-center justify-between gap-6 text-[13px]">
                        <span className="flex items-center gap-2 text-text-secondary">
                          <span aria-hidden className="h-[7px] w-[7px] rounded-full" style={{ backgroundColor: config.color }} />
                          Actual
                        </span>
                        <span className="font-semibold tabular-nums text-text-primary">
                          {formatValue(point[seriesKey], config.money, config.unit)}
                        </span>
                      </p>
                      <p className="mt-1 flex items-center justify-between gap-6 text-[13px]">
                        <span className="flex items-center gap-2 text-text-secondary">
                          <span aria-hidden className="h-[7px] w-[7px] rounded-full bg-text-secondary/50" />
                          {point.previousLabel ?? "Anterior"}
                        </span>
                        <span className="font-semibold tabular-nums text-text-secondary">
                          {formatValue(point[previousKey], config.money, config.unit)}
                        </span>
                      </p>
                    </div>
                  );
                }}
              />
              {/* The previous window rides underneath as a dashed reference. */}
              <Line
                type="monotone"
                dataKey={previousKey}
                stroke="var(--admin-text-secondary)"
                strokeWidth={1.75}
                strokeDasharray="4 4"
                dot={false}
                activeDot={false}
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey={seriesKey}
                stroke={config.color}
                strokeWidth={2.25}
                fill="url(#overview-current)"
                dot={false}
                activeDot={{
                  r: 4,
                  fill: config.color,
                  stroke: "var(--surface)",
                  strokeWidth: 2,
                }}
                animationDuration={700}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center" style={{ minHeight: height }}>
            <p className={overviewUi.note}>
              Sin {config.label.toLowerCase()} registrada en el período.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
