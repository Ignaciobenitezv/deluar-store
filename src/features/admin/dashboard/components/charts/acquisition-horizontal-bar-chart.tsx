"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { dashboardChartColors } from "./dashboard-chart-colors";
import { DashboardChartEmpty } from "./dashboard-chart-empty";
import { useElementWidth } from "./use-element-width";

export type AcquisitionBarChartPoint = {
  id: string;
  label: string;
  subtitle?: string;
  value: number;
};

export type AcquisitionMetricFormat = "number" | "currency" | "percentage";

type AcquisitionHorizontalBarChartProps = {
  data: AcquisitionBarChartPoint[];
  metricLabel: string;
  metricFormat?: AcquisitionMetricFormat;
  color?: string;
  emptyTitle?: string;
  emptyDescription?: string;
};

function truncateLabel(value: string, maxLength = 28) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1)}...`;
}

export function AcquisitionHorizontalBarChart({
  data,
  metricLabel,
  metricFormat = "number",
  color = dashboardChartColors.navy,
  emptyTitle,
  emptyDescription,
}: AcquisitionHorizontalBarChartProps) {
  const numberFormatter = new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 0,
  });
  const currencyFormatter = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });
  const percentFormatter = new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 1,
  });
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const visibleData = [...data]
    .filter((item) => item.value > 0)
    .sort((left, right) => right.value - left.value || left.label.localeCompare(right.label))
    .slice(0, 10);
  const totalValue = visibleData.reduce((accumulator, item) => accumulator + item.value, 0);
  const yAxisWidth = width < 420 ? 120 : width < 560 ? 140 : width < 720 ? 164 : 196;
  const chartMargin =
    width < 420
      ? { top: 12, right: 10, bottom: 12, left: 8 }
      : width < 560
        ? { top: 12, right: 12, bottom: 12, left: 10 }
        : width < 720
          ? { top: 12, right: 16, bottom: 12, left: 12 }
          : { top: 12, right: 24, bottom: 12, left: 14 };
  const labelPosition = width < 560 ? "insideRight" : "right";
  const labelFill = width < 560 ? "#ffffff" : "#334155";
  const tickLabelLength = width < 560 ? 18 : width < 720 ? 24 : 30;

  function formatMetric(value: number) {
    const safeValue = Number.isFinite(value) ? value : 0;

    switch (metricFormat) {
      case "currency":
        return currencyFormatter.format(safeValue);
      case "percentage":
        return `${percentFormatter.format(safeValue)}%`;
      case "number":
      default:
        return numberFormatter.format(safeValue);
    }
  }

  if (visibleData.length === 0) {
    return (
      <DashboardChartEmpty
        title={emptyTitle ?? "No hay datos para este periodo."}
        description={emptyDescription ?? "Cuando haya actividad, el grafico aparecera aqui."}
        compact
      />
    );
  }

  return (
    <div ref={ref} className="space-y-4 min-w-0">
      <div className="rounded-[16px] border border-slate-200/70 bg-slate-50 px-3 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{metricLabel}</p>
        <p className="mt-1 text-sm font-semibold text-slate-950">{formatMetric(totalValue)}</p>
      </div>

      <div className="h-[340px] w-full min-w-0 overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={visibleData} layout="vertical" margin={chartMargin}>
            <CartesianGrid stroke={dashboardChartColors.grid} strokeDasharray="4 4" horizontal={false} />
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#64748b", fontSize: 12 }}
              tickFormatter={(value) => formatMetric(Number(value))}
            />
            <YAxis
              type="category"
              dataKey="label"
              tickLine={false}
              axisLine={false}
              width={yAxisWidth}
              tick={{ fill: "#64748b", fontSize: 11 }}
              tickFormatter={(value) => truncateLabel(String(value), tickLabelLength)}
            />
            <Tooltip
              content={({ active, payload }) => {
                const point = payload?.[0]?.payload as AcquisitionBarChartPoint | undefined;

                if (!active || !point) {
                  return null;
                }

                return (
                  <div className="rounded-[16px] border border-slate-200/80 bg-white px-3 py-2.5 shadow-[0_14px_28px_rgba(15,23,42,0.08)]">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{point.label}</p>
                    {point.subtitle ? <p className="mt-1 text-xs text-slate-500">{point.subtitle}</p> : null}
                    <div className="mt-2 flex items-center justify-between gap-4 text-sm">
                      <span className="text-slate-700">{metricLabel}</span>
                      <span className="font-semibold text-slate-950">{formatMetric(point.value)}</span>
                    </div>
                  </div>
                );
              }}
            />
            <Bar dataKey="value" radius={[0, 999, 999, 0]} barSize={18}>
              {visibleData.map((entry) => (
                <Cell key={entry.id} fill={color} />
              ))}
              <LabelList
                dataKey="value"
                position={labelPosition}
                formatter={(value: unknown) => formatMetric(Number(value))}
                fill={labelFill}
                fontSize={width < 560 ? 11 : 12}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
