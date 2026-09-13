import { customerColor } from "./customer-palette";
import { cn } from "@/lib/utils";

/** Same pair as the evolution chart, so the reader learns the colours once. */
const SEGMENT_COLOR = {
  nuevo: customerColor.primary,
  recurrente: customerColor.secondary,
} as const;

const SIZE = 158;
const STROKE = 21;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Two real halves of the same whole. When every buyer is new the ring is
 * legitimately whole in one colour: that is the reading, not a shortcoming.
 */
export function SegmentDonut({
  newValue,
  recurrentValue,
  centerValue,
  centerLabel,
  formatValue,
}: {
  newValue: number;
  recurrentValue: number;
  centerValue: string;
  centerLabel: string;
  formatValue: (value: number) => string;
}) {
  const total = newValue + recurrentValue;
  const slices = [
    { key: "nuevo", label: "Nuevos", value: newValue, color: SEGMENT_COLOR.nuevo },
    {
      key: "recurrente",
      label: "Recurrentes",
      value: recurrentValue,
      color: SEGMENT_COLOR.recurrente,
    },
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
            stroke={customerColor.track}
            strokeWidth={STROKE}
          />
          {total > 0
            ? slices.map((slice) => {
                if (slice.value <= 0) {
                  return null;
                }

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
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <span
            className={cn(
              "font-semibold leading-none tabular-nums tracking-[-0.035em] text-slate-900",
              centerValue.length > 9
                ? "text-[0.95rem]"
                : centerValue.length > 6
                  ? "text-[1.15rem]"
                  : "text-[1.55rem]",
            )}
          >
            {centerValue}
          </span>
          <span className="mt-1 text-[11.5px] text-slate-500">{centerLabel}</span>
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
                style={{ backgroundColor: slice.color, opacity: empty ? 0.35 : 1 }}
              />
              <span
                className={cn(
                  "min-w-0 flex-1 truncate text-[13px]",
                  empty ? "text-slate-400" : "text-slate-700",
                )}
              >
                {slice.label}
              </span>
              <span
                className={cn(
                  "shrink-0 text-right text-[13.5px] font-semibold tabular-nums",
                  empty ? "text-slate-400" : "text-slate-900",
                )}
              >
                {formatValue(slice.value)}
              </span>
              <span className="w-11 shrink-0 text-right text-[12px] tabular-nums text-slate-500">
                {total > 0 ? `${share.toFixed(0)}%` : "—"}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
