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
        <span aria-hidden className="absolute left-0 top-0 h-full w-[3px] bg-[#4f52c9]" />
      ) : null}
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] bg-[#f1f5f9] text-slate-500"
        >
          {icon}
        </span>
        <p className="min-w-0 truncate text-[13.5px] text-slate-600">{label}</p>
      </div>
      <p className="mt-4 text-[2rem] font-semibold leading-none tabular-nums tracking-[-0.035em] text-slate-900">
        {value}
      </p>
      <p className="mt-3 text-[12px] leading-[1.4] text-slate-500">{description}</p>
    </article>
  );
}
