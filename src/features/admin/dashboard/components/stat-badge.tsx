import type { DashboardStatBadgeTone } from "../types/dashboard";

type StatBadgeProps = {
  label: string;
  value: string;
  tone?: DashboardStatBadgeTone;
};

export function StatBadge({ label, value }: StatBadgeProps) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-text-secondary sm:text-[10px]">
        {label}
      </p>
      <p className="mt-1 whitespace-nowrap text-[1rem] font-semibold tracking-[-0.02em] text-text-primary sm:text-[1.1rem]">
        {value}
      </p>
    </div>
  );
}
