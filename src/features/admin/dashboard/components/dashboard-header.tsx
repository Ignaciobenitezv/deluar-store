import { cn } from "@/lib/utils";
import { DateRangeFilter } from "./date-range-filter";
import { dashboardUi } from "../lib/dashboard-ui";

type DashboardHeaderProps = {
  viewTitle: string;
  subtitle?: string;
  lastUpdated?: string;
  eyebrow?: string;
  showDateRangeFilter?: boolean;
  showLogoutButton?: boolean;
  compactMobile?: boolean;
};

export function DashboardHeader({
  viewTitle,
  subtitle,
  lastUpdated,
  eyebrow = "DELUAR",
  showDateRangeFilter = true,
  showLogoutButton = true,
  compactMobile = false,
}: DashboardHeaderProps) {
  return (
    <header className={cn("pb-6 sm:pb-8", compactMobile && "pb-4 sm:pb-6")}>
      <div
        className={cn(
          "flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between",
          compactMobile && "gap-2",
        )}
      >
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#9d7d62]">
            {eyebrow}
          </p>
          <h1
            className={cn(
              "mt-2 font-semibold tracking-[-0.05em] text-slate-950",
              compactMobile
                ? "text-[1.75rem] sm:text-[2.25rem]"
                : "text-[2.25rem] sm:text-[2.75rem]",
            )}
          >
            {viewTitle}
          </h1>
          {lastUpdated ? (
            <p className="mt-1.5 text-[11px] text-slate-400">{lastUpdated}</p>
          ) : null}
          {subtitle ? (
            <p className="mt-2 max-w-xl text-[13px] leading-5 text-slate-500 sm:text-sm sm:leading-6">
              {subtitle}
            </p>
          ) : null}
        </div>

        {showDateRangeFilter ? (
          <div className="shrink-0">
            <DateRangeFilter compactMobile={compactMobile} />
          </div>
        ) : null}
      </div>
    </header>
  );
}
