import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * The analytics palette: blue carries quantity, teal separates a second series,
 * and green / amber / red are reserved for what they mean. Deluar's warm
 * identity stays in the shell and never colours the data.
 */
export const overviewColor = {
  // ── Surfaces · three planes, so a module reads as an object ──────────
  canvas: "var(--background)",
  surface: "var(--surface)",
  surfaceSunken: "var(--admin-surface-elevated)",

  // ── Text ─────────────────────────────────────────────────────────────
  ink: "var(--admin-text-primary)",
  inkSecondary: "var(--admin-text-secondary)",
  muted: "var(--admin-text-secondary)",

  // ── Borders ──────────────────────────────────────────────────────────
  borderSubtle: "var(--border)",
  border: "var(--border)",
  borderStrong: "var(--admin-text-secondary)",

  // ── Action · one hue owns every interactive role ─────────────────────
  action: "#4f52c9",
  actionHover: "#4348b4",
  actionSoft: "#eef0fc",

  // ── Semantic · spent on state, never on decoration ───────────────────
  positive: "#14804b",
  positiveSoft: "#e8f5ee",
  warning: "#b45309",
  warningSoft: "#fdf3e3",
  negative: "#c0392f",
  negativeSoft: "#fbeceb",

  // ── Data ─────────────────────────────────────────────────────────────
  series: "#4f52c9",
  seriesSoft: "#a9abe6",
  seriesSecondary: "#0d8b9b",
  seriesTertiary: "#2b87c4",
  /** Days with no activity: present, but clearly inert. */
  inactive: "#e2e8f0",
} as const;

/**
 * The retention ramp. A funnel stage takes its colour from the share of
 * sessions it still holds — the same number printed beside it, so colour is a
 * second reading of a stated fact rather than the only one.
 */
export function retentionTone(share: number, hasBase = true) {
  if (!hasBase) {
    return overviewColor.borderStrong;
  }
  if (share >= 60) {
    return overviewColor.action;
  }
  if (share >= 25) {
    return overviewColor.seriesTertiary;
  }
  if (share >= 5) {
    return overviewColor.warning;
  }
  if (share > 0) {
    return overviewColor.negative;
  }
  return overviewColor.borderStrong;
}

/**
 * A categorical family, not six loose colours: one hue per category, matched in
 * chroma and lightness so a row of them reads as one system. Used where the
 * data really is categorical — one series per acquisition source, one mark per
 * KPI — never to decorate a container.
 */
export const overviewCategorical = [
  "#4f52c9",
  "#d4447f",
  "#0f9268",
  "#2b87c4",
  "#cf7c22",
  "#7b4bc4",
] as const;

export const overviewUi = {
  module: "rounded-2xl border border-border bg-surface",
  title: "text-[13px] font-semibold tracking-[-0.01em] text-text-primary",
  note: "text-[11.5px] leading-[1.45] text-text-secondary",
  label: "text-[10px] font-semibold uppercase tracking-[0.14em] text-text-secondary",
} as const;

/**
 * Sums a daily series into a handful of even blocks. The reference's KPI mark
 * shows about seven bars; ours would show every day of the period, so the days
 * are grouped rather than the mark being shrunk into hairlines.
 */
export function bucketSeries(series: number[], buckets = 7) {
  if (series.length <= buckets) {
    return [...series];
  }

  const size = Math.ceil(series.length / buckets);
  const grouped: number[] = [];

  for (let index = 0; index < series.length; index += size) {
    grouped.push(series.slice(index, index + size).reduce((sum, value) => sum + value, 0));
  }

  return grouped;
}

/**
 * The KPI mark: few, wide bars with the period's strongest block carrying full
 * colour and the rest a pale tint of the same hue.
 */
export function KpiBars({
  series,
  height = 62,
  color = overviewColor.series,
}: {
  series: number[];
  height?: number;
  color?: string;
}) {
  const max = Math.max(...series, 0);

  return (
    <div aria-hidden className="flex w-full items-end gap-[5px]" style={{ height }}>
      {series.map((value, index) => (
        <span
          key={index}
          className="min-w-0 flex-1 rounded-[3px]"
          style={{
            height: max > 0 ? Math.max(Math.round((value / max) * height), 7) : 7,
            backgroundColor: value > 0 ? color : overviewColor.inactive,
            opacity: max > 0 && value === max ? 1 : value > 0 ? 0.42 : 1,
          }}
        />
      ))}
    </div>
  );
}

/**
 * The reference's trend column: one continuous stroke per row, from the same
 * daily series the numbers beside it are built on.
 */
export function TrendLine({
  series,
  width = 120,
  height = 28,
  color = overviewColor.series,
}: {
  series: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  if (series.length < 2) {
    return <span aria-hidden className="block h-[1px] w-full bg-[#e3e8ef]" />;
  }

  const max = Math.max(...series, 0);
  const step = width / (series.length - 1);
  const points = series.map((value, index) => ({
    x: index * step,
    y: max > 0 ? height - (value / max) * (height - 4) - 2 : height / 2,
  }));

  // A midpoint-anchored quadratic through every sample: smooth like the
  // reference's wave, without inventing values between the days.
  let path = `M${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`;

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const midX = (previous.x + current.x) / 2;
    path += `Q${previous.x.toFixed(2)},${previous.y.toFixed(2)} ${midX.toFixed(2)},${((previous.y + current.y) / 2).toFixed(2)}`;
  }

  const last = points[points.length - 1];
  path += `T${last.x.toFixed(2)},${last.y.toFixed(2)}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden
      className="block w-full"
      style={{ height }}
    >
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

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

/** The reference's KPI card: the reading on the left, the period's mark on the right. */
export function OverviewKpi({
  label,
  value,
  series,
  delta,
  note,
  color = overviewColor.series,
}: {
  label: string;
  value: string;
  series: number[];
  /** This KPI's slot in the categorical family. */
  color?: string;
  delta?: { changePercent: number; rising: boolean; previousFormatted: string } | null;
  /** Shown when the metric has no comparable previous window. */
  note?: string;
}) {
  return (
    <article className={cn(overviewUi.module, "flex items-center gap-5 px-5 py-5")}>
      <div className="min-w-0 flex-1">
        <p className="text-[1.625rem] font-semibold leading-none tracking-[-0.02em] tabular-nums text-text-primary">
          {value}
        </p>
        <p className="mt-2 text-[12.5px] text-text-secondary">{label}</p>
        {delta ? (
          <p className="mt-3 flex flex-wrap items-center gap-x-1.5 text-[12px] text-text-secondary">
            <span className={cn("inline-flex items-center gap-1 font-semibold tabular-nums", delta.rising ? "text-success" : "text-danger")}>
              <DeltaArrow direction={delta.rising ? "up" : "down"} />
              {new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 }).format(
                Math.abs(delta.changePercent),
              )}
              %
            </span>
            <span>
              antes <span className="tabular-nums">{delta.previousFormatted}</span>
            </span>
          </p>
        ) : (
          <p className="mt-3 text-[12px] leading-[1.35] text-text-secondary">{note}</p>
        )}
      </div>

      {/* A metric with no daily series leaves the slot empty rather than
          drawing a mark that stands for nothing. */}
      {series.length > 0 ? (
        <div className="w-[40%] shrink-0">
          <KpiBars series={bucketSeries(series)} color={color} />
        </div>
      ) : null}
    </article>
  );
}

export function OverviewModule({
  title,
  note,
  action,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  note?: string;
  action?: { href: string; label: string };
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn(overviewUi.module, "flex min-w-0 flex-col overflow-hidden", className)}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1.5 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <h2 className={overviewUi.title}>{title}</h2>
          {note ? <p className={cn(overviewUi.note, "mt-0.5")}>{note}</p> : null}
        </div>
        {action ? (
          <Link href={action.href} className="shrink-0 text-[12px] font-medium text-primary underline-offset-[3px] hover:underline">
            {action.label} →
          </Link>
        ) : null}
      </div>
      <div className={cn("min-w-0 flex-1", bodyClassName)}>{children}</div>
    </section>
  );
}

export function OverviewEmpty({ message }: { message: string }) {
  return <p className={cn(overviewUi.note, "px-5 pb-6")}>{message}</p>;
}
