"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  PaymentDailyPoint,
  PaymentWeekdayRow,
} from "@/features/admin/analytics/server/payments-analytics-service";
import { overviewColor } from "../overview/overview-ui";
import { paymentColor } from "./payments-ui";
import { formatDashboardNumber, formatDashboardPrice } from "../../lib/dashboard-formatters";

/** Compact money for an axis tick, where the full figure would not fit. */
function compactMoney(value: number) {
  if (value === 0) {
    return "$ 0";
  }

  return `$ ${new Intl.NumberFormat("es-AR", {
    notation: "compact",
    maximumFractionDigits: 0,
  }).format(value)}`;
}

export function PaymentEvolutionLegend() {
  return (
    <div className="flex shrink-0 items-center gap-4 text-[12px] text-text-secondary">
      <span className="flex items-center gap-2">
        <span
          aria-hidden
          className="h-[8px] w-[8px] rounded-full"
          style={{ backgroundColor: paymentColor.primarySoft }}
        />
        Monto cobrado
      </span>
      <span className="flex items-center gap-2">
        <span
          aria-hidden
          className="h-[8px] w-[8px] rounded-full"
          style={{ backgroundColor: paymentColor.primary }}
        />
        Cantidad de pagos
      </span>
    </div>
  );
}

/**
 * The reference's pairing: bars carry the money on the left axis, the line
 * carries the count on the right. Two real series of the same payments, not a
 * second series invented to add a colour.
 */
export function PaymentEvolution({
  data,
  height = 250,
}: {
  data: PaymentDailyPoint[];
  height?: number;
}) {
  const hasValues = data.some((point) => point.amount > 0 || point.payments > 0);

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
              yAxisId="amount"
              tickLine={false}
              axisLine={false}
              width={62}
              tickCount={5}
              tickFormatter={compactMoney}
              domain={hasValues ? undefined : [0, 100000]}
              tick={{ fill: overviewColor.muted, fontSize: 12 }}
            />
            <YAxis
              yAxisId="count"
              orientation="right"
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
                cursor={{ fill: "rgba(15,23,42,0.045)" }}
                content={({ active, payload }) => {
                  const point = payload?.[0]?.payload as PaymentDailyPoint | undefined;

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
                            style={{ backgroundColor: paymentColor.primarySoft }}
                          />
                          Cobrado
                        </span>
                        <span className="font-semibold tabular-nums text-text-primary">
                          {formatDashboardPrice(point.amount)}
                        </span>
                      </p>
                      <p className="mt-1 flex items-center justify-between gap-6 text-[13px]">
                        <span className="flex items-center gap-2 text-text-secondary">
                          <span
                            aria-hidden
                            className="h-[7px] w-[7px] rounded-full"
                            style={{ backgroundColor: paymentColor.primary }}
                          />
                          Pagos
                        </span>
                        <span className="font-semibold tabular-nums text-text-primary">
                          {formatDashboardNumber(point.payments)}
                        </span>
                      </p>
                    </div>
                  );
                }}
              />
            ) : null}
            <Bar
              yAxisId="amount"
              dataKey="amount"
              fill={paymentColor.primarySoft}
              radius={[2, 2, 0, 0]}
              maxBarSize={22}
              animationDuration={600}
            />
            <Line
              yAxisId="count"
              type="monotone"
              dataKey="payments"
              stroke={paymentColor.primary}
              strokeWidth={1.9}
              dot={data.length <= 31 ? { r: 2.4, strokeWidth: 0, fill: paymentColor.primary } : false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              animationDuration={600}
            />
          </ComposedChart>
        </ResponsiveContainer>

        {!hasValues ? (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center pb-6 text-[12.5px] text-text-secondary">
            Sin pagos registrados en el período.
          </p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Seven bars, one per weekday of the store's own clock. The busiest day carries
 * full colour and the rest a tint of the same hue, so the peak reads at a
 * glance without a second colour entering the page.
 */
export function PaymentWeekdayChart({
  data,
  height = 220,
}: {
  data: PaymentWeekdayRow[];
  height?: number;
}) {
  const max = Math.max(...data.map((row) => row.payments), 0);

  return (
    <div className="px-5 pb-5">
      <div style={{ height }} className="relative w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 24, right: 6, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              tickMargin={12}
              tick={{ fill: overviewColor.muted, fontSize: 12 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={34}
              tickCount={5}
              allowDecimals={false}
              domain={max > 0 ? undefined : [0, 4]}
              tick={{ fill: overviewColor.muted, fontSize: 12 }}
            />
            {max > 0 ? (
              <Tooltip
                cursor={{ fill: "rgba(15,23,42,0.045)" }}
                content={({ active, payload }) => {
                  const row = payload?.[0]?.payload as PaymentWeekdayRow | undefined;

                  if (!active || !row) {
                    return null;
                  }

                  return (
                    <div className="rounded-[6px] border border-border bg-surface px-3.5 py-2.5 shadow-[var(--admin-shadow-md)]">
                      <p className="text-[12px] text-text-secondary">{row.label}</p>
                      <p className="mt-1.5 text-[14px] font-semibold tabular-nums text-text-primary">
                        {formatDashboardNumber(row.payments)}{" "}
                        <span className="text-[12px] font-normal text-text-secondary">
                          {row.payments === 1 ? "pago" : "pagos"}
                        </span>
                      </p>
                    </div>
                  );
                }}
              />
            ) : null}
            <Bar dataKey="payments" radius={[3, 3, 0, 0]} maxBarSize={56} animationDuration={600}>
              {data.map((row) => (
                <Cell
                  key={row.key}
                  fill={
                    row.payments === 0
                      ? overviewColor.inactive
                      : row.payments === max
                        ? paymentColor.primary
                        : paymentColor.primarySoft
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {max === 0 ? (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center pb-6 text-[12.5px] text-text-secondary">
            Sin pagos registrados en el período.
          </p>
        ) : null}
      </div>
    </div>
  );
}
