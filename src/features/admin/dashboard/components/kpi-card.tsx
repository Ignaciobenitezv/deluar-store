import { cn } from "@/lib/utils";
import type { DashboardTone } from "../types/dashboard";

type KpiCardProps = {
  title: string;
  value: string;
  description?: string;
  icon?: React.ReactNode;
  tone?: DashboardTone;
};

const iconBgMap: Record<DashboardTone, string> = {
  neutral: "bg-surface-elevated text-text-secondary",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  accent: "bg-info-soft text-info",
  danger: "bg-danger-soft text-danger",
};

export function KpiCard({ title, value, description, icon, tone = "neutral" }: KpiCardProps) {
  return (
    <article className="flex flex-col rounded-2xl border border-border bg-surface p-4">
      {icon ? (
        <div className={cn("mb-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", iconBgMap[tone])}>
          {icon}
        </div>
      ) : null}
      <p className="text-[1.375rem] font-semibold leading-none tracking-[-0.02em] text-text-primary">{value}</p>
      <p className="mt-2 text-[12.5px] font-semibold text-text-primary">{title}</p>
      {description ? <p className="mt-0.5 text-[11.5px] leading-4 text-text-secondary">{description}</p> : null}
    </article>
  );
}
