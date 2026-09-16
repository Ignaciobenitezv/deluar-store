import type { CheckoutFunnelStage } from "@/features/admin/analytics/server/checkout-funnel-service";
import { checkoutColor } from "./checkout-ui";
import { formatDashboardNumber } from "../../lib/dashboard-formatters";

const ROW_HEIGHT = 46;
const ROW_GAP = 5;
/** A collapsed stage still needs a visible body, or the row reads as missing. */
const MIN_WIDTH = 7;

function widthFor(share: number) {
  return Math.max(Math.min(share, 100), MIN_WIDTH);
}

/**
 * The reference's stacked trapezoids. Each band narrows from the share it
 * inherits to the share it keeps, so the silhouette *is* the retention curve
 * rather than a decoration sitting next to it.
 */
export function CheckoutFunnel({ stages }: { stages: CheckoutFunnelStage[] }) {
  if (stages.length === 0) {
    return null;
  }

  const hasVolume = stages[0].count > 0;

  return (
    <div className="px-5 pb-5">
      <ul className="flex flex-col" style={{ gap: ROW_GAP }}>
        {stages.map((stage, index) => {
          const topWidth = widthFor(stage.share);
          const next = stages[index + 1];
          const bottomWidth = next ? widthFor(next.share) : Math.max(topWidth - 6, MIN_WIDTH);
          const color = checkoutColor.funnel[index] ?? checkoutColor.funnel.at(-1)!;

          return (
            <li key={stage.key} className="flex items-center gap-4">
              <div className="w-[136px] shrink-0">
                <p className="truncate text-[12.5px] leading-tight text-text-secondary">{stage.label}</p>
                <p className="mt-1 text-[15px] font-semibold leading-none tabular-nums text-text-primary">
                  {formatDashboardNumber(stage.count)}
                </p>
              </div>

              <svg
                aria-hidden
                viewBox={`0 0 100 ${ROW_HEIGHT}`}
                preserveAspectRatio="none"
                className="block min-w-0 flex-1"
                style={{ height: ROW_HEIGHT }}
              >
                <polygon
                  points={[
                    `${50 - topWidth / 2},0`,
                    `${50 + topWidth / 2},0`,
                    `${50 + bottomWidth / 2},${ROW_HEIGHT}`,
                    `${50 - bottomWidth / 2},${ROW_HEIGHT}`,
                  ].join(" ")}
                  fill={hasVolume && stage.count > 0 ? color : "#e2e8f0"}
                />
              </svg>

              <div className="flex w-[104px] shrink-0 items-center justify-end gap-2.5">
                <span className="text-[13px] font-medium tabular-nums text-text-primary">
                  {hasVolume ? `${stage.share.toFixed(0)}%` : "—"}
                </span>
                {index > 0 && stage.dropCount > 0 ? (
                  <span
                    className="inline-flex items-center gap-0.5 text-[12px] font-semibold tabular-nums"
                    style={{ color: checkoutColor.loss }}
                  >
                    <svg
                      viewBox="0 0 10 10"
                      aria-hidden
                      className="h-[10px] w-[10px]"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 1.8v6.4M2.2 5.4 5 8.2l2.8-2.8" />
                    </svg>
                    {stage.dropShare.toFixed(0)}%
                  </span>
                ) : (
                  <span aria-hidden className="w-[38px]" />
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * The conversion ring. Two real parts of one whole: what finished and what did
 * not. With no carts in the period the ring is an empty track, which is the
 * honest reading rather than a shape standing in for one.
 */
const SIZE = 158;
const STROKE = 21;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ConversionRing({
  completed,
  notCompleted,
  rate,
}: {
  completed: number;
  notCompleted: number;
  rate: number;
}) {
  const total = completed + notCompleted;
  const slices = [
    { key: "completed", label: "Compras completadas", value: completed, color: checkoutColor.primary },
    { key: "abandoned", label: "Sin completar", value: notCompleted, color: checkoutColor.track },
  ];

  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-6 px-5 pb-5 lg:flex-row lg:gap-7">
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
            stroke="var(--border)"
            strokeWidth={STROKE}
          />
          {total > 0
            ? slices.map((slice) => {
                if (slice.value <= 0) {
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
              })
            : null}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[1.55rem] font-semibold leading-none tabular-nums tracking-[-0.035em] text-text-primary">
            {total > 0 ? `${rate.toFixed(0)}%` : "—"}
          </span>
          <span className="mt-1 text-[11.5px] text-text-secondary">tasa de finalización</span>
        </div>
      </div>

      <ul className="w-full min-w-0 space-y-3.5">
        {slices.map((slice) => {
          const share = total > 0 ? (slice.value / total) * 100 : 0;
          const empty = slice.value === 0;

          return (
            <li key={slice.key} className="flex items-center gap-3">
              <span
                aria-hidden
                className="h-[9px] w-[9px] shrink-0 rounded-full"
                style={{ backgroundColor: slice.color, opacity: empty ? 0.4 : 1 }}
              />
              <span
                className={`min-w-0 flex-1 truncate text-[13px] ${empty ? "text-text-secondary" : "text-text-primary"}`}
              >
                {slice.label}
              </span>
              <span
                className={`shrink-0 text-right text-[13.5px] font-semibold tabular-nums ${empty ? "text-text-secondary" : "text-text-primary"}`}
              >
                {formatDashboardNumber(slice.value)}
              </span>
              <span className="w-11 shrink-0 text-right text-[12px] tabular-nums text-text-secondary">
                {total > 0 ? `${share.toFixed(0)}%` : "—"}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
