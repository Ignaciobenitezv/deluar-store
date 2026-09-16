"use client";

import { useState } from "react";
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
import { useLedgerHighlight } from "./ledger-highlight";
import { ledgerColor, ledgerRadius, ledgerUi, splitCurrency } from "./ledger-ui";
import { formatDashboardNumber, formatDashboardPrice } from "../../lib/dashboard-formatters";
import { cn } from "@/lib/utils";

export type SeriesPoint = {
  date: string;
  label: string;
  longLabel: string;
  revenue: number;
  paidOrders: number;
  unitsSold: number;
};

type SeriesKey = "revenue" | "paidOrders" | "unitsSold";

/**
 * Each series owns its colour, and all three come from the analytics family:
 * indigo for money, teal for orders, sky for units. Green stays out of here —
 * on this page it means a paid order, not a quantity.
 */
const SERIES: Record<
  SeriesKey,
  { label: string; money: boolean; unit: string; color: string; empty: string }
> = {
  revenue: {
    label: "Facturación",
    money: true,
    unit: "",
    color: ledgerColor.series,
    empty: "Sin facturación registrada en el período.",
  },
  paidOrders: {
    label: "Pedidos pagados",
    money: false,
    unit: "pedidos",
    color: ledgerColor.seriesSecondary,
    empty: "Sin pedidos pagados en el período.",
  },
  unitsSold: {
    label: "Unidades",
    money: false,
    unit: "unidades",
    color: ledgerColor.seriesTertiary,
    empty: "Sin unidades vendidas en el período.",
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

function MoneyReading({ value }: { value: number }) {
  const { symbol, amount } = splitCurrency(formatDashboardPrice(value));

  return (
    <span className="inline-flex items-start gap-[0.16em] leading-none">
      <span className="mt-[0.22em] text-[11px] font-medium text-text-secondary">{symbol}</span>
      <span className="text-[15px] font-semibold tabular-nums tracking-[-0.025em] text-text-primary">
        {amount}
      </span>
    </span>
  );
}

function SeriesTooltip({ point, seriesKey }: { point: SeriesPoint; seriesKey: SeriesKey }) {
  const config = SERIES[seriesKey];
  const value = point[seriesKey];

  return (
    <div className="rounded-[6px] border border-border bg-surface px-4 py-3 shadow-[var(--admin-shadow-md)]">
      <p className="text-[12px] text-text-secondary">{point.longLabel}</p>
      <p className="mt-2 flex items-center gap-2.5">
        <span
          aria-hidden
          className="h-[8px] w-[8px] shrink-0 rounded-full"
          style={{ backgroundColor: config.color }}
        />
        {config.money ? (
          <MoneyReading value={value} />
        ) : (
          <span className="text-[15px] font-semibold tabular-nums tracking-[-0.025em] text-text-primary">
            {formatDashboardNumber(value)}{" "}
            <span className="text-[12px] font-normal text-text-secondary">{config.unit}</span>
          </span>
        )}
      </p>
    </div>
  );
}

function SeriesSelect({
  value,
  onChange,
}: {
  value: SeriesKey;
  onChange: (next: SeriesKey) => void;
}) {
  return (
    <label className="relative inline-flex shrink-0 items-center">
      <span className="sr-only">Serie del gráfico</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as SeriesKey)}
        className={cn(
          "cursor-pointer appearance-none border border-border bg-surface py-[7px] pl-3.5 pr-8 text-[13px] font-medium text-text-primary",
          ledgerRadius.control,
          "transition-colors hover:border-border",
        )}
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
  );
}

/**
 * The chart carries its own module chrome so the series selector can sit in the
 * header row beside the title instead of stealing a band of plot area.
 */
export function SeriesChartModule({
  title,
  note,
  data,
  defaultSeries = "revenue",
  height = 300,
  linkHighlight = false,
  className,
}: {
  title: string;
  note?: string;
  data: SeriesPoint[];
  defaultSeries?: SeriesKey;
  height?: number;
  /** Only the main chart drives the ledger's day highlight. */
  linkHighlight?: boolean;
  className?: string;
}) {
  const [seriesKey, setSeriesKey] = useState<SeriesKey>(defaultSeries);
  const { activeDate, setActiveDate } = useLedgerHighlight();
  const config = SERIES[seriesKey];

  const hasValues = data.some((point) => point[seriesKey] > 0);

  return (
    <section
      className={cn("min-w-0 overflow-hidden", ledgerRadius.module, ledgerUi.module, className)}
    >
      <div className={ledgerUi.moduleHead}>
        <div className="min-w-0">
          <h2 className={ledgerUi.moduleTitle}>{title}</h2>
          {note ? <p className={cn(ledgerUi.note, "mt-1")}>{note}</p> : null}
        </div>
        <SeriesSelect value={seriesKey} onChange={setSeriesKey} />
      </div>

      {hasValues ? (
        <div
          style={{ height }}
          className="w-full min-w-0 pb-4 pl-1 pr-4"
          onMouseLeave={() => (linkHighlight ? setActiveDate(null) : undefined)}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 8, right: 0, bottom: 0, left: 0 }}
              onMouseMove={(state) => {
                if (!linkHighlight) {
                  return;
                }
                const index =
                  typeof state?.activeTooltipIndex === "number"
                    ? state.activeTooltipIndex
                    : null;
                setActiveDate(index === null ? null : (data[index]?.date ?? null), "band");
              }}
            >
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={{ stroke: ledgerColor.ruleStrong }}
                interval="preserveStartEnd"
                minTickGap={36}
                tickMargin={12}
                tick={{ fill: ledgerColor.muted, fontSize: 12 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={config.money ? 64 : 40}
                tickCount={4}
                tickFormatter={(value) => formatAxis(Number(value), config.money)}
                tick={{ fill: ledgerColor.muted, fontSize: 12 }}
              />
              <Tooltip
                cursor={{ fill: "rgba(15,23,42,0.045)" }}
                content={({ active, payload }) => {
                  const point = payload?.[0]?.payload as SeriesPoint | undefined;

                  if (!active || !point) {
                    return null;
                  }

                  return <SeriesTooltip point={point} seriesKey={seriesKey} />;
                }}
              />
              <Bar
                dataKey={seriesKey}
                radius={[2, 2, 0, 0]}
                maxBarSize={30}
                fill={config.color}
                animationDuration={700}
              >
                {/* Pointing at a day dims the rest, so the bar and the ledger
                    rows below it read as the same selection. */}
                {data.map((point) => (
                  <Cell
                    key={point.date}
                    fillOpacity={
                      linkHighlight && activeDate !== null && activeDate !== point.date ? 0.25 : 1
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div style={{ height }} className="flex items-center justify-center px-6 pb-4">
          <p className={ledgerUi.note}>{config.empty}</p>
        </div>
      )}
    </section>
  );
}
