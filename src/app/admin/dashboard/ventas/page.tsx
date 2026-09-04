import type { Metadata } from "next";
import { ChartCard } from "@/features/admin/dashboard/components/chart-card";
import { DashboardRevenueChart } from "@/features/admin/dashboard/components/charts/dashboard-revenue-chart";
import { DashboardShell } from "@/features/admin/dashboard/components/dashboard-shell";
import { EmptyState } from "@/features/admin/dashboard/components/empty-state";
import { KpiCard } from "@/features/admin/dashboard/components/kpi-card";
import { RankingCard } from "@/features/admin/dashboard/components/ranking-card";
import { StatBadge } from "@/features/admin/dashboard/components/stat-badge";
import {
  DASHBOARD_PERIODS,
  getDashboardMetrics,
  normalizeDashboardPeriodValue,
} from "@/features/admin/dashboard/server/dashboard-service";
import {
  formatDashboardDateTime,
  formatDashboardNumber,
  formatDashboardPrice,
  formatDashboardShortDate,
} from "@/features/admin/dashboard/lib/dashboard-formatters";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ventas | Panel de comercio de DOTCOM",
};

type AdminDashboardSalesPageProps = {
  searchParams?: Promise<{
    period?: string;
  }>;
};

export default async function AdminDashboardSalesPage({ searchParams }: AdminDashboardSalesPageProps) {
  const resolvedSearchParams = await searchParams;
  const period = normalizeDashboardPeriodValue(resolvedSearchParams?.period);
  const metrics = await getDashboardMetrics(period);
  const lastUpdated = formatDashboardDateTime(new Date());

  const bestDays = [...metrics.sales.daily]
    .filter((item) => item.revenue > 0)
    .sort((left, right) => right.revenue - left.revenue)
    .slice(0, 7);

  const salesStateBadges = [
    {
      label: "Pedidos creados",
      value: formatDashboardNumber(metrics.conversion.checkoutOrders),
      tone: "neutral" as const,
    },
    {
      label: "Pedidos pagados",
      value: formatDashboardNumber(metrics.conversion.paidOrders),
      tone: "approved" as const,
    },
    {
      label: "Pendientes",
      value: formatDashboardNumber(metrics.conversion.pendingOrders),
      tone: "warning" as const,
    },
    {
      label: "Fallidos / cancelados",
      value: formatDashboardNumber(metrics.conversion.failedOrders + metrics.conversion.cancelledOrders),
      tone: "failed" as const,
    },
  ];

  return (
    <DashboardShell
      title="Ventas"
      subtitle={`Ventas basadas en órdenes reales. Período activo: ${DASHBOARD_PERIODS[period].label}.`}
      lastUpdated={lastUpdated}
    >
      <section className="grid gap-3 min-[420px]:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <KpiCard
          title="Facturación total"
          value={formatDashboardPrice(metrics.summary.billingTotal)}
          description="Solo órdenes pagadas o aprobadas."
          tone="success"
        />
        <KpiCard
          title="Pedidos pagados"
          value={formatDashboardNumber(metrics.summary.paidOrders)}
          description="Órdenes incluidas en la facturación."
          tone="accent"
        />
        <KpiCard
          title="Ticket promedio"
          value={formatDashboardPrice(metrics.summary.averageTicket)}
          description="Promedio sobre órdenes pagadas del período."
          tone="warning"
        />
        <KpiCard
          title="Unidades vendidas"
          value={formatDashboardNumber(metrics.summary.unitsSold)}
          description="Unidades ligadas a órdenes pagadas."
          tone="neutral"
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <ChartCard
          title="Evolución de ventas"
          description="Evolución del período activo con métricas reales."
        >
          <DashboardRevenueChart data={metrics.sales.daily} />
        </ChartCard>

        <RankingCard
          title="Mejores días de venta"
          description="Ordenados por facturación total."
          items={bestDays.map((item) => ({
            id: item.date,
            title: formatDashboardShortDate(item.date),
            subtitle: `${formatDashboardNumber(item.paidOrders)} pedidos`,
            value: item.revenue,
            secondaryValue: formatDashboardPrice(item.revenue),
            tone: "accent",
          }))}
          valueFormatter={formatDashboardPrice}
          emptyState={
            <EmptyState
              title="Sin ventas para ranking"
              description="No hay días con facturación en el período seleccionado."
            />
          }
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <ChartCard title="Estado de ventas" description="Estado comercial del período.">
          <div className="grid gap-3 min-[420px]:grid-cols-2">
            {salesStateBadges.map((item) => (
              <StatBadge key={item.label} label={item.label} value={item.value} tone={item.tone} />
            ))}
          </div>
        </ChartCard>

        <ChartCard
          title="Ticket promedio"
          description="Ticket promedio de órdenes pagadas."
          emptyState={metrics.summary.paidOrders === 0 ? <EmptyState title="Sin ticket promedio" description="Sin datos para este período." /> : undefined}
        >
          {metrics.summary.paidOrders > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <KpiCard
                title="Ticket promedio"
                value={formatDashboardPrice(metrics.summary.averageTicket)}
                description="Promedio sobre órdenes pagadas."
                tone="success"
              />
              <div className="rounded-[20px] border border-slate-200/70 bg-slate-50 p-5">
                <p className="text-sm font-medium text-slate-900">Cálculo</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">Facturación aprobada dividida por órdenes pagadas.</p>
              </div>
            </div>
          ) : null}
        </ChartCard>
      </div>
    </DashboardShell>
  );
}
