import { cn } from "@/lib/utils";
import type { DashboardTone } from "../types/dashboard";

type KpiCardProps = {
  title: string;
  value: string;
  description?: string;
  icon?: React.ReactNode;
  tone?: DashboardTone;
  variant?: "primary" | "secondary";
};

const iconBgMap: Record<DashboardTone, string> = {
  neutral: "bg-slate-50 text-slate-400",
  success: "bg-[#edf7f0] text-emerald-500",
  warning: "bg-amber-50 text-amber-500",
  accent:  "bg-sky-50 text-sky-500",
  danger:  "bg-rose-50 text-rose-500",
};

export function KpiCard({ title, value, description, icon, tone = "neutral" }: KpiCardProps) {
  return (
    <article className="flex flex-col rounded-[12px] border border-[#e8e5e1] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04),0_4px_12px_rgba(15,23,42,0.04)]">
      {icon ? (
        <div
          className={cn(
            "mb-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]",
            iconBgMap[tone],
          )}
        >
          {icon}
        </div>
      ) : null}
      <p className="text-[2rem] font-semibold leading-none tracking-[-0.04em] text-slate-950">
        {value}
      </p>
      <p className="mt-2 text-[13px] font-semibold text-slate-700">{title}</p>
      {description ? (
        <p className="mt-0.5 text-[12px] leading-4 text-slate-400">{description}</p>
      ) : null}
    </article>
  );
}
