import Link from "next/link";
import { overviewUi } from "../overview/overview-ui";
import { cn } from "@/lib/utils";

const ICON = {
  viewBox: "0 0 22 22",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function IconSessions() {
  return (
    <svg {...ICON} className="h-[18px] w-[18px]">
      <circle cx="11" cy="7.5" r="3.2" />
      <path d="M4.5 18c0-3.1 2.9-5.2 6.5-5.2s6.5 2.1 6.5 5.2" />
    </svg>
  );
}

export function IconVisitors() {
  return (
    <svg {...ICON} className="h-[18px] w-[18px]">
      <path d="M4.5 17.5V11M9.5 17.5V5M14.5 17.5v-4.5M19 17.5V8" />
    </svg>
  );
}

export function IconPurchases() {
  return (
    <svg {...ICON} className="h-[18px] w-[18px]">
      <path d="M3.5 4h2l1.6 8.6h8.9L17.6 7H7" />
      <circle cx="9" cy="17.5" r="1.3" />
      <circle cx="16" cy="17.5" r="1.3" />
    </svg>
  );
}

export function IconRevenue() {
  return (
    <svg {...ICON} className="h-[18px] w-[18px]">
      <rect x="3" y="5.5" width="16" height="11" rx="2.2" />
      <path d="M3 9.5h16" />
    </svg>
  );
}

export function IconTraffic() {
  return (
    <svg {...ICON} className="h-[18px] w-[18px]">
      <circle cx="11" cy="11" r="7.5" />
      <path d="M3.5 11h15M11 3.5c1.9 2 3 4.7 3 7.5s-1.1 5.5-3 7.5c-1.9-2-3-4.7-3-7.5s1.1-5.5 3-7.5Z" />
    </svg>
  );
}

export function IconConversion() {
  return (
    <svg {...ICON} className="h-[18px] w-[18px]">
      <path d="M3.5 4.5h15l-5.8 7v6l-3.4-1.8v-4.2L3.5 4.5Z" />
    </svg>
  );
}

export function IconMoney() {
  return (
    <svg {...ICON} className="h-[18px] w-[18px]">
      <path d="M11 4v14M8 7.5c0-1.1 1.3-1.8 3-1.8s3 .8 3 1.9c0 2.7-6 2.2-6 5.2 0 1.5 1.6 2.1 3 2.1s3-.7 3-2" />
    </svg>
  );
}

/**
 * The reference's KPI block: icon tile and label share the top line, the figure
 * sits large beneath them, and one line of description closes the card. The
 * leading card carries an accent edge.
 */
export function AcqKpi({
  label,
  value,
  description,
  icon,
  accent = false,
}: {
  label: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <article className={cn(overviewUi.module, "relative overflow-hidden px-5 py-5")}>
      {accent ? (
        <span aria-hidden className="absolute left-0 top-0 h-full w-[3px] bg-[#4f52c9]" />
      ) : null}
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] bg-surface-elevated text-text-secondary"
        >
          {icon}
        </span>
        <p className="min-w-0 truncate text-[13.5px] text-text-secondary">{label}</p>
      </div>
      <p className="mt-4 text-[2rem] font-semibold leading-none tabular-nums tracking-[-0.035em] text-text-primary">
        {value}
      </p>
      <p className="mt-3 text-[12px] leading-[1.4] text-text-secondary">{description}</p>
    </article>
  );
}

function Chevron() {
  return (
    <svg
      viewBox="0 0 12 12"
      aria-hidden
      className="h-3.5 w-3.5 shrink-0 text-text-secondary/60 transition-colors group-hover:text-text-secondary"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4.5 2.5 8.5 6l-4 3.5" />
    </svg>
  );
}

/**
 * The reference's second row. Each card carries a tint, reading left to right as
 * neutral, paid, conversion and revenue — the same semantic scale the rest of
 * Analytics uses, in its coolest values. `ink` is the one color each tone
 * owns; surface and tile are derived from it with `color-mix`, so both stay
 * correct in light and dark automatically instead of needing a second,
 * hand-picked hex per theme.
 */
export const highlightTones = {
  neutral: { ink: "var(--admin-text-secondary)" },
  positive: { ink: "var(--admin-success)" },
  info: { ink: "#4f52c9" },
  warning: { ink: "var(--admin-warning)" },
} as const;

export type HighlightTone = keyof typeof highlightTones;

export function AcqHighlight({
  label,
  value,
  subtitle,
  href,
  icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  subtitle?: string;
  href?: string;
  icon: React.ReactNode;
  tone?: HighlightTone;
}) {
  const palette = highlightTones[tone];
  const surfaceColor = `color-mix(in srgb, ${palette.ink} 8%, var(--surface))`;
  const tileColor = `color-mix(in srgb, ${palette.ink} 20%, var(--surface))`;

  const body = (
    <>
      <span
        aria-hidden
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px]"
        style={{ backgroundColor: tileColor, color: palette.ink }}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12px] text-text-secondary">{label}</span>
        <span className="mt-1 block truncate text-[15px] font-semibold tracking-[-0.02em] text-text-primary">
          {value}
        </span>
        {subtitle ? (
          <span className="mt-1 block truncate text-[12px] tabular-nums text-text-secondary">
            {subtitle}
          </span>
        ) : null}
      </span>
      {href ? <Chevron /> : null}
    </>
  );

  const className = cn(
    "group flex items-center gap-3 rounded-[12px] border border-border px-4 py-4",
    href && "transition-colors hover:border-text-secondary/40",
  );

  if (href) {
    return (
      <Link href={href} className={className} style={{ backgroundColor: surfaceColor }}>
        {body}
      </Link>
    );
  }

  return (
    <article className={className} style={{ backgroundColor: surfaceColor }}>
      {body}
    </article>
  );
}

/**
 * A module whose header carries the active period on the right, where the
 * reference puts its selector. It states the period rather than pretending to
 * be a control: the real one lives once, in the page header.
 */
export function AcqModule({
  title,
  note,
  periodLabel,
  action,
  children,
  className,
}: {
  title: string;
  note?: string;
  periodLabel?: string;
  action?: { href: string; label: string };
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

        {action ? (
          <Link
            href={action.href}
            className="shrink-0 rounded-[6px] bg-[#4f52c9] px-3.5 py-[8px] text-[12.5px] font-medium text-white transition-colors hover:bg-[#4348b4]"
          >
            {action.label} →
          </Link>
        ) : periodLabel ? (
          <span className="shrink-0 rounded-[6px] border border-border bg-surface-elevated px-3 py-[6px] text-[12px] font-medium text-text-secondary">
            {periodLabel}
          </span>
        ) : null}
      </div>

      <div className="min-w-0 flex-1">{children}</div>
    </section>
  );
}
