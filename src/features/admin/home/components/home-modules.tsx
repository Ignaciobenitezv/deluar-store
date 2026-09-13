import Link from "next/link";
import { glass, homeColor, homeUi } from "./home-ui";
import { IconArrow, IconChevron } from "./home-icons";
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

/**
 * Green up, red down — and where no previous window exists, a grey dash. The
 * chip never invents a number to fill its own shape.
 */
function DeltaChip({ delta }: { delta: HomeDelta }) {
  const tone =
    delta.direction === "up"
      ? { bg: "#e7f5ee", ink: "#0f7a4a" }
      : delta.direction === "down"
        ? { bg: "#fdeceb", ink: "#c0392f" }
        : { bg: "#eef1f6", ink: "#64748b" };

  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-[3px] text-[11.5px] font-semibold tabular-nums"
      style={{ backgroundColor: tone.bg, color: tone.ink }}
    >
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

/**
 * The period's headline figures, one card each. The mark is drawn only when a
 * real daily series has shape to show: a single active day would render as one
 * bar beside a row of stubs, which reads as a broken control, not a reading.
 */
export function HomeKpi({
  label,
  value,
  icon,
  tone,
  series,
  delta,
  context,
  href,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: { soft: string; wash: string; ink: string; glow: string };
  series?: number[];
  delta: HomeDelta;
  context: string;
  href: string;
}) {
  const max = series ? Math.max(...series, 0) : 0;
  const activeBlocks = series?.filter((point) => point > 0).length ?? 0;
  const showSeries = series !== undefined && activeBlocks >= 3;

  return (
    <Link
      href={href}
      className={cn(
        glass.panel,
        "group relative flex min-w-0 items-start gap-3.5 overflow-hidden rounded-[16px] px-5 py-[22px] transition-all duration-300 hover:-translate-y-0.5 hover:border-white hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_2px_6px_rgba(15,23,42,0.05),0_18px_36px_-22px_var(--tone-glow)]",
      )}
      style={
        {
          "--tone-glow": tone.glow,
          backgroundImage: `radial-gradient(240px circle at var(--mx, -400px) var(--my, -400px), ${tone.glow}, transparent 62%)`,
        } as React.CSSProperties
      }
      data-spotlight
    >
      <span
        aria-hidden
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[11px] border border-white/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition-transform duration-300 group-hover:scale-[1.06]"
        style={{ backgroundColor: "rgba(255,255,255,0.55)", color: tone.ink }}
      >
        {icon}
      </span>

      <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[13px] text-slate-600">{label}</p>
          <p className="mt-1.5 min-w-0 truncate text-[1.55rem] font-semibold leading-none tabular-nums tracking-[-0.035em] text-slate-950">
            {value}
          </p>
          <p className="mt-3 flex items-center gap-2">
            <DeltaChip delta={delta} />
            <span className="min-w-0 truncate text-[12px] text-slate-500">{context}</span>
          </p>
        </div>

        {showSeries && series ? (
          <div aria-hidden className="mt-1 flex h-[42px] w-[58px] shrink-0 items-end gap-[3px]">
            {series.map((point, index) => (
              <span
                key={index}
                className="min-w-0 flex-1 rounded-[2px]"
                style={{
                  height: max > 0 && point > 0 ? Math.max((point / max) * 42, 7) : 7,
                  backgroundColor: max > 0 && point === max ? "#94a3b8" : "#cbd5e1",
                }}
              />
            ))}
          </div>
        ) : null}
      </div>
    </Link>
  );
}

export function HomeSectionTitle({ title, note }: { title: string; note: string }) {
  return (
    <div className="min-w-0">
      <h2 className="text-[20px] font-semibold tracking-[-0.025em] text-slate-950">{title}</h2>
      <p className="mt-1.5 text-[14px] text-slate-700">{note}</p>
    </div>
  );
}

/**
 * A module card is a door with a status light. Each tile carries its module's
 * own hue so the row of five does not read as one shape repeated; amber is
 * separate from that, and appears only where a real count awaits action.
 */
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
  tone: { soft: string; wash: string; ink: string; glow: string };
  alert?: { label: string } | null;
}) {
  return (
    <Link
      href={href}
      className={cn(
        homeUi.module,
        "group relative flex min-w-0 flex-col overflow-hidden px-6 py-[26px] transition-all duration-300 hover:-translate-y-0.5 hover:border-transparent hover:shadow-[0_2px_6px_rgba(15,23,42,0.05),0_20px_40px_-22px_var(--tone-glow)]",
      )}
      style={
        {
          "--tone-glow": tone.glow,
          backgroundImage: `radial-gradient(280px circle at var(--mx, -400px) var(--my, -400px), ${tone.glow}, transparent 60%), linear-gradient(150deg, ${tone.wash} 0%, transparent 60%)`,
        } as React.CSSProperties
      }
      data-spotlight
    >
      <div className="flex items-start justify-between gap-3">
        <span
          aria-hidden
          className="flex h-[54px] w-[54px] items-center justify-center rounded-[14px] border border-white/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition-transform duration-300 group-hover:scale-[1.06]"
          style={{ backgroundColor: "rgba(255,255,255,0.55)", color: tone.ink }}
        >
          {icon}
        </span>
        <IconChevron className="mt-1.5 h-[15px] w-[15px] shrink-0 text-slate-300 transition-colors group-hover:text-slate-500" />
      </div>

      <h3 className="mt-[16px] text-[17px] font-semibold tracking-[-0.018em] text-slate-950">
        {title}
      </h3>
      <p className="mt-2 text-[13.5px] leading-[1.4] text-slate-600">{description}</p>

      <div className="mt-auto pt-[20px]">
        {alert ? (
          <span
            className="mb-3 inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-[3px] text-[11.5px] font-medium"
            style={{ backgroundColor: homeColor.attentionSoft, color: homeColor.attention }}
          >
            <span
              aria-hidden
              className="h-[5px] w-[5px] shrink-0 rounded-full"
              style={{ backgroundColor: homeColor.attention }}
            />
            <span className="truncate">{alert.label}</span>
          </span>
        ) : null}

        <span className="flex items-center gap-2 text-[14px] font-medium text-slate-700">
          {cta}
          <IconArrow className="h-[15px] w-[15px] text-slate-500 transition-transform group-hover:translate-x-0.5" />
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
    <section className={cn(glass.dense, "flex min-w-0 flex-col overflow-hidden rounded-[16px]", className)}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-6 pb-4 pt-5">
        <div className="flex min-w-0 items-start gap-2.5">
          <span aria-hidden className="mt-[1px] shrink-0 text-slate-400">
            {icon}
          </span>
          <div className="min-w-0">
            <h2 className={homeUi.title}>{title}</h2>
            <p className={cn(homeUi.note, "mt-1")}>{note}</p>
          </div>
        </div>

        {action ? (
          <Link
            href={action.href}
            className="shrink-0 text-[12px] font-medium underline-offset-[3px] hover:underline"
            style={{ color: homeColor.action }}
          >
            {action.label} →
          </Link>
        ) : null}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </section>
  );
}
