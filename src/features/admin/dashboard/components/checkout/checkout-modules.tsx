import type { CheckoutDelta } from "@/features/admin/analytics/server/checkout-funnel-service";
import { overviewColor, overviewUi } from "../overview/overview-ui";
import { checkoutColor } from "./checkout-ui";
import { cn } from "@/lib/utils";

const ICON = {
  viewBox: "0 0 22 22",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function IconCart() {
  return (
    <svg {...ICON} className="h-[18px] w-[18px]">
      <path d="M2.6 3h2.1l1.9 9.3h8.9l1.7-6.6H6.2" />
      <circle cx="8.4" cy="17.6" r="1.4" />
      <circle cx="15.6" cy="17.6" r="1.4" />
    </svg>
  );
}

export function IconCheckout() {
  return (
    <svg {...ICON} className="h-[18px] w-[18px]">
      <rect x="3.2" y="2.8" width="15.6" height="16.4" rx="2.2" />
      <path d="M7 7.6h8M7 11h8M7 14.4h4.6" />
    </svg>
  );
}

export function IconPayment() {
  return (
    <svg {...ICON} className="h-[18px] w-[18px]">
      <rect x="2.4" y="4.8" width="17.2" height="12.4" rx="2.2" />
      <path d="M2.4 9.2h17.2M6 13.8h3.2" />
    </svg>
  );
}

export function IconPurchase() {
  return (
    <svg {...ICON} className="h-[18px] w-[18px]">
      <circle cx="11" cy="11" r="8.2" />
      <path d="M7.4 11.2 10 13.8l4.6-5" />
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
  delta: CheckoutDelta;
  /** For metrics where a rise is bad, such as a drop-off. */
  invert?: boolean;
}) {
  if (delta.direction === "unmeasurable") {
    return (
      <span className="inline-flex items-center gap-1 text-[12px] text-text-secondary">
        <span aria-hidden className="text-text-secondary">
          —
        </span>
        sin base previa
      </span>
    );
  }

  if (delta.direction === "flat") {
    return <span className="text-[12px] text-text-secondary">Sin cambios</span>;
  }

  const rising = delta.direction === "up";
  const good = invert ? !rising : rising;

  return (
    <span
      className="inline-flex items-center gap-1 text-[12px] font-semibold tabular-nums"
      style={{ color: good ? checkoutColor.positive : checkoutColor.loss }}
    >
      <DeltaArrow direction={rising ? "up" : "down"} />
      {new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 }).format(delta.changePercent)}%
    </span>
  );
}

/**
 * The reference's KPI: icon tile, label, the figure, the comparison beside the
 * period's own daily mark. A metric with a flat series draws inert bars rather
 * than a shape that suggests movement it does not have.
 */
export function CheckoutKpi({
  label,
  value,
  icon,
  tone,
  series,
  delta,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: "primary" | "secondary";
  series: number[];
  delta: CheckoutDelta;
}) {
  const bar = tone === "primary" ? checkoutColor.primary : "#7dabf9";
  const tile = tone === "primary" ? checkoutColor.tile : checkoutColor.tileSoft;
  const ink = tone === "primary" ? checkoutColor.primary : "#7dabf9";
  const max = Math.max(...series, 0);

  return (
    <article className={cn(overviewUi.module, "px-5 py-5")}>
      <span
        aria-hidden
        className="flex h-9 w-9 items-center justify-center rounded-[9px]"
        style={{ backgroundColor: tile, color: ink }}
      >
        {icon}
      </span>
      <p className="mt-3.5 truncate text-[13px] text-text-secondary">{label}</p>

      <div className="mt-2 flex items-end justify-between gap-4">
        <p className="min-w-0 text-[1.8rem] font-semibold leading-none tabular-nums tracking-[-0.035em] text-text-primary">
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
                  backgroundColor: max > 0 && point > 0 ? bar : overviewColor.inactive,
                }}
              />
            ))}
          </div>
        ) : null}
      </div>

      <p className="mt-2.5 flex flex-wrap items-center gap-x-1.5 text-[12px] text-text-secondary">
        <DeltaChip delta={delta} />
        {delta.direction === "unmeasurable" ? null : <span>vs. período anterior</span>}
      </p>
    </article>
  );
}

export function CheckoutModule({
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

export function CheckoutEmpty({ message }: { message: string }) {
  return <p className={cn(overviewUi.note, "px-5 pb-5")}>{message}</p>;
}

/**
 * The reference's info strip under the conversion ring. It restates the ring in
 * a sentence built from the same numbers — never a recommendation the data
 * cannot support.
 */
export function CheckoutNote({
  tone,
  title,
  body,
}: {
  tone: "neutral" | "warning";
  title: string;
  body: string;
}) {
  const warning = tone === "warning";

  return (
    <div
      className="mx-5 mb-5 flex items-start gap-3 rounded-[8px] px-4 py-3.5"
      style={{ backgroundColor: warning ? "var(--admin-warning-soft)" : checkoutColor.tileSoft }}
    >
      <span
        aria-hidden
        className="mt-[1px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full"
        style={{
          backgroundColor: warning ? checkoutColor.warning : checkoutColor.primary,
          color: "#ffffff",
        }}
      >
        <svg viewBox="0 0 14 14" fill="none" className="h-[11px] w-[11px]">
          <path
            d="M7 3.4v4.2M7 10.1v.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <span className="min-w-0">
        <span className="block text-[12.5px] font-medium text-text-primary">{title}</span>
        <span className="mt-0.5 block text-[12px] leading-[1.45] text-text-secondary">{body}</span>
      </span>
    </div>
  );
}
