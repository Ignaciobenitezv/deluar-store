import Link from "next/link";
import { IconArrow, IconChevron } from "./home-icons";
import type { ModuleToneKey } from "./home-ui";
import { Badge } from "@/components/admin/ui/badge";
import { cn } from "@/lib/utils";

export type HomeDelta = {
  direction: "up" | "down" | "flat" | "unmeasurable";
  changePercent: number;
};

function DeltaArrow({ direction }: { direction: "up" | "down" }) {
  return (
    <svg viewBox="0 0 10 10" aria-hidden className="h-[9px] w-[9px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      {direction === "up" ? <path d="M5 8.2V1.8M2.2 4.6 5 1.8l2.8 2.8" /> : <path d="M5 1.8v6.4M2.2 5.4 5 8.2l2.8-2.8" />}
    </svg>
  );
}

const toneClass: Record<ModuleToneKey, string> = {
  success: "bg-success-soft text-success",
  info: "bg-info-soft text-info",
  violet: "bg-violet-soft text-violet",
  warning: "bg-warning-soft text-warning",
};

/** Green up, red down — and where no previous window exists, a grey dash. The
 * chip never invents a number to fill its own shape. */
function DeltaChip({ delta }: { delta: HomeDelta }) {
  const tone =
    delta.direction === "up"
      ? "bg-success-soft text-success"
      : delta.direction === "down"
        ? "bg-danger-soft text-danger"
        : "bg-surface-elevated text-text-secondary";

  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-[2px] text-[11px] font-semibold tabular-nums", tone)}>
      {delta.direction === "up" || delta.direction === "down" ? (
        <>
          <DeltaArrow direction={delta.direction} />
          {new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(delta.changePercent)}%
        </>
      ) : (
        <span aria-hidden>—</span>
      )}
    </span>
  );
}

/** The period's headline figures — flat graphite card, icon chip top-right,
 * no shadow, no gradient. */
export function HomeKpi({
  label,
  value,
  icon,
  tone,
  delta,
  context,
  href,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: ModuleToneKey;
  delta: HomeDelta;
  context: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-w-0 flex-col justify-between rounded-2xl border border-border bg-surface p-4 transition-colors duration-150 hover:border-primary/30"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-text-secondary">{label}</p>
        <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", toneClass[tone])}>{icon}</span>
      </div>

      <div className="mt-4">
        <p className="min-w-0 truncate text-[1.5rem] font-semibold leading-none tabular-nums tracking-[-0.02em] text-text-primary">
          {value}
        </p>
        <p className="mt-2 flex items-center gap-1.5">
          <DeltaChip delta={delta} />
          <span className="min-w-0 truncate text-[11.5px] text-text-secondary">{context}</span>
        </p>
      </div>
    </Link>
  );
}

export function HomeSectionTitle({ title, note }: { title: string; note?: string }) {
  return (
    <div className="min-w-0">
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-secondary">{title}</h2>
      {note ? <p className="mt-1 text-[12.5px] text-text-secondary">{note}</p> : null}
    </div>
  );
}

/** A module tile is a door, not a decoration: flat surface, border, small
 * icon chip, one hover state — no gradient wash, no glow, no lift. */
export function HomeModuleCard({
  href,
  title,
  description,
  cta,
  icon,
  tone,
  alert,
}: {
  href: string;
  title: string;
  description: string;
  cta: string;
  icon: React.ReactNode;
  tone: ModuleToneKey;
  alert?: { label: string } | null;
}) {
  return (
    <Link
      href={href}
      className="group flex min-w-0 flex-col rounded-2xl border border-border bg-surface p-4 transition-colors duration-150 hover:border-primary/30 hover:bg-surface-elevated"
    >
      <div className="flex items-start justify-between gap-3">
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", toneClass[tone])}>{icon}</span>
        <IconChevron className="mt-1 h-4 w-4 shrink-0 text-text-secondary opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
      </div>

      <h3 className="mt-3 text-[14px] font-semibold tracking-[-0.01em] text-text-primary">{title}</h3>
      <p className="mt-1 text-[12px] leading-[1.4] text-text-secondary">{description}</p>

      <div className="mt-auto pt-3">
        {alert ? (
          <Badge tone="warning" className="mb-2 max-w-full normal-case tracking-normal">
            {alert.label}
          </Badge>
        ) : null}

        <span className="flex items-center gap-1.5 text-[12.5px] font-medium text-text-primary">
          {cta}
          <IconArrow className="h-[13px] w-[13px] text-text-secondary transition-transform duration-150 group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

export function HomeModule({
  title,
  note,
  icon,
  action,
  children,
  className,
}: {
  title: string;
  note: string;
  icon: React.ReactNode;
  action?: { href: string; label: string };
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface", className)}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1.5 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-start gap-2">
          <span aria-hidden className="mt-[1px] shrink-0 text-text-secondary">
            {icon}
          </span>
          <div className="min-w-0">
            <h2 className="text-[13px] font-semibold text-text-primary">{title}</h2>
            <p className="mt-0.5 text-[11.5px] text-text-secondary">{note}</p>
          </div>
        </div>

        {action ? (
          <Link href={action.href} className="shrink-0 text-[12px] font-medium text-primary hover:underline underline-offset-[3px]">
            {action.label} →
          </Link>
        ) : null}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </section>
  );
}
