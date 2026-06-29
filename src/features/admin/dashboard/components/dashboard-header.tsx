import { DateRangeFilter } from "./date-range-filter";
import { dashboardUi } from "../lib/dashboard-ui";

type DashboardHeaderProps = {
  viewTitle: string;
  subtitle?: string;
  lastUpdated?: string;
  showDateRangeFilter?: boolean;
};

export function DashboardHeader({
  viewTitle,
  subtitle,
  lastUpdated,
  showDateRangeFilter = true,
}: DashboardHeaderProps) {
  return (
    <header className="rounded-[28px] border border-slate-200/70 bg-white px-5 py-5 shadow-[0_12px_28px_rgba(15,23,42,0.04)] lg:px-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <p className={dashboardUi.mutedLabel}>DOTCOM Commerce Dashboard</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
              Vista
            </span>
            <span className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
              ecommerce analytics
            </span>
          </div>
          <h1 className="mt-4 text-[2rem] font-semibold tracking-[-0.05em] text-slate-950 sm:text-[2.35rem]">
            {viewTitle}
          </h1>
          {subtitle ? (
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500 sm:text-base">
              {subtitle}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 lg:items-end">
          {showDateRangeFilter ? <DateRangeFilter /> : null}
          <div className="rounded-[18px] border border-slate-200/70 bg-slate-50 px-4 py-3 text-xs text-slate-500">
            <p className="uppercase tracking-[0.18em]">Última actualización</p>
            <p className="mt-1 font-medium text-slate-900">{lastUpdated ?? "En tiempo real"}</p>
          </div>
        </div>
      </div>
    </header>
  );
}

