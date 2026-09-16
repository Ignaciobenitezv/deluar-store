import { overviewUi } from "../overview/overview-ui";
import { cn } from "@/lib/utils";

/**
 * The reference's KPI block: icon tile and label share the top line, the figure
 * sits large beneath them, one line of description closes it, and the leading
 * card carries an accent edge.
 */
export function ConversionKpi({
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
        <span aria-hidden className="absolute left-0 top-0 h-full w-[3px] bg-primary" />
      ) : null}
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-elevated text-text-secondary"
        >
          {icon}
        </span>
        <p className="min-w-0 truncate text-[13px] text-text-secondary">{label}</p>
      </div>
      <p className="mt-4 text-[1.75rem] font-semibold leading-none tabular-nums tracking-[-0.02em] text-text-primary">
        {value}
      </p>
      <p className="mt-3 text-[12px] leading-[1.4] text-text-secondary">{description}</p>
    </article>
  );
}
