import type { DashboardDelta } from "../../server/dashboard-service";
import { ledgerColor, ledgerUi } from "./ledger-ui";
import { cn } from "@/lib/utils";

export type MetricBandItem = {
  label: string;
  value: string;
  /** Shown in place of the delta when comparison is switched off. */
  description: string;
  delta: DashboardDelta;
  previousFormatted: string;
  /** The metric's real daily series, one entry per day of the period. */
  series?: number[];
  /** For "días con venta": one discrete mark per day, true where it sold. */
  marks?: boolean[];
};

function DeltaArrow({ direction }: { direction: "up" | "down" }) {
  return (
    <svg
      viewBox="0 0 10 10"
      aria-hidden
      className="h-[10px] w-[10px] shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {direction === "up" ? (
        <path d="M5 8.2V1.8M2.2 4.6 5 1.8l2.8 2.8" />
      ) : (
        <path d="M5 1.8v6.4M2.2 5.4 5 8.2l2.8-2.8" />
      )}
    </svg>
  );
}

function formatChange(changePercent: number) {
  return `${new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 1,
  }).format(Math.abs(changePercent))}%`;
}

/**
 * The reading, never a manufactured number: a delta only renders as a
 * percentage when the previous window is real and non-zero.
 */
export function DeltaReading({
  delta,
  previousFormatted,
  comparisonAvailable,
}: {
  delta: DashboardDelta;
  previousFormatted: string;
  comparisonAvailable: boolean;
}) {
  if (delta.direction === "unmeasurable") {
    return (
      <p className="text-[12.5px] leading-[1.35] text-text-secondary">
        {comparisonAvailable ? "Sin base en el período anterior" : "Sin período comparable"}
      </p>
    );
  }

  if (delta.direction === "flat" || delta.changePercent === null) {
    return (
      <p className="text-[12.5px] leading-[1.35] text-text-secondary">
        Sin cambios · antes <span className="tabular-nums">{previousFormatted}</span>
      </p>
    );
  }

  const rising = delta.direction === "up";

  return (
    <p className="flex flex-wrap items-center gap-x-1.5 text-[12.5px] leading-[1.35] text-text-secondary">
      <span
        className="inline-flex items-center gap-1 font-semibold tabular-nums"
        style={{ color: rising ? ledgerColor.positive : ledgerColor.negative }}
      >
        <DeltaArrow direction={rising ? "up" : "down"} />
        {formatChange(delta.changePercent)}
      </span>
      <span aria-hidden className="text-text-secondary">
        ·
      </span>
      <span>
        antes <span className="tabular-nums">{previousFormatted}</span>
      </span>
    </p>
  );
}

const BAR_HEIGHT = 32;

/**
 * The period's daily series as discrete bars, one per day, baseline aligned and
 * spread across the column. Days with no activity keep their slot at a low stub
 * so the temporal sequence stays complete instead of collapsing to one spike.
 */
function MiniBars({ series }: { series: number[] }) {
  const max = Math.max(...series, 0);

  return (
    <div
      aria-hidden
      className={cn(
        "flex w-full items-end",
        series.length > 45 ? "gap-px" : "gap-[2px]",
      )}
      style={{ height: BAR_HEIGHT }}
    >
      {series.map((value, index) => {
        const empty = value <= 0;
        const height = empty
          ? 2
          : Math.max(Math.round((value / max) * BAR_HEIGHT), 3);

        return (
          <span
            key={index}
            className="min-w-0 flex-1 rounded-t-[1px]"
            style={{
              height,
              backgroundColor: ledgerColor.series,
              opacity: empty ? 0.16 : 1,
            }}
          />
        );
      })}
    </div>
  );
}

/**
 * "Días con venta" has no magnitude to plot, so its days stay discrete: a full
 * mark where the store sold, a quiet stub where it did not. The count of tall
 * marks against the row is the reading.
 */
function MiniMarks({ marks }: { marks: boolean[] }) {
  return (
    <div
      aria-hidden
      className={cn(
        "flex w-full items-end",
        marks.length > 45 ? "gap-px" : "gap-[2px]",
      )}
      style={{ height: BAR_HEIGHT }}
    >
      {marks.map((sold, index) => (
        <span
          key={index}
          className="min-w-0 flex-1 rounded-t-[1px]"
          style={{
            height: sold ? BAR_HEIGHT : 4,
            backgroundColor: sold ? ledgerColor.series : ledgerColor.inactive,
          }}
        />
      ))}
    </div>
  );
}

/**
 * One strip, five columns, one surface. Each column carries its own real daily
 * series under the reading: label, value, comparison, then the period drawn as
 * discrete bars.
 */
export function MetricBand({
  items,
  compareEnabled,
  comparisonAvailable,
}: {
  items: MetricBandItem[];
  compareEnabled: boolean;
  comparisonAvailable: boolean;
}) {
  return (
    // The container's own colour shows through the 1px gaps, so every cell is
    // divided by a hairline at any breakpoint without boxing any of them.
    <div className="grid grid-cols-2 gap-px bg-surface-elevated md:grid-cols-3 xl:grid-cols-5">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex min-w-0 flex-col justify-between gap-5 bg-surface px-6 pb-5 pt-5"
        >
          <div className="min-w-0">
            <p className="text-[14.5px] font-medium leading-none text-text-primary">
              {item.label}
            </p>
            <p className={cn("mt-3 text-[1.9rem] font-semibold leading-none", ledgerUi.figure)}>
              {item.value}
            </p>
            <div className="mt-2.5">
              {compareEnabled ? (
                <DeltaReading
                  delta={item.delta}
                  previousFormatted={item.previousFormatted}
                  comparisonAvailable={comparisonAvailable}
                />
              ) : (
                <p className="text-[12.5px] leading-[1.35] text-text-secondary">
                  {item.description}
                </p>
              )}
            </div>
          </div>

          {item.marks ? (
            <MiniMarks marks={item.marks} />
          ) : item.series ? (
            <MiniBars series={item.series} />
          ) : null}
        </div>
      ))}
      {/* Keeps the grid's gap colour from showing as a block in the empty
          trailing slot below xl, where five cells do not fill the row. */}
      <div className="bg-surface xl:hidden" aria-hidden />
    </div>
  );
}
