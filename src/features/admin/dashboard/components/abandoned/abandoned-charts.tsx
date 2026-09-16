"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { overviewColor, overviewUi } from "../overview/overview-ui";
import { formatDashboardNumber, formatDashboardPrice } from "../../lib/dashboard-formatters";
import { cn } from "@/lib/utils";

export type AbandonedDailyPoint = {
  date: string;
  label: string;
  carts: number;
  checkouts: number;
  value: number;
};

type SeriesKey = "carts" | "checkouts" | "value";

const SERIES: Record<SeriesKey, { label: string; money: boolean }> = {
  carts: { label: "Carritos abandonados", money: false },
  checkouts: { label: "Checkouts abandonados", money: false },
  value: { label: "Valor abandonado", money: true },
};

/**
 * The evolution chart keeps its axes and its date scale whether or not the
 * period saw an abandonment: an empty plot still tells the reader what the
 * module measures and over which days.
 */
export function AbandonedEvolution({
  data,
  height = 230,
}: {
  data: AbandonedDailyPoint[];
  height?: number;
}) {
  const [seriesKey, setSeriesKey] = useState<SeriesKey>("carts");
  const config = SERIES[seriesKey];
  const hasValues = data.some((point) => point[seriesKey] > 0);

  return (
    <div className="px-5 pb-5">
      <div className="mb-3 flex justify-end">
        <label className="relative inline-flex items-center">
          <span className="sr-only">Serie del gráfico</span>
          <select
            value={seriesKey}
            onChange={(event) => setSeriesKey(event.target.value as SeriesKey)}
            className="cursor-pointer appearance-none rounded-[6px] border border-border bg-surface py-[6px] pl-3 pr-8 text-[12.5px] font-medium text-text-primary transition-colors hover:border-border"
          >
            {(Object.keys(SERIES) as SeriesKey[]).map((key) => (
              <option key={key} value={key}>
                {SERIES[key].label}
              </option>
            ))}
          </select>
          <svg
            viewBox="0 0 12 12"
            aria-hidden
            className="pointer-events-none absolute right-3 h-3 w-3 text-text-secondary"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 4.75 6 7.75l3-3" />
          </svg>
        </label>
      </div>

      <div style={{ height }} className="relative w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
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
              width={config.money ? 62 : 34}
              tickCount={5}
              allowDecimals={false}
              domain={hasValues ? undefined : [0, 20]}
              tickFormatter={(value) =>
                config.money
                  ? `$ ${new Intl.NumberFormat("es-AR", {
                      notation: "compact",
                      maximumFractionDigits: 1,
                    }).format(Number(value))}`
                  : formatDashboardNumber(Number(value))
              }
              tick={{ fill: overviewColor.muted, fontSize: 12 }}
            />
            {hasValues ? (
              <Tooltip
                cursor={{ fill: "rgba(15,23,42,0.045)" }}
                content={({ active, payload }) => {
                  const point = payload?.[0]?.payload as AbandonedDailyPoint | undefined;

                  if (!active || !point) {
                    return null;
                  }

                  return (
                    <div className="rounded-[6px] border border-border bg-surface px-3.5 py-2.5 shadow-[var(--admin-shadow-md)]">
                      <p className="text-[12px] text-text-secondary">{point.label}</p>
                      <p className="mt-1.5 text-[14px] font-semibold tabular-nums text-text-primary">
                        {config.money
                          ? formatDashboardPrice(point.value)
                          : formatDashboardNumber(point[seriesKey])}
                      </p>
                    </div>
                  );
                }}
              />
            ) : null}
            <Bar
              dataKey={seriesKey}
              fill={overviewColor.action}
              radius={[2, 2, 0, 0]}
              maxBarSize={18}
              animationDuration={600}
            />
          </BarChart>
        </ResponsiveContainer>

        {!hasValues ? (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center pb-6 text-[12.5px] text-text-secondary">
            Sin abandonos registrados en el período.
          </p>
        ) : null}
      </div>
    </div>
  );
}

const STAGE_COLOR = {
  cart: overviewColor.action,
  checkout: overviewColor.negative,
} as const;

const SIZE = 168;
const STROKE = 24;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Two stages, because two is what the schema records. With nothing abandoned
 * the ring still draws, in neutral, so the module keeps its shape.
 */
export function StageDonut({
  cartCount,
  checkoutCount,
}: {
  cartCount: number;
  checkoutCount: number;
}) {
  const total = cartCount + checkoutCount;
  const slices = [
    { key: "cart", label: "Carrito", value: cartCount, color: STAGE_COLOR.cart },
    { key: "checkout", label: "Checkout", value: checkoutCount, color: STAGE_COLOR.checkout },
  ];

  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-6 px-5 pb-5 lg:flex-row lg:gap-7">
      <div className="relative shrink-0">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="-rotate-90" style={{ width: SIZE, height: SIZE }}>
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="var(--border)"
            strokeWidth={STROKE}
          />
          {total > 0
            ? slices
                .filter((slice) => slice.value > 0)
                .map((slice) => {
                  const length = (slice.value / total) * CIRCUMFERENCE;
                  const dash = `${length} ${CIRCUMFERENCE - length}`;
                  const thisOffset = -offset;
                  offset += length;

                  return (
                    <circle
                      key={slice.key}
                      cx={SIZE / 2}
                      cy={SIZE / 2}
                      r={RADIUS}
                      fill="none"
                      stroke={slice.color}
                      strokeWidth={STROKE}
                      strokeDasharray={dash}
                      strokeDashoffset={thisOffset}
                    />
                  );
                })
            : null}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[1.8rem] font-semibold leading-none tabular-nums tracking-[-0.035em] text-text-primary">
            {formatDashboardNumber(total)}
          </span>
          <span className="mt-1.5 text-[12px] text-text-secondary">
            {total === 1 ? "carrito" : "carritos"}
          </span>
        </div>
      </div>

      <ul className="w-full min-w-0 space-y-3">
        {slices.map((slice) => {
          const share = total > 0 ? (slice.value / total) * 100 : 0;
          const empty = slice.value === 0;

          return (
            <li key={slice.key} className="flex items-center gap-3">
              <span
                aria-hidden
                className="h-[9px] w-[9px] shrink-0 rounded-full"
                style={{ backgroundColor: slice.color, opacity: empty ? 0.3 : 1 }}
              />
              <span
                className={cn(
                  "min-w-0 flex-1 truncate text-[13px]",
                  empty ? "text-text-secondary" : "text-text-primary",
                )}
              >
                {slice.label}
              </span>
              <span
                className={cn(
                  "w-8 shrink-0 text-right text-[13.5px] font-semibold tabular-nums",
                  empty ? "text-text-secondary" : "text-text-primary",
                )}
              >
                {formatDashboardNumber(slice.value)}
              </span>
              <span className="w-12 shrink-0 text-right text-[12px] tabular-nums text-text-secondary">
                {total > 0 ? `${share.toFixed(0)}%` : "—"}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
