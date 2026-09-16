import { cn } from "@/lib/utils";
import { DateRangeFilter } from "./date-range-filter";

type DashboardHeaderProps = {
  viewTitle: string;
  subtitle?: string;
  lastUpdated?: string;
  showDateRangeFilter?: boolean;
  compactMobile?: boolean;
};

export function DashboardHeader({
  viewTitle,
  subtitle,
  lastUpdated,
  showDateRangeFilter = true,
  compactMobile = false,
}: DashboardHeaderProps) {
  return (
    <header className={cn("pb-4 sm:pb-5", compactMobile && "pb-3 sm:pb-4")}>
      <div
        className={cn(
          "flex flex-col gap-2 xl:flex-row xl:items-end xl:justify-between",
          compactMobile && "gap-1.5",
        )}
      >
        <div className="min-w-0">
          <h1
            className={cn(
              "font-semibold tracking-[-0.015em] text-text-primary",
              compactMobile ? "text-[1.25rem] sm:text-[1.5rem]" : "text-[1.375rem] sm:text-[1.625rem]",
            )}
          >
            {viewTitle}
          </h1>
          {lastUpdated ? <p className="mt-1 text-[11px] text-text-secondary">{lastUpdated}</p> : null}
          {subtitle ? (
            <p className="mt-1.5 max-w-xl text-[12.5px] leading-5 text-text-secondary">{subtitle}</p>
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
