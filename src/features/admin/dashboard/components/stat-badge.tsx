import { dashboardStatBadgeStyles } from "../lib/dashboard-ui";
import type { DashboardStatBadgeTone } from "../types/dashboard";

type StatBadgeProps = {
  label: string;
  value: string;
  tone?: DashboardStatBadgeTone;
};

export function StatBadge({ label, value, tone = "neutral" }: StatBadgeProps) {
  return (
    <div className={`rounded-[18px] border px-4 py-3 ${dashboardStatBadgeStyles[tone]}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-75">{label}</p>
      <p className="mt-1 text-lg font-semibold tracking-[-0.02em]">{value}</p>
    </div>
  );
}

