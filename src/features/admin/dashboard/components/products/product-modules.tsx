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

export function IconBox() {
  return (
    <svg {...ICON} className="h-[18px] w-[18px]">
      <path d="M11 3.5 3.8 7.2v7.6L11 18.5l7.2-3.7V7.2L11 3.5Z" />
      <path d="M3.8 7.2 11 11l7.2-3.8M11 11v7.5" />
    </svg>
  );
}

export function IconTag() {
  return (
    <svg {...ICON} className="h-[18px] w-[18px]">
      <path d="M10.5 3.5H18v7.5l-7.8 7.8-7.5-7.5L10.5 3.5Z" />
      <circle cx="14.4" cy="7.6" r="1.3" />
    </svg>
  );
}

export function IconCart() {
  return (
    <svg {...ICON} className="h-[18px] w-[18px]">
      <path d="M3.5 4h2l1.6 8.6h8.9L17.6 7H7" />
      <circle cx="9" cy="17.5" r="1.3" />
      <circle cx="16" cy="17.5" r="1.3" />
    </svg>
  );
}

export function IconStack() {
  return (
    <svg {...ICON} className="h-[18px] w-[18px]">
      <path d="M11 3.5 3.5 7l7.5 3.5L18.5 7 11 3.5Z" />
      <path d="M3.5 11 11 14.5 18.5 11M3.5 14.6 11 18.1l7.5-3.5" />
    </svg>
  );
}

/**
 * The reference's KPI: icon tile, then the label, then the figure beside the
 * period's own series, with the comparison underneath when one exists.
 */
export function ProductKpi({
  label,
  value,
  icon,
  tone,
  series,
  delta,
  note,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: "info" | "positive" | "warning";
  series: number[];
  delta?: { changePercent: number; rising: boolean } | null;
  note?: string;
}) {
  const palette = {
    info: { tile: "#eef0fc", ink: overviewColor.action, bar: overviewColor.action },
    positive: { tile: "#e8f5ee", ink: overviewColor.positive, bar: overviewColor.positive },
    warning: { tile: "#fbeceb", ink: overviewColor.negative, bar: overviewColor.negative },
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
        <p className="min-w-0 text-[1.75rem] font-semibold leading-none tabular-nums tracking-[-0.035em] text-slate-900">
          {value}
        </p>
        {series.length > 0 ? (
          <div className="flex h-[38px] w-[38%] shrink-0 items-end gap-[2px]">
            {series.map((point, index) => (
              <span
                key={index}
                className="min-w-0 flex-1 rounded-t-[2px]"
                style={{
                  height: max > 0 && point > 0 ? Math.max((point / max) * 38, 3) : 2,
                  backgroundColor:
                    max > 0 && point > 0 ? palette.bar : overviewColor.inactive,
                }}
              />
            ))}
          </div>
        ) : null}
      </div>

      <p className="mt-2.5 flex flex-wrap items-center gap-x-1.5 text-[12px] leading-[1.35] text-slate-500">
        {delta ? (
          <>
            <span
              className="font-semibold tabular-nums"
              style={{ color: delta.rising ? overviewColor.positive : overviewColor.negative }}
            >
              {delta.rising ? "↑" : "↓"}{" "}
              {new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 }).format(
                Math.abs(delta.changePercent),
              )}
              %
            </span>
            <span>vs. período anterior</span>
          </>
        ) : (
          note
        )}
      </p>
    </article>
  );
}

export function ProductModule({
  title,
  note,
  action,
  legend,
  children,
  className,
}: {
  title: string;
  note?: string;
  action?: { href: string; label: string };
  legend?: React.ReactNode;
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
        {legend ??
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

export function ProductEmpty({ message }: { message: string }) {
  return <p className={cn(overviewUi.note, "px-5 pb-5")}>{message}</p>;
}
