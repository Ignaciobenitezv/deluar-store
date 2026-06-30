import { dashboardToneStyles } from "../lib/dashboard-ui";
import type { DashboardTone } from "../types/dashboard";

type KpiCardProps = {
  title: string;
  value: string;
  description?: string;
  trend?: string;
  icon?: React.ReactNode;
  sparkline?: number[];
  tone?: DashboardTone;
};

function SparklinePlaceholder({
  values = [0, 0, 0, 0, 0, 0],
  tone = "neutral",
}: {
  values?: number[];
  tone?: DashboardTone;
}) {
  const normalizedValues = values.length > 0 ? values : [0];
  const maxValue = Math.max(...normalizedValues, 1);
  const toneClasses: Record<DashboardTone, string> = {
    neutral: "bg-slate-300",
    success: "bg-emerald-400",
    warning: "bg-amber-400",
    accent: "bg-sky-400",
    danger: "bg-rose-400",
  };

  return (
    <div className="hidden h-12 items-end gap-1.5 sm:flex" aria-hidden="true">
      {normalizedValues.slice(-8).map((value, index) => (
        <span
          key={`${index}-${value}`}
          className={`w-1.5 rounded-full ${toneClasses[tone]}`}
          style={{
            height: `${Math.max(16, (value / maxValue) * 100)}%`,
            opacity: value > 0 ? 0.95 : 0.4,
          }}
        />
      ))}
    </div>
  );
}

export function KpiCard({
  title,
  value,
  description,
  trend,
  icon,
  sparkline,
  tone = "neutral",
}: KpiCardProps) {
  return (
    <article
      className={`group rounded-[22px] border px-3 py-2.5 ${dashboardToneStyles[tone]} transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(15,23,42,0.08)] sm:rounded-[24px] sm:p-5`}
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <p className="text-[8.5px] font-semibold uppercase tracking-[0.18em] text-slate-500 sm:text-[11px] sm:tracking-[0.22em]">
            {title}
          </p>
          <p className="mt-0.5 text-[1.3rem] font-semibold tracking-[-0.06em] text-slate-950 sm:mt-3 sm:text-[2rem]">
            {value}
          </p>
          {description ? (
            <p className="hidden text-sm leading-6 text-slate-500 sm:mt-2 sm:block">{description}</p>
          ) : null}
          {trend ? (
            <p className="hidden text-xs font-medium uppercase tracking-[0.18em] text-slate-500 sm:mt-3 sm:block">
              {trend}
            </p>
          ) : null}
        </div>

        <div className="hidden w-24 shrink-0 flex-col items-end gap-3 sm:flex">
          {icon ? <div className="text-slate-400">{icon}</div> : null}
          {sparkline ? <SparklinePlaceholder values={sparkline} tone={tone} /> : null}
        </div>
      </div>
    </article>
  );
}
