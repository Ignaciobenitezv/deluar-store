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
    <header className="rounded-[24px] border border-slate-200/70 bg-white px-4 py-3 shadow-[0_12px_28px_rgba(15,23,42,0.04)] sm:rounded-[28px] sm:px-5 sm:py-5 lg:px-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 max-w-3xl">
          <p className={`${dashboardUi.mutedLabel} hidden sm:block`}>DOTCOM Commerce Dashboard</p>
          <div className="hidden items-center gap-2 sm:mt-2 sm:flex">
            <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
              Vista
            </span>
            <span className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
              ecommerce analytics
            </span>
          </div>
          <h1 className="text-[1.45rem] font-semibold tracking-[-0.05em] text-slate-950 sm:mt-4 sm:text-[2.35rem]">
            {viewTitle}
          </h1>
          {subtitle ? (
            <p className="mt-1 max-w-2xl text-[12px] leading-5 text-slate-500 sm:mt-3 sm:text-base sm:leading-7">
              {subtitle}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 lg:items-end">
          {showDateRangeFilter ? <DateRangeFilter /> : null}
          <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500 sm:hidden">
            Última actualización {lastUpdated ?? "en tiempo real"}
          </p>
          <div className="hidden rounded-[18px] border border-slate-200/70 bg-slate-50 px-4 py-3 text-xs text-slate-500 sm:block">
            <p className="uppercase tracking-[0.18em]">Última actualización</p>
            <p className="mt-1 font-medium text-slate-900">{lastUpdated ?? "En tiempo real"}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
