import { dashboardStatBadgeStyles } from "../lib/dashboard-ui";
import type { DashboardStatBadgeTone } from "../types/dashboard";

type StatBadgeProps = {
  label: string;
  value: string;
  tone?: DashboardStatBadgeTone;
};

export function StatBadge({ label, value, tone = "neutral" }: StatBadgeProps) {
  return (
    <div className={`rounded-[16px] border px-3 py-2.5 ${dashboardStatBadgeStyles[tone]} sm:rounded-[18px] sm:px-4 sm:py-3`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] opacity-75 sm:text-[11px] sm:tracking-[0.18em]">
        {label}
      </p>
      <p className="mt-0.5 text-[1rem] font-semibold tracking-[-0.02em] sm:mt-1 sm:text-lg">
        {value}
      </p>
    </div>
  );
}
