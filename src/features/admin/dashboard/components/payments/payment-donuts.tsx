import type {
  PaymentMethodRow,
  PaymentStatusRow,
} from "@/features/admin/analytics/server/payments-analytics-service";
import { overviewCategorical, overviewUi } from "../overview/overview-ui";
import { toneForStatus } from "./payments-ui";
import { formatDashboardNumber } from "../../lib/dashboard-formatters";
import { cn } from "@/lib/utils";

const SIZE = 168;
const STROKE = 22;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function Ring({
  slices,
  centerValue,
  centerLabel,
}: {
  slices: { key: string; color: string; value: number }[];
  centerValue: string;
  centerLabel: string;
}) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  let offset = 0;

  return (
    <div className="relative shrink-0">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="-rotate-90"
        style={{ width: SIZE, height: SIZE }}
      >
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="#eef2f7"
          strokeWidth={STROKE}
        />
        {slices.map((slice) => {
          if (slice.value <= 0 || total <= 0) {
            return null;
          }

          const length = (slice.value / total) * CIRCUMFERENCE;
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
              strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
              strokeDashoffset={thisOffset}
            />
          );
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-7 text-center">
        <span
          className={cn(
            "font-semibold leading-none tabular-nums tracking-[-0.035em] text-slate-900",
            centerValue.length > 9
              ? "text-[1rem]"
              : centerValue.length > 6
                ? "text-[1.2rem]"
                : "text-[1.55rem]",
          )}
        >
          {centerValue}
        </span>
        <span className="mt-1 text-[11.5px] text-slate-500">{centerLabel}</span>
      </div>
    </div>
  );
}

/**
 * The status ring. A payment *is* its state, so each arc takes the tone that
 * state means — green approved, amber pending, coral failed, violet refunded —
 * and the legend beside it repeats exactly the same colour.
 */
export function PaymentStatusDonut({
  rows,
  total,
  emptyMessage,
}: {
  rows: PaymentStatusRow[];
  total: number;
  emptyMessage: string;
}) {
  if (rows.length === 0 || total === 0) {
    return <p className={cn(overviewUi.note, "px-5 pb-5")}>{emptyMessage}</p>;
  }

  return (
    <div className="flex flex-col items-center gap-6 px-5 pb-5 lg:flex-row lg:gap-7">
      <Ring
        slices={rows.map((row) => ({
          key: row.status,
          color: toneForStatus(row.status).color,
          value: row.count,
        }))}
        centerValue={formatDashboardNumber(total)}
        centerLabel={total === 1 ? "pago" : "pagos"}
      />

      <ul className="w-full min-w-0 space-y-3.5">
        {rows.map((row) => (
          <li key={row.status} className="flex items-center gap-3">
            <span
              aria-hidden
              className="h-[9px] w-[9px] shrink-0 rounded-full"
              style={{ backgroundColor: toneForStatus(row.status).color }}
            />
            <span className="min-w-0 flex-1 truncate text-[13px] text-slate-700">{row.label}</span>
            <span className="shrink-0 text-right text-[13.5px] font-semibold tabular-nums text-slate-900">
              {formatDashboardNumber(row.count)}
            </span>
            <span className="w-11 shrink-0 text-right text-[12px] tabular-nums text-slate-500">
              {row.share.toFixed(0)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The method ring reads money, not state, so it takes the shared categorical
 * family — one hue per method, matched in chroma so the row reads as a system.
 */
export function PaymentMethodDonut({
  rows,
  centerValue,
  emptyMessage,
}: {
  rows: PaymentMethodRow[];
  centerValue: string;
  emptyMessage: string;
}) {
  const total = rows.reduce((sum, row) => sum + row.revenue, 0);

  if (rows.length === 0 || total === 0) {
    return <p className={cn(overviewUi.note, "px-5 pb-5")}>{emptyMessage}</p>;
  }

  return (
    <div className="flex flex-col items-center gap-6 px-5 pb-5 lg:flex-row lg:gap-7">
      <Ring
        slices={rows.map((row, index) => ({
          key: row.method,
          color: overviewCategorical[index % overviewCategorical.length],
          value: row.revenue,
        }))}
        centerValue={centerValue}
        centerLabel="total cobrado"
      />

      <ul className="w-full min-w-0 space-y-3.5">
        {rows.map((row, index) => (
          <li key={row.method} className="flex items-center gap-3">
            <span
              aria-hidden
              className="h-[9px] w-[9px] shrink-0 rounded-full"
              style={{ backgroundColor: overviewCategorical[index % overviewCategorical.length] }}
            />
            <span className="min-w-0 flex-1 truncate text-[13px] text-slate-700">{row.label}</span>
            <span className="w-11 shrink-0 text-right text-[12.5px] font-medium tabular-nums text-slate-900">
              {row.share.toFixed(0)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
