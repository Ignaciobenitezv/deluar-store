import { DateRangeFilter } from "./date-range-filter";

type DashboardSubpageShellProps = {
  sectionLabel: string;
  title: string;
  subtitle?: string;
  lastUpdated?: string;
  children: React.ReactNode;
};

export function DashboardSubpageShell({
  sectionLabel,
  title,
  subtitle,
  lastUpdated,
  children,
}: DashboardSubpageShellProps) {
  return (
    <div className="px-3 py-4 sm:px-4 lg:px-6 lg:py-6">
      <div className="mx-auto max-w-[1480px] space-y-4">
        <div className="flex flex-col gap-2 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-secondary">
              Estadísticas / {sectionLabel}
            </p>
            <h1 className="mt-1.5 text-[1.375rem] font-semibold tracking-[-0.015em] text-text-primary sm:text-[1.625rem]">
              {title}
            </h1>
            {lastUpdated ? <p className="mt-1 text-[11px] text-text-secondary">{lastUpdated}</p> : null}
            {subtitle ? <p className="mt-1.5 max-w-2xl text-[12.5px] leading-5 text-text-secondary">{subtitle}</p> : null}
          </div>
          <div className="shrink-0">
            <DateRangeFilter />
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
