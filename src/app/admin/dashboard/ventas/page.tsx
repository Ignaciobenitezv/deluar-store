import type { Metadata } from "next";
import { ChartCard } from "@/features/admin/dashboard/components/chart-card";
import { DashboardRevenueChart } from "@/features/admin/dashboard/components/charts/dashboard-revenue-chart";
import { DashboardSubpageShell } from "@/features/admin/dashboard/components/dashboard-subpage-shell";
import { EmptyState } from "@/features/admin/dashboard/components/empty-state";
import { KpiCard } from "@/features/admin/dashboard/components/kpi-card";
import {
  DASHBOARD_PERIODS,
  getDashboardMetrics,
  normalizeDashboardPeriodValue,
} from "@/features/admin/dashboard/server/dashboard-service";
import {
  formatDashboardDateTime,
  formatDashboardNumber,
  formatDashboardPercent,
  formatDashboardPrice,
  formatDashboardShortDate,
} from "@/features/admin/dashboard/lib/dashboard-formatters";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ventas | DELUAR",
};

type AdminDashboardSalesPageProps = {
  searchParams?: Promise<{ period?: string }>;
};

function IconRevenue() {
  return (
    <svg viewBox="0 0 22 22" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8.5" />
      <path d="M11 6v10M8.5 8.5c0-1.1 1.1-1.7 2.5-1.7s2.5.7 2.5 1.8c0 2.7-5 2.2-5 5.2 0 1.5 1.5 2 3 2s2.5-.7 2.5-2" />
    </svg>
  );
}
function IconOrders() {
  return (
    <svg viewBox="0 0 22 22" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7.5 9V7.5A3.5 3.5 0 0 1 11 4a3.5 3.5 0 0 1 3.5 3.5V9" />
      <path d="M4 9h14L16.5 18H5.5L4 9Z" />
    </svg>
  );
}
function IconTicket() {
  return (
    <svg viewBox="0 0 22 22" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4.5" width="14" height="13" rx="2.5" />
      <path d="M8 10h6M8 13.5h4" />
    </svg>
  );
}
function IconUnits() {
  return (
    <svg viewBox="0 0 22 22" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 3.5L3.5 7.5v7L11 18.5l7.5-4v-7L11 3.5Z" />
      <path d="M11 3.5v15M3.5 7.5l7.5 4 7.5-4" />
    </svg>
  );
}

export default async function AdminDashboardSalesPage({ searchParams }: AdminDashboardSalesPageProps) {
  const resolvedSearchParams = await searchParams;
  const period = normalizeDashboardPeriodValue(resolvedSearchParams?.period);
  const metrics = await getDashboardMetrics(period);
  const lastUpdated = formatDashboardDateTime(new Date());

  const bestDays = [...metrics.sales.daily]
    .filter((item) => item.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 7);

  const daysWithSales = metrics.sales.daily.filter((d) => d.revenue > 0).length;

  const orderStatusRows = [
    { label: "Pedidos creados", value: formatDashboardNumber(metrics.conversion.checkoutOrders), color: "bg-slate-300" },
    { label: "Pagados / aprobados", value: formatDashboardNumber(metrics.conversion.paidOrders), color: "bg-emerald-400" },
    { label: "Pendientes", value: formatDashboardNumber(metrics.conversion.pendingOrders), color: "bg-amber-400" },
    { label: "Fallidos / cancelados", value: formatDashboardNumber(metrics.conversion.failedOrders + metrics.conversion.cancelledOrders), color: "bg-rose-400" },
  ];

  const periodLabel = DASHBOARD_PERIODS[period].label;

  return (
    <DashboardSubpageShell
      sectionLabel="Ventas"
      title="Ventas"
      subtitle={`Facturación basada en órdenes reales. Período activo: ${periodLabel}.`}
      lastUpdated={lastUpdated}
    >
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard
          title="Facturación"
          value={formatDashboardPrice(metrics.summary.billingTotal)}
          description="Solo órdenes pagadas o aprobadas."
          icon={<IconRevenue />}
          tone="success"
        />
        <KpiCard
          title="Pedidos pagados"
          value={formatDashboardNumber(metrics.summary.paidOrders)}
          description="Órdenes incluidas en la facturación."
          icon={<IconOrders />}
          tone="accent"
        />
        <KpiCard
          title="Ticket promedio"
          value={formatDashboardPrice(metrics.summary.averageTicket)}
          description="Promedio sobre órdenes pagadas."
          icon={<IconTicket />}
          tone="warning"
        />
        <KpiCard
          title="Unidades vendidas"
          value={formatDashboardNumber(metrics.summary.unitsSold)}
          description="Unidades ligadas a órdenes pagadas."
          icon={<IconUnits />}
          tone="neutral"
        />
      </div>

      {/* Main analytics row */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_0.45fr]">
        <ChartCard
          title="Evolución de ventas"
          description={`Facturación diaria — ${periodLabel}.`}
        >
          <DashboardRevenueChart data={metrics.sales.daily} />
        </ChartCard>

        {/* Period summary */}
        <ChartCard title="Resumen del período" description={periodLabel}>
          <div className="space-y-0">
            {[
              { label: "Facturación total", value: formatDashboardPrice(metrics.summary.billingTotal) },
              { label: "Ticket promedio", value: formatDashboardPrice(metrics.summary.averageTicket) },
              { label: "Pedidos pagados", value: formatDashboardNumber(metrics.summary.paidOrders) },
              { label: "Unidades vendidas", value: formatDashboardNumber(metrics.summary.unitsSold) },
              { label: "Días con ventas", value: `${formatDashboardNumber(daysWithSales)} días` },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 last:border-0">
                <p className="text-[13px] text-slate-500">{row.label}</p>
                <p className="text-[13px] font-semibold text-slate-900">{row.value}</p>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Lower 3-col */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Estado de órdenes */}
        <ChartCard title="Estado de órdenes" description="Ciclo de vida de los pedidos del período.">
          {orderStatusRows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 last:border-0">
              <div className="flex items-center gap-2.5">
                <span className={`h-2 w-2 shrink-0 rounded-full ${row.color}`} />
                <p className="text-[13px] text-slate-600">{row.label}</p>
              </div>
              <p className="text-[13px] font-semibold text-slate-900">{row.value}</p>
            </div>
          ))}
          <div className="mt-3 border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[12px] text-slate-400">Tasa de pago</p>
              <p className="text-[12px] font-semibold text-slate-700">
                {metrics.conversion.checkoutOrders > 0
                  ? formatDashboardPercent((metrics.conversion.paidOrders / metrics.conversion.checkoutOrders) * 100)
                  : "—"}
              </p>
            </div>
          </div>
        </ChartCard>

        {/* Mejores días */}
        <ChartCard title="Mejores días de venta" description="Ordenados por facturación del período.">
          {bestDays.length > 0 ? (
            <div>
              {bestDays.slice(0, 6).map((day) => (
                <div key={day.date} className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 last:border-0">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-slate-800">{formatDashboardShortDate(day.date)}</p>
                    <p className="text-[11px] text-slate-400">{formatDashboardNumber(day.paidOrders)} pedidos</p>
                  </div>
                  <p className="shrink-0 text-[13px] font-semibold text-slate-900">
                    {formatDashboardPrice(day.revenue)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Sin ventas en el período" description="No hay días con facturación registrada." />
          )}
        </ChartCard>

        {/* Conversión de ventas */}
        <ChartCard title="Conversión de ventas" description="Del checkout a la compra completada.">
          <div className="space-y-0">
            {[
              { label: "Órdenes creadas", value: formatDashboardNumber(metrics.conversion.checkoutOrders) },
              { label: "Compras completadas", value: formatDashboardNumber(metrics.conversion.paidOrders) },
              { label: "Pendientes de pago", value: formatDashboardNumber(metrics.conversion.pendingOrders) },
              { label: "Canceladas / fallidas", value: formatDashboardNumber(metrics.conversion.failedOrders + metrics.conversion.cancelledOrders) },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 last:border-0">
                <p className="text-[13px] text-slate-500">{row.label}</p>
                <p className="text-[13px] font-semibold text-slate-900">{row.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-[8px] bg-[#f6f3ef] px-3 py-2.5">
            <p className="text-[11px] text-slate-500">Tasa de conversión de pago</p>
            <p className="mt-1 text-[1.25rem] font-semibold tracking-[-0.03em] text-slate-900">
              {metrics.conversion.checkoutOrders > 0
                ? formatDashboardPercent((metrics.conversion.paidOrders / metrics.conversion.checkoutOrders) * 100)
                : "—"}
            </p>
          </div>
        </ChartCard>
      </div>
    </DashboardSubpageShell>
  );
}
