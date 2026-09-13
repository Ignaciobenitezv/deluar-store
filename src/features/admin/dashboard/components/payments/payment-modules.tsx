import type { PaymentDelta } from "@/features/admin/analytics/server/payments-analytics-service";
import { overviewColor, overviewUi } from "../overview/overview-ui";
import { paymentColor } from "./payments-ui";
import { cn } from "@/lib/utils";

const ICON = {
  viewBox: "0 0 22 22",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function IconCollected() {
  return (
    <svg {...ICON} className="h-[18px] w-[18px]">
      <circle cx="11" cy="11" r="8.2" />
      <path d="M11 6.2v9.6M8.7 8.6c0-1 1-1.6 2.3-1.6s2.3.7 2.3 1.7c0 2.5-4.6 2-4.6 4.8 0 1.4 1.4 1.9 2.8 1.9s2.3-.6 2.3-1.9" />
    </svg>
  );
}

export function IconPayments() {
  return (
    <svg {...ICON} className="h-[18px] w-[18px]">
      <rect x="2.4" y="4.8" width="17.2" height="12.4" rx="2.2" />
      <path d="M2.4 9.2h17.2M6 13.8h3.2" />
    </svg>
  );
}

export function IconApproved() {
  return (
    <svg {...ICON} className="h-[18px] w-[18px]">
      <circle cx="11" cy="11" r="8.2" />
      <path d="M7.4 11.2 10 13.8l4.6-5" />
    </svg>
  );
}

export function IconFailed() {
  return (
    <svg {...ICON} className="h-[18px] w-[18px]">
      <circle cx="11" cy="11" r="8.2" />
      <path d="M8.4 8.4l5.2 5.2M13.6 8.4l-5.2 5.2" />
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
      strokeWidth="1.8"
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

/**
 * The delta chip. With no previous window to measure against it says so in
 * plain words instead of printing a percentage that would stand for nothing.
 */
export function DeltaChip({
  delta,
  invert = false,
}: {
  delta: PaymentDelta;
  /** For metrics where a rise is bad, such as failed payments. */
  invert?: boolean;
}) {
  if (delta.direction === "unmeasurable") {
    return (
      <span className="inline-flex items-center gap-1 text-[12px] text-slate-400">
        <span aria-hidden className="text-slate-300">
          —
        </span>
        sin base previa
      </span>
    );
  }

  if (delta.direction === "flat") {
    return <span className="text-[12px] text-slate-500">Sin cambios</span>;
  }

  const rising = delta.direction === "up";
  const good = invert ? !rising : rising;

  return (
    <span
      className="inline-flex items-center gap-1 text-[12px] font-semibold tabular-nums"
      style={{ color: good ? paymentColor.positive : paymentColor.negative }}
    >
      <DeltaArrow direction={rising ? "up" : "down"} />
      {new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 }).format(delta.changePercent)}%
    </span>
  );
}

/**
 * The reference's KPI: icon tile, label, the figure beside the period's own
 * mark, the comparison below. The failure KPI takes the negative tone, because
 * that is what it measures — not to decorate the row with a fourth colour.
 */
export function PaymentKpi({
  label,
  value,
  icon,
  tone,
  series,
  delta,
  invertDelta = false,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: "primary" | "secondary" | "positive" | "negative";
  series: number[];
  delta: PaymentDelta;
  invertDelta?: boolean;
}) {
  const palette = {
    primary: { bar: paymentColor.primary, tile: paymentColor.tile, ink: paymentColor.primary },
    secondary: { bar: "#7dabf9", tile: paymentColor.tileSoft, ink: "#6f9bea" },
    positive: { bar: "#14804b", tile: "#e8f5ee", ink: "#0f6b3d" },
    negative: { bar: "#e2564d", tile: "#fbeceb", ink: "#c0392f" },
  }[tone];

  const max = Math.max(...series, 0);

  return (
    <article className={cn(overviewUi.module, "px-5 py-5")}>
      <span
        aria-hidden
        className="flex h-9 w-9 items-center justify-center rounded-[9px]"
        style={{ backgroundColor: palette.tile, color: palette.ink }}
      >
        {icon}
      </span>
      <p className="mt-3.5 truncate text-[13px] text-slate-600">{label}</p>

      <div className="mt-2 flex items-end justify-between gap-4">
        {/* A money figure runs far longer than a count, so the type steps down
            rather than colliding with the mark beside it. */}
        <p
          className={cn(
            "min-w-0 font-semibold leading-none tabular-nums tracking-[-0.035em] text-slate-900",
            value.length > 11 ? "text-[1.35rem]" : value.length > 8 ? "text-[1.55rem]" : "text-[1.8rem]",
          )}
        >
          {value}
        </p>
        {series.length > 0 ? (
          <div className="flex h-[36px] w-[34%] shrink-0 items-end gap-[2px]">
            {series.map((point, index) => (
              <span
                key={index}
                className="min-w-0 flex-1 rounded-t-[2px]"
                style={{
                  height: max > 0 && point > 0 ? Math.max((point / max) * 36, 3) : 2,
                  backgroundColor: max > 0 && point > 0 ? palette.bar : overviewColor.inactive,
                }}
              />
            ))}
          </div>
        ) : null}
      </div>

      <p className="mt-2.5 flex flex-wrap items-center gap-x-1.5 text-[12px] text-slate-500">
        <DeltaChip delta={delta} invert={invertDelta} />
        {delta.direction === "unmeasurable" ? null : <span>vs. período anterior</span>}
      </p>
    </article>
  );
}

export function PaymentModule({
  title,
  note,
  control,
  children,
  className,
}: {
  title: string;
  note?: string;
  control?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn(overviewUi.module, "flex min-w-0 flex-col overflow-hidden", className)}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-5 pb-4 pt-5">
        <div className="min-w-0">
          <h2 className={overviewUi.title}>{title}</h2>
          {note ? <p className={cn(overviewUi.note, "mt-1")}>{note}</p> : null}
        </div>
        {control}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </section>
  );
}

export function PaymentEmpty({ message }: { message: string }) {
  return <p className={cn(overviewUi.note, "px-5 pb-5")}>{message}</p>;
}
