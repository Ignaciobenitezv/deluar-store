import type { CheckoutShareRow } from "@/features/admin/analytics/server/checkout-funnel-service";
import { overviewCategorical, overviewUi } from "../overview/overview-ui";
import { checkoutColor } from "./checkout-ui";
import { formatDashboardNumber } from "../../lib/dashboard-formatters";
import { cn } from "@/lib/utils";

/**
 * The drop-off list. Its bars are the only place on the page where coral is
 * spent, because loss is the only thing they measure.
 */
export function DropOffBars({
  rows,
  emptyMessage,
  labelWidth = 152,
}: {
  rows: CheckoutShareRow[];
  emptyMessage: string;
  labelWidth?: number;
}) {
  if (rows.length === 0 || rows.every((row) => row.value === 0)) {
    return <p className={cn(overviewUi.note, "px-5 pb-5")}>{emptyMessage}</p>;
  }

  return (
    <ul className="px-5 pb-5">
      {rows.map((row) => (
        <li key={row.key} className="flex items-center gap-3 py-[7px]">
          <span
            className="shrink-0 truncate text-[12.5px] text-text-primary"
            style={{ width: labelWidth }}
          >
            {row.label}
          </span>
          {/* The bar is the percentage lost, so length and number agree. */}
          <span
            aria-hidden
            className="block h-[16px] min-w-0 flex-1 overflow-hidden rounded-[3px]"
            style={{ backgroundColor: checkoutColor.lossTrack }}
          >
            <span
              className="block h-full rounded-[3px]"
              style={{
                width: `${Math.min(Math.max(row.share, row.share > 0 ? 3 : 0), 100)}%`,
                backgroundColor: checkoutColor.loss,
              }}
            />
          </span>
          <span className="w-10 shrink-0 text-right text-[12.5px] font-medium tabular-nums text-text-primary">
            {formatDashboardNumber(row.value)}
          </span>
          <span className="w-9 shrink-0 text-right text-[12.5px] tabular-nums text-text-secondary">
            {row.share.toFixed(0)}%
          </span>
        </li>
      ))}
    </ul>
  );
}

/** The ticket distribution beside the average: same bar grammar, blue. */
export function ShareBars({
  rows,
  emptyMessage,
  labelWidth = 128,
}: {
  rows: CheckoutShareRow[];
  emptyMessage: string;
  labelWidth?: number;
}) {
  if (rows.length === 0) {
    return <p className={cn(overviewUi.note, "px-5 pb-5")}>{emptyMessage}</p>;
  }

  return (
    <ul>
      {rows.map((row) => (
        <li key={row.key} className="flex items-center gap-2.5 py-[7px]">
          <span
            className="shrink-0 truncate text-[12px] text-text-secondary"
            style={{ width: labelWidth }}
          >
            {row.label}
          </span>
          <span
            aria-hidden
            className="block h-[14px] min-w-0 flex-1 overflow-hidden rounded-[3px]"
            style={{ backgroundColor: checkoutColor.track }}
          >
            <span
              className="block h-full rounded-[3px]"
              style={{
                width: `${Math.min(Math.max(row.share, row.share > 0 ? 3 : 0), 100)}%`,
                backgroundColor: checkoutColor.primary,
              }}
            />
          </span>
          <span className="w-9 shrink-0 text-right text-[12px] tabular-nums text-text-secondary">
            {row.share.toFixed(0)}%
          </span>
        </li>
      ))}
    </ul>
  );
}

const RING_SIZE = 146;
const RING_STROKE = 20;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/**
 * One ring per categorical dimension. Slices take the shared categorical family
 * so a method keeps the same hue in the ring and in the legend beside it.
 */
export function MethodDonut({
  rows,
  centerValue,
  centerLabel,
  emptyMessage,
}: {
  rows: CheckoutShareRow[];
  centerValue: string;
  centerLabel: string;
  emptyMessage: string;
}) {
  const total = rows.reduce((sum, row) => sum + row.value, 0);

  if (total === 0) {
    return <p className={cn(overviewUi.note, "px-5 pb-5")}>{emptyMessage}</p>;
  }

  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-5 px-5 pb-5 sm:flex-row sm:gap-6">
      <div className="relative shrink-0">
        <svg
          viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
          className="-rotate-90"
          style={{ width: RING_SIZE, height: RING_SIZE }}
        >
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            fill="none"
            stroke="var(--border)"
            strokeWidth={RING_STROKE}
          />
          {rows.map((row, index) => {
            if (row.value <= 0) {
              return null;
            }

            const length = (row.value / total) * RING_CIRCUMFERENCE;
            const thisOffset = -offset;
            offset += length;

            return (
              <circle
                key={row.key}
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                fill="none"
                stroke={overviewCategorical[index % overviewCategorical.length]}
                strokeWidth={RING_STROKE}
                strokeDasharray={`${length} ${RING_CIRCUMFERENCE - length}`}
                strokeDashoffset={thisOffset}
              />
            );
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <span
            className={cn(
              "font-semibold leading-none tabular-nums tracking-[-0.035em] text-text-primary",
              centerValue.length > 6 ? "text-[1.1rem]" : "text-[1.45rem]",
            )}
          >
            {centerValue}
          </span>
          <span className="mt-1 text-[11px] text-text-secondary">{centerLabel}</span>
        </div>
      </div>

      <ul className="w-full min-w-0 space-y-3">
        {rows.map((row, index) => (
          <li key={row.key} className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="h-[9px] w-[9px] shrink-0 rounded-full"
              style={{ backgroundColor: overviewCategorical[index % overviewCategorical.length] }}
            />
            <span className="min-w-0 flex-1 truncate text-[12.5px] text-text-primary">{row.label}</span>
            <span className="w-9 shrink-0 text-right text-[12.5px] tabular-nums text-text-secondary">
              {row.share.toFixed(0)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
