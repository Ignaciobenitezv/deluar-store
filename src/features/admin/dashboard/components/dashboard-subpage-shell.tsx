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
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-5 border-b border-slate-200/70 bg-white/95 px-6 shadow-[0_1px_0_rgba(15,23,42,0.06)] backdrop-blur-sm">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[13px]">
            <span className="font-medium text-slate-400">Estadísticas</span>
            <span className="text-slate-300">/</span>
            <span className="font-semibold text-slate-900">{sectionLabel}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {lastUpdated ? (
            <span className="hidden text-[12px] text-slate-400 lg:block">{lastUpdated}</span>
          ) : null}
          <DateRangeFilter topBar />
        </div>
      </header>

      <div className="flex-1 px-6 py-6 lg:px-8">
        <div className="mx-auto max-w-[1480px] space-y-5">
          <div>
            <h1 className="text-[1.75rem] font-semibold leading-none tracking-[-0.04em] text-slate-950">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-1.5 max-w-2xl text-[13px] leading-5 text-slate-500">{subtitle}</p>
            ) : null}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
