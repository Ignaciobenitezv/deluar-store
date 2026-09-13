import { ledgerStateStyle, ledgerUi } from "./ledger-ui";
import { formatDashboardNumber, formatDashboardPercent } from "../../lib/dashboard-formatters";
import { cn } from "@/lib/utils";

export type StatusSlice = {
  state: string;
  value: number;
};

export type StatusPalette = Record<string, { label: string; color: string }>;

/** One neutral scale for both analytics routes. */
const TONE = {
  cool: {
    track: "#eef2f7",
    rule: "#eef2f7",
    total: "#0f172a",
    caption: "#64748b",
    label: "#334155",
    labelEmpty: "#94a3b8",
    value: "#0f172a",
    valueEmpty: "#94a3b8",
    share: "#64748b",
  },
} as const;

const SIZE = 192;
const STROKE = 26;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * A true partition of the period's orders — every order sits in exactly one
 * slice, derived from the same state the ledger prints in its own rows. When a
 * single state holds everything the ring is simply whole; that is the reading,
 * not a shortcoming to dress up.
 */
export function OrderStatusDonut({
  slices,
  palette,
  tone = "cool",
}: {
  slices: StatusSlice[];
  /** Overrides the ledger's own state colours; /ventas keeps the default. */
  palette?: StatusPalette;
  tone?: keyof typeof TONE;
}) {
  const t = TONE[tone];
  const styleFor = (state: string) =>
    palette?.[state] ?? ledgerStateStyle[state] ?? ledgerStateStyle.created;

  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const present = slices.filter((slice) => slice.value > 0);

  let offset = 0;

  return (
    <div className="px-6 pb-6">
      <div className="flex justify-center py-2">
        <div className="relative">
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
              stroke={t.track}
              strokeWidth={STROKE}
            />
            {total > 0
              ? present.map((slice) => {
                  const style = styleFor(slice.state);
                  const length = (slice.value / total) * CIRCUMFERENCE;
                  const dash = `${length} ${CIRCUMFERENCE - length}`;
                  const thisOffset = -offset;
                  offset += length;

                  return (
                    <circle
                      key={slice.state}
                      cx={SIZE / 2}
                      cy={SIZE / 2}
                      r={RADIUS}
                      fill="none"
                      stroke={style.color}
                      strokeWidth={STROKE}
                      strokeDasharray={dash}
                      strokeDashoffset={thisOffset}
                    />
                  );
                })
              : null}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="text-[2.1rem] font-semibold leading-none tabular-nums tracking-[-0.035em]"
              style={{ color: t.total }}
            >
              {formatDashboardNumber(total)}
            </span>
            <span className="mt-1.5 text-[12.5px]" style={{ color: t.caption }}>
              {total === 1 ? "orden" : "órdenes"}
            </span>
          </div>
        </div>
      </div>

      <ul className="mt-5 border-t" style={{ borderColor: t.rule }}>
        {slices.map((slice) => {
          const style = styleFor(slice.state);
          const share = total > 0 ? (slice.value / total) * 100 : 0;
          const empty = slice.value === 0;

          return (
            <li
              key={slice.state}
              className="flex items-center gap-3 border-b py-[9px] last:border-b-0"
              style={{ borderColor: t.rule }}
            >
              <span
                aria-hidden
                className="h-[9px] w-[9px] shrink-0 rounded-full"
                style={{ backgroundColor: style.color, opacity: empty ? 0.35 : 1 }}
              />
              <span
                className="min-w-0 flex-1 truncate text-[13.5px]"
                style={{ color: empty ? t.labelEmpty : t.label }}
              >
                {style.label}
              </span>
              <span
                className="w-9 shrink-0 text-right text-[14px] font-semibold tabular-nums"
                style={{ color: empty ? t.valueEmpty : t.value }}
              >
                {formatDashboardNumber(slice.value)}
              </span>
              <span
                className="w-14 shrink-0 text-right text-[12.5px] tabular-nums"
                style={{ color: t.share }}
              >
                {total > 0 ? formatDashboardPercent(share) : "—"}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function OrderStatusEmpty() {
  return (
    <p className={cn(ledgerUi.note, "px-6 pb-6")}>
      No se creó ninguna orden en el período, así que no hay estados que repartir.
    </p>
  );
}
