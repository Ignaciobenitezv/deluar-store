import type { Metadata } from "next";
import { ChartCard } from "@/features/admin/dashboard/components/chart-card";
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
  title: "Ventas | DOTCOM Commerce Dashboard",
};

type AdminDashboardSalesPageProps = {
  searchParams?: Promise<{
    period?: string;
  }>;
};

function formatTicket(value: number) {
  return formatDashboardPrice(value);
}

function barWidth(value: number, max: number) {
  if (max <= 0) {
    return "8%";
  }

  return `${Math.max(8, (value / max) * 100)}%`;
}

export default async function AdminDashboardSalesPage({ searchParams }: AdminDashboardSalesPageProps) {
  const resolvedSearchParams = await searchParams;
  const period = normalizeDashboardPeriodValue(resolvedSearchParams?.period);
  const metrics = await getDashboardMetrics(period);
  const lastUpdated = formatDashboardDateTime(new Date());

  const dailySeries = metrics.sales.daily.slice(-7);
  const activeDailySeries = dailySeries.filter(
    (item) => item.revenue > 0 || item.paidOrders > 0 || item.unitsSold > 0,
  );
  const mobileDailySeries = (activeDailySeries.length > 0 ? activeDailySeries : dailySeries).slice(0, 3);
  const hiddenMobileDays = Math.max(0, dailySeries.length - mobileDailySeries.length);
  const maxRevenue = Math.max(...dailySeries.map((item) => item.revenue), 1);
  const maxOrders = Math.max(...dailySeries.map((item) => item.paidOrders), 1);
  const maxUnits = Math.max(...dailySeries.map((item) => item.unitsSold), 1);
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
      subtitle={`Vista comercial de ventas basada en órdenes reales. Período activo: ${DASHBOARD_PERIODS[period].label}.`}
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
          value={formatTicket(metrics.summary.averageTicket)}
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
          description="Últimos 7 días visibles. En mobile se muestra un resumen compacto."
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
              <span className="sm:hidden">{mobileDailySeries.length} días visibles</span>
              <span className="hidden sm:inline">
                Mostrando {dailySeries.length} de {metrics.sales.daily.length} días
              </span>
              <span>Facturación, pedidos y unidades</span>
            </div>

            <div className="space-y-2 sm:hidden">
              {mobileDailySeries.map((item) => (
                <div key={item.date} className="rounded-[16px] border border-slate-200/70 bg-white px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900">{formatDashboardShortDate(item.date)}</p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {formatDashboardNumber(item.paidOrders)} pedidos · {formatDashboardNumber(item.unitsSold)} uds.
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-slate-950">
                      {formatDashboardPrice(item.revenue)}
                    </p>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-sky-400" style={{ width: barWidth(item.revenue, maxRevenue) }} />
                  </div>
                </div>
              ))}
              {hiddenMobileDays > 0 ? (
                <p className="px-1 text-xs text-slate-500">Ver detalle en desktop · +{hiddenMobileDays} días más</p>
              ) : null}
            </div>

            <div className="hidden space-y-3 sm:block">
              {dailySeries.map((item) => (
                <div key={item.date} className="rounded-[18px] border border-slate-200/70 bg-white px-4 py-4 transition-colors hover:bg-slate-50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900">{formatDashboardShortDate(item.date)}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatDashboardNumber(item.paidOrders)} pedidos · {formatDashboardNumber(item.unitsSold)} uds.
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-slate-950">{formatDashboardPrice(item.revenue)}</p>
                  </div>

                  <div className="mt-4 grid gap-2">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-slate-400">
                        <span>Facturación</span>
                        <span>{formatDashboardPrice(item.revenue)}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-sky-400" style={{ width: barWidth(item.revenue, maxRevenue) }} />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-slate-400">
                        <span>Pedidos</span>
                        <span>{formatDashboardNumber(item.paidOrders)}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-emerald-400" style={{ width: barWidth(item.paidOrders, maxOrders) }} />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-slate-400">
                        <span>Unidades</span>
                        <span>{formatDashboardNumber(item.unitsSold)}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-amber-400" style={{ width: barWidth(item.unitsSold, maxUnits) }} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {metrics.sales.daily.length > dailySeries.length ? (
                <p className="text-xs text-slate-500">
                  Resumen compacto. El resto del período se prioriza en vistas específicas.
                </p>
              ) : null}
            </div>
          </div>
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
        <ChartCard title="Estado de ventas" description="Lectura rápida del estado comercial del período.">
          <div className="grid gap-3 min-[420px]:grid-cols-2">
            {salesStateBadges.map((item) => (
              <StatBadge key={item.label} label={item.label} value={item.value} tone={item.tone} />
            ))}
          </div>
        </ChartCard>

        <ChartCard
          title="Ticket promedio"
          description="El ticket promedio se calcula sobre órdenes pagadas del período."
          emptyState={
            metrics.summary.paidOrders === 0 ? (
              <EmptyState
                title="Sin ticket promedio"
                description="No hay órdenes pagadas en el período seleccionado."
              />
            ) : undefined
          }
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
                <p className="text-sm font-medium text-slate-900">Cómo se interpreta</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Se divide la facturación aprobada entre las órdenes pagadas del período.
                </p>
                <p className="mt-4 text-xs uppercase tracking-[0.18em] text-slate-500">
                  Período activo: {DASHBOARD_PERIODS[period].label}
                </p>
              </div>
            </div>
          ) : null}
        </ChartCard>
      </div>
    </DashboardShell>
  );
}
