import { DashboardChartEmpty } from "./dashboard-chart-empty";
import { dashboardChartColors } from "./dashboard-chart-colors";
import { formatDashboardNumber, formatDashboardPercent, formatDashboardPrice } from "../../lib/dashboard-formatters";
import type { ConversionAbandonmentSeries } from "@/features/admin/analytics/server/conversion-analytics-service";

type ConversionAbandonmentComparisonProps = {
  data: [ConversionAbandonmentSeries, ConversionAbandonmentSeries];
};

function metricWidth(value: number, maxValue: number) {
  if (value <= 0 || maxValue <= 0) {
    return 0;
  }

  return Math.max(8, (value / maxValue) * 100);
}

function AbandonmentRow({
  item,
  maxCount,
  maxValue,
  countColor,
  valueColor,
}: {
  item: ConversionAbandonmentSeries;
  maxCount: number;
  maxValue: number;
  countColor: string;
  valueColor: string;
}) {
  const countShare = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
  const valueShare = maxValue > 0 ? (item.value / maxValue) * 100 : 0;

  return (
    <div className="rounded-[18px] border border-slate-200/70 bg-white px-4 py-4 sm:px-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold tracking-[-0.02em] text-slate-950">{item.label}</p>
          <p className="mt-1 text-[13px] leading-5 text-slate-500">Abandonos y valor perdido del período</p>
        </div>
        <div className="shrink-0 text-left sm:text-right">
          <p className="text-lg font-semibold tracking-[-0.04em] text-slate-950">{formatDashboardNumber(item.count)}</p>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{formatDashboardPrice(item.value)}</p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-3 text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-[0.18em]">Cantidad</span>
            <span>{formatDashboardPercent(countShare)}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full" style={{ width: `${metricWidth(item.count, maxCount)}%`, backgroundColor: countColor }} />
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-3 text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-[0.18em]">Valor</span>
            <span>{formatDashboardPercent(valueShare)}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full" style={{ width: `${metricWidth(item.value, maxValue)}%`, backgroundColor: valueColor }} />
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-[14px] border border-slate-200/70 bg-slate-50 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Unidades</p>
            <p className="mt-1 text-sm font-semibold text-slate-950">{formatDashboardNumber(item.units)}</p>
          </div>
          <div className="rounded-[14px] border border-slate-200/70 bg-slate-50 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Ticket promedio</p>
            <p className="mt-1 text-sm font-semibold text-slate-950">{formatDashboardPrice(item.averageTicket)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ConversionAbandonmentComparison({ data }: ConversionAbandonmentComparisonProps) {
  const [cart, checkout] = data;

  if (!cart || !checkout || (cart.count === 0 && checkout.count === 0)) {
    return (
      <DashboardChartEmpty
        compact
        title="Sin actividad suficiente."
        description="Se mostrará cuando haya abandonos."
      />
    );
  }

  const maxCount = Math.max(cart.count, checkout.count, 1);
  const maxValue = Math.max(cart.value, checkout.value, 1);

  return (
    <div className="space-y-3">
      <AbandonmentRow
        item={cart}
        maxCount={maxCount}
        maxValue={maxValue}
        countColor={dashboardChartColors.rose}
        valueColor={dashboardChartColors.amber}
      />
      <AbandonmentRow
        item={checkout}
        maxCount={maxCount}
        maxValue={maxValue}
        countColor={dashboardChartColors.sky}
        valueColor={dashboardChartColors.emerald}
      />
    </div>
  );
}
