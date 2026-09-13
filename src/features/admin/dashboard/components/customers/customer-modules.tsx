import Link from "next/link";
import { overviewColor, overviewUi } from "../overview/overview-ui";
import { customerColor } from "./customer-palette";
import { cn } from "@/lib/utils";

const ICON = {
  viewBox: "0 0 22 22",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function IconBuyers() {
  return (
    <svg {...ICON} className="h-[18px] w-[18px]">
      <circle cx="8.5" cy="8" r="2.8" />
      <path d="M3 17.5c0-2.7 2.5-4.4 5.5-4.4s5.5 1.7 5.5 4.4" />
      <path d="M15 6.2a2.8 2.8 0 0 1 0 5.4M16.5 13.6c1.7.6 2.8 1.9 2.8 3.9" />
    </svg>
  );
}

export function IconNew() {
  return (
    <svg {...ICON} className="h-[18px] w-[18px]">
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 18c0-2.9 2.6-4.7 5.5-4.7 1 0 2 .2 2.8.6" />
      <path d="M16.5 12.5v5M14 15h5" />
    </svg>
  );
}

export function IconReturning() {
  return (
    <svg {...ICON} className="h-[18px] w-[18px]">
      <path d="M4 11a7 7 0 0 1 11.9-5M18 11a7 7 0 0 1-11.9 5" />
      <path d="M15.5 3.5V6H13M6.5 18.5V16H9" />
    </svg>
  );
}

export function IconRate() {
  return (
    <svg {...ICON} className="h-[18px] w-[18px]">
      <path d="M17 5 5 17" />
      <circle cx="7.2" cy="7.2" r="2.2" />
      <circle cx="14.8" cy="14.8" r="2.2" />
    </svg>
  );
}

/**
 * The reference's KPI: icon tile, label, the figure beside the period's own
 * series. A metric with no daily series simply leaves that slot empty rather
 * than drawing a mark that stands for nothing.
 */
export function CustomerKpi({
  label,
  value,
  icon,
  tone,
  series,
  note,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: "primary" | "secondary";
  series: number[];
  note: string;
}) {
  const palette =
    tone === "primary"
      ? {
          tile: customerColor.tilePrimary,
          ink: customerColor.primary,
          bar: customerColor.primary,
        }
      : {
          tile: customerColor.tileSecondary,
          ink: "#6f9bea",
          bar: customerColor.secondary,
        };

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
        <p className="min-w-0 text-[1.8rem] font-semibold leading-none tabular-nums tracking-[-0.035em] text-slate-900">
          {value}
        </p>
        {series.length > 0 ? (
          <div className="flex h-[38px] w-[36%] shrink-0 items-end gap-[2px]">
            {series.map((point, index) => (
              <span
                key={index}
                className="min-w-0 flex-1 rounded-t-[2px]"
                style={{
                  height: max > 0 && point > 0 ? Math.max((point / max) * 38, 3) : 2,
                  backgroundColor: max > 0 && point > 0 ? palette.bar : overviewColor.inactive,
                }}
              />
            ))}
          </div>
        ) : null}
      </div>

      <p className="mt-2.5 text-[12px] leading-[1.35] text-slate-500">{note}</p>
    </article>
  );
}

export function CustomerModule({
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
              className="shrink-0 text-[12px] font-medium text-[#3b7ff5] underline-offset-[3px] hover:underline"
            >
              {action.label} →
            </Link>
          ) : null)}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </section>
  );
}

export function CustomerEmpty({ message }: { message: string }) {
  return <p className={cn(overviewUi.note, "px-5 pb-5")}>{message}</p>;
}

/** Initials stand in for an avatar: the store records no customer photo. */
export function CustomerInitials({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <span
      aria-hidden
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#e8effd] text-[11px] font-semibold text-[#3b7ff5]"
    >
      {initials || "—"}
    </span>
  );
}
