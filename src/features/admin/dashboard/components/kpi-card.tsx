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
    <div className="flex h-12 items-end gap-1.5" aria-hidden="true">
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
      className={`group rounded-[24px] border p-5 ${dashboardToneStyles[tone]} transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(15,23,42,0.08)]`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            {title}
          </p>
          <p className="mt-3 text-[2rem] font-semibold tracking-[-0.06em] text-slate-950">
            {value}
          </p>
          {description ? (
            <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
          ) : null}
          {trend ? (
            <p className="mt-3 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              {trend}
            </p>
          ) : null}
        </div>

        <div className="flex w-24 shrink-0 flex-col items-end gap-3">
          {icon ? <div className="text-slate-400">{icon}</div> : null}
          {sparkline ? <SparklinePlaceholder values={sparkline} tone={tone} /> : null}
        </div>
      </div>
    </article>
  );
}

