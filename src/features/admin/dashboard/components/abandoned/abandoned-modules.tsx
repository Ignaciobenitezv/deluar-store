import Link from "next/link";
import { overviewColor, overviewUi } from "../overview/overview-ui";
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
      <path d="M3.5 4h2l1.6 8.6h8.9L17.6 7H7" />
      <circle cx="9" cy="17.5" r="1.3" />
      <circle cx="16" cy="17.5" r="1.3" />
    </svg>
  );
}

export function IconCheckout() {
  return (
    <svg {...ICON} className="h-[18px] w-[18px]">
      <rect x="3" y="5.5" width="16" height="11" rx="2.2" />
      <path d="M3 9.5h16" />
    </svg>
  );
}

export function IconValue() {
  return (
    <svg {...ICON} className="h-[18px] w-[18px]">
      <circle cx="11" cy="11" r="7.5" />
      <path d="M11 6.5v9M9 8.6c0-.9 1-1.4 2-1.4s2 .6 2 1.4c0 2.1-4 1.7-4 4 0 1.2 1.1 1.6 2 1.6s2-.5 2-1.5" />
    </svg>
  );
}

export function IconTicket() {
  return (
    <svg {...ICON} className="h-[18px] w-[18px]">
      <path d="M5 7.5h12l-1.2 10H6.2L5 7.5Z" />
      <path d="M8.5 7.5V6a2.5 2.5 0 0 1 5 0v1.5" />
    </svg>
  );
}

/**
 * The reference's KPI: icon tile and value stacked over the label, with the
 * period's own series on the right. With no abandonments the figure stays
 * neutral and the series slot holds its baseline rather than a fabricated bar.
 */
export function AbandonedKpi({
  label,
  value,
  context,
  icon,
  tone,
  series,
}: {
  label: string;
  value: string;
  context: string;
  icon: React.ReactNode;
  tone: "friction" | "info" | "neutral";
  series: number[];
}) {
  const palette = {
    friction: { tile: "#fbeceb", ink: overviewColor.negative, bar: overviewColor.negative },
    info: { tile: "#eef0fc", ink: overviewColor.action, bar: overviewColor.action },
    neutral: { tile: "#f1f5f9", ink: overviewColor.muted, bar: overviewColor.borderStrong },
  }[tone];

  const max = Math.max(...series, 0);
  const hasSeries = max > 0;

  return (
    <article className={cn(overviewUi.module, "flex items-center gap-4 px-5 py-5")}>
      <div className="min-w-0 flex-1">
        <span
          aria-hidden
          className="flex h-9 w-9 items-center justify-center rounded-[9px]"
          style={{ backgroundColor: palette.tile, color: palette.ink }}
        >
          {icon}
        </span>
        <p className="mt-3.5 text-[1.9rem] font-semibold leading-none tabular-nums tracking-[-0.035em] text-slate-900">
          {value}
        </p>
        <p className="mt-2 truncate text-[13px] text-slate-600">{label}</p>
        <p className="mt-2 text-[11.5px] leading-[1.35] text-slate-500">{context}</p>
      </div>

      <div className="flex h-[54px] w-[34%] shrink-0 items-end gap-[2px]">
        {series.map((point, index) => (
          <span
            key={index}
            className="min-w-0 flex-1 rounded-t-[2px]"
            style={{
              height: hasSeries && point > 0 ? Math.max((point / max) * 54, 4) : 3,
              backgroundColor: hasSeries && point > 0 ? palette.bar : overviewColor.inactive,
            }}
          />
        ))}
      </div>
    </article>
  );
}

export function AbandonedModule({
  title,
  note,
  action,
  control,
  children,
  className,
}: {
  title: string;
  note?: string;
  action?: { href: string; label: string };
  control?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(overviewUi.module, "flex min-w-0 flex-col overflow-hidden", className)}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-5 pb-4 pt-5">
        <div className="min-w-0">
          <h2 className={overviewUi.title}>{title}</h2>
          {note ? <p className={cn(overviewUi.note, "mt-1")}>{note}</p> : null}
        </div>
        {control ??
          (action ? (
            <Link
              href={action.href}
              className="shrink-0 text-[12px] font-medium text-[#4f52c9] underline-offset-[3px] hover:underline"
            >
              {action.label} →
            </Link>
          ) : null)}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </section>
  );
}

/** Compact, never a white slab: one line inside the module that already has a header. */
export function AbandonedEmpty({ message }: { message: string }) {
  return <p className={cn(overviewUi.note, "px-5 pb-5")}>{message}</p>;
}
