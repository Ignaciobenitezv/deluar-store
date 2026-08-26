import type { ConversionFunnelStage } from "@/features/admin/analytics/server/conversion-analytics-service";
import { formatDashboardNumber, formatDashboardPercent } from "../../lib/dashboard-formatters";
import { dashboardChartColors } from "./dashboard-chart-colors";
import { DashboardChartEmpty } from "./dashboard-chart-empty";

type ConversionFunnelChartProps = {
  data: ConversionFunnelStage[];
};

const stageColors = [
  dashboardChartColors.navy,
  dashboardChartColors.sky,
  dashboardChartColors.emerald,
  dashboardChartColors.amber,
  dashboardChartColors.rose,
  dashboardChartColors.slate,
];

function stageAccent(index: number) {
  return stageColors[index] ? dashboardChartColors.slate : dashboardChartColors.navy;
}

export function ConversionFunnelChart({ data }: ConversionFunnelChartProps) {
  const visibleData = data.filter((stage) => stage.count > 0 || stage.key === "sessions");

  if (visibleData.length === 0 || visibleData[0]?.count === 0) {
    return (
      <DashboardChartEmpty
        title="No hay sesiones para construir el funnel."
        description="Cuando el tráfico empiece a entrar, esta vista mostrará el avance por etapas."
        compact
      />
    );
  }

  return (
    <div className="space-y-3">
      {visibleData.map((stage, index) => {
        const accent = stageAccent(index);
        const width = index === 0 ? 100 : Math.max(0, stage.shareOfSessions);
        const isBaseStage = index === 0;

        return (
          <div key={stage.key} className="rounded-[18px] border border-slate-200/70 bg-slate-50 px-4 py-3 sm:px-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold tracking-[-0.02em] text-slate-950">{stage.label}</p>
                  <span
                    className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white"
                    style={{ backgroundColor: accent }}
                  >
                    {stage.kind === "session" ? "Sesiones" : "Órdenes"}
                  </span>
                </div>
                <p className="mt-1 text-[13px] leading-5 text-slate-500">
                  {isBaseStage ? "Base del embudo" : `Caída vs etapa anterior: ${formatDashboardPercent(stage.dropOffFromPrevious)}`}
                </p>
              </div>

              <div className="shrink-0 text-left sm:text-right">
                <p className="text-lg font-semibold tracking-[-0.04em] text-slate-950 sm:text-[1.15rem]">
                  {formatDashboardNumber(stage.count)}
                </p>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {formatDashboardPercent(stage.shareOfSessions)} del total
                </p>
              </div>
            </div>

            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.max(0, Math.min(width, 100))}%`, backgroundColor: accent }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
