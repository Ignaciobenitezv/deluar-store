type DashboardChartEmptyProps = {
  title?: string;
  description?: string;
  compact?: boolean;
};

export function DashboardChartEmpty({
  title = "Sin datos para este período.",
  description = "Los datos se mostrarán acá.",
  compact = false,
}: DashboardChartEmptyProps) {
  return (
    <div
      className={`flex items-center justify-center rounded-[20px] border border-dashed border-slate-200/70 bg-slate-50 px-4 text-center ${
        compact ? "min-h-[140px] sm:min-h-[160px]" : "min-h-[240px] sm:min-h-[260px]"
      }`}
    >
      <div className="max-w-sm">
        <p className="text-sm font-medium text-slate-900">{title}</p>
        <p className="mt-1.5 text-sm leading-6 text-slate-500">{description}</p>
      </div>
    </div>
  );
}
