"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { overviewColor, overviewUi } from "../overview/overview-ui";
import { formatDashboardNumber, formatDashboardPrice } from "../../lib/dashboard-formatters";

export type ProductDailyPoint = {
  date: string;
  label: string;
  unitsSold: number;
  revenue: number;
};

/**
 * Units as bars and revenue as a line on their own axis: two real series of the
 * same period, which is exactly what the reference shows.
 */
export function ProductEvolution({
  data,
  height = 250,
}: {
  data: ProductDailyPoint[];
  height?: number;
}) {
  const hasValues = data.some((point) => point.unitsSold > 0 || point.revenue > 0);

  return (
    <div className="px-5 pb-5">
      <div style={{ height }} className="relative w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: 0 }}>
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
              yAxisId="units"
              tickLine={false}
              axisLine={false}
              width={40}
              tickCount={5}
              allowDecimals={false}
              domain={hasValues ? undefined : [0, 200]}
              tick={{ fill: overviewColor.muted, fontSize: 12 }}
            />
            <YAxis
              yAxisId="revenue"
              orientation="right"
              tickLine={false}
              axisLine={false}
              width={54}
              tickCount={5}
              tickFormatter={(value) =>
                `$ ${new Intl.NumberFormat("es-AR", {
                  notation: "compact",
                  maximumFractionDigits: 1,
                }).format(Number(value))}`
              }
              tick={{ fill: overviewColor.muted, fontSize: 12 }}
            />
            {hasValues ? (
              <Tooltip
                cursor={{ fill: "rgba(15,23,42,0.045)" }}
                content={({ active, payload }) => {
                  const point = payload?.[0]?.payload as ProductDailyPoint | undefined;

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
                            style={{ backgroundColor: overviewColor.seriesTertiary }}
                          />
                          Unidades
                        </span>
                        <span className="font-semibold tabular-nums text-text-primary">
                          {formatDashboardNumber(point.unitsSold)}
                        </span>
                      </p>
                      <p className="mt-1 flex items-center justify-between gap-6 text-[13px]">
                        <span className="flex items-center gap-2 text-text-secondary">
                          <span
                            aria-hidden
                            className="h-[7px] w-[7px] rounded-full"
                            style={{ backgroundColor: overviewColor.action }}
                          />
                          Facturación
                        </span>
                        <span className="font-semibold tabular-nums text-text-primary">
                          {formatDashboardPrice(point.revenue)}
                        </span>
                      </p>
                    </div>
                  );
                }}
              />
            ) : null}
            <Bar
              yAxisId="units"
              dataKey="unitsSold"
              fill={overviewColor.seriesTertiary}
              fillOpacity={0.55}
              radius={[2, 2, 0, 0]}
              maxBarSize={20}
              animationDuration={600}
            />
            <Line
              yAxisId="revenue"
              type="monotone"
              dataKey="revenue"
              stroke={overviewColor.action}
              strokeWidth={2}
              dot={{ r: 2.5, fill: overviewColor.action, strokeWidth: 0 }}
              activeDot={{ r: 4, fill: overviewColor.action, stroke: "var(--surface)", strokeWidth: 2 }}
              animationDuration={700}
            />
          </ComposedChart>
        </ResponsiveContainer>

        {!hasValues ? (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center pb-6 text-[12.5px] text-text-secondary">
            Sin ventas registradas en el período.
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function ProductEvolutionLegend() {
  return (
    <div className="flex shrink-0 items-center gap-4 text-[12px] text-text-secondary">
      <span className="flex items-center gap-2">
        <span
          aria-hidden
          className="h-[8px] w-[8px] rounded-full"
          style={{ backgroundColor: overviewColor.seriesTertiary }}
        />
        Unidades
      </span>
      <span className="flex items-center gap-2">
        <span
          aria-hidden
          className="h-[2px] w-[14px] rounded-full"
          style={{ backgroundColor: overviewColor.action }}
        />
        Facturación
      </span>
    </div>
  );
}

const SIZE = 176;
const STROKE = 26;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Categories are a real partition of the period's revenue, so they take the one
 * place on this page where a categorical scale is legitimate.
 */
const CATEGORY_SCALE = ["#4f52c9", "#2b87c4", "#0d8b9b", "#6f7bdc", "#8fa3e8", "#b9c4ef"];

export function CategoryDonut({
  slices,
  totalLabel,
}: {
  slices: { category: string; revenue: number; share: number }[];
  totalLabel: string;
}) {
  const total = slices.reduce((sum, slice) => sum + slice.revenue, 0);
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-6 px-5 pb-5 lg:flex-row lg:gap-7">
      <div className="relative shrink-0">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="-rotate-90" style={{ width: SIZE, height: SIZE }}>
          <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="var(--border)" strokeWidth={STROKE} />
          {total > 0
            ? slices.map((slice, index) => {
                if (slice.revenue <= 0) {
                  return null;
                }

                const length = (slice.revenue / total) * CIRCUMFERENCE;
                const dash = `${length} ${CIRCUMFERENCE - length}`;
                const thisOffset = -offset;
                offset += length;

                return (
                  <circle
                    key={slice.category}
                    cx={SIZE / 2}
                    cy={SIZE / 2}
                    r={RADIUS}
                    fill="none"
                    stroke={CATEGORY_SCALE[index % CATEGORY_SCALE.length]}
                    strokeWidth={STROKE}
                    strokeDasharray={dash}
                    strokeDashoffset={thisOffset}
                  />
                );
              })
            : null}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[1.4rem] font-semibold leading-none tabular-nums tracking-[-0.035em] text-text-primary">
            {totalLabel}
          </span>
          <span className="mt-1.5 text-[12px] text-text-secondary">Total</span>
        </div>
      </div>

      <ul className="w-full min-w-0 space-y-[11px]">
        {slices.length === 0 ? (
          <li className={overviewUi.note}>Sin facturación por categoría en el período.</li>
        ) : (
          slices.map((slice, index) => (
            <li key={slice.category} className="flex items-center gap-3">
              <span
                aria-hidden
                className="h-[9px] w-[9px] shrink-0 rounded-full"
                style={{ backgroundColor: CATEGORY_SCALE[index % CATEGORY_SCALE.length] }}
              />
              <span className="min-w-0 flex-1 truncate text-[13px] text-text-primary">
                {slice.category}
              </span>
              <span className="w-12 shrink-0 text-right text-[13px] font-semibold tabular-nums text-text-primary">
                {slice.share.toFixed(0)}%
              </span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
