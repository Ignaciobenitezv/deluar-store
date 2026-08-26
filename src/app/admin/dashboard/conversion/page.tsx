import type { Metadata } from "next";
import { ChartCard } from "@/features/admin/dashboard/components/chart-card";
import { DashboardShell } from "@/features/admin/dashboard/components/dashboard-shell";
import { EmptyState } from "@/features/admin/dashboard/components/empty-state";
import { KpiCard } from "@/features/admin/dashboard/components/kpi-card";
import { StatBadge } from "@/features/admin/dashboard/components/stat-badge";
import { ConversionAbandonmentComparison } from "@/features/admin/dashboard/components/charts/conversion-abandonment-comparison";
import { ConversionFunnelChart } from "@/features/admin/dashboard/components/charts/conversion-funnel-chart";
import { ConversionTimelineChart } from "@/features/admin/dashboard/components/charts/conversion-timeline-chart";
import {
  formatDashboardDateTime,
  formatDashboardNumber,
  formatDashboardPercent,
  formatDashboardPrice,
} from "@/features/admin/dashboard/lib/dashboard-formatters";
import {
  DASHBOARD_PERIODS,
  normalizeDashboardPeriodValue,
} from "@/features/admin/dashboard/server/dashboard-service";
import { getConversionAnalyticsMetrics } from "@/features/admin/analytics/server/conversion-analytics-service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Conversión | Panel de comercio de DOTCOM",
};

type AdminDashboardConversionPageProps = {
  searchParams?: Promise<{
    period?: string;
  }>;
};

export default async function AdminDashboardConversionPage({
  searchParams,
}: AdminDashboardConversionPageProps) {
  const resolvedSearchParams = await searchParams;
  const period = normalizeDashboardPeriodValue(resolvedSearchParams?.period);
  const metrics = await getConversionAnalyticsMetrics(period);
  const lastUpdated = formatDashboardDateTime(new Date());

  return (
    <DashboardShell
      title="Conversión"
      subtitle={`Visión ejecutiva del funnel, abandono y pagos reales. Período activo: ${DASHBOARD_PERIODS[period].label}.`}
      lastUpdated={lastUpdated}
    >
      <section className="grid gap-3 min-[420px]:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <KpiCard
          title="Sesiones"
          value={formatDashboardNumber(metrics.summary.sessions)}
          description="Sesiones iniciadas dentro del período."
          tone="neutral"
        />
        <KpiCard
          title="Visitantes únicos"
          value={formatDashboardNumber(metrics.summary.uniqueVisitors)}
          description="visitorId únicos de las sesiones del período."
          tone="accent"
        />
        <KpiCard
          title="Compras"
          value={formatDashboardNumber(metrics.summary.purchases)}
          description="PURCHASE_COMPLETED deduplicado por orderId."
          tone="success"
        />
        <KpiCard
          title="Tasa de conversión"
          value={formatDashboardPercent(metrics.summary.conversionRate)}
          description="Sesiones con compra sobre sesiones totales."
          tone="warning"
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.95fr)]">
        <ChartCard
          title="Funnel principal"
          description="Sesiones únicas para navegación y órdenes únicas para etapas de cierre."
          className="min-w-0"
        >
          <ConversionFunnelChart data={metrics.funnel} />
        </ChartCard>

        <div className="grid gap-4">
          <ChartCard
            title="Actividad y abandono"
            description="Sesiones únicas que avanzaron y carritos efectivamente abandonados."
            className="min-w-0"
            emptyState={
              metrics.activity.addToCartSessions === 0 &&
              metrics.activity.checkoutStartedSessions === 0 &&
              metrics.abandonment.cart.count === 0 &&
              metrics.abandonment.checkout.count === 0 ? (
                <EmptyState
                  title="Sin actividad registrada"
                  description="Cuando existan sesiones con carrito o checkout, aparecerán aquí."
                />
              ) : undefined
            }
          >
            <div className="grid gap-2 sm:grid-cols-2">
              <StatBadge
                label="Agregaron al carrito"
                value={formatDashboardNumber(metrics.activity.addToCartSessions)}
                tone="neutral"
              />
              <StatBadge
                label="Iniciaron checkout"
                value={formatDashboardNumber(metrics.activity.checkoutStartedSessions)}
                tone="neutral"
              />
              <StatBadge
                label="Carritos abandonados"
                value={formatDashboardNumber(metrics.activity.cartAbandoned)}
                tone="failed"
              />
              <StatBadge
                label="Checkouts abandonados"
                value={formatDashboardNumber(metrics.activity.checkoutAbandoned)}
                tone="warning"
              />
            </div>
            <div className="mt-4">
              <ConversionAbandonmentComparison data={[metrics.abandonment.cart, metrics.abandonment.checkout]} />
            </div>
          </ChartCard>

          <ChartCard
            title="Conversión de pago"
            description="Lectura operativa de órdenes creadas, completadas y estados abiertos."
            className="min-w-0"
          >
            <div className="grid gap-2 min-[420px]:grid-cols-2 xl:grid-cols-3">
              <StatBadge
                label="Órdenes creadas"
                value={formatDashboardNumber(metrics.payment.ordersCreated)}
                tone="neutral"
              />
              <StatBadge
                label="Compras completadas"
                value={formatDashboardNumber(metrics.payment.purchasesCompleted)}
                tone="approved"
              />
              <StatBadge label="Pendientes" value={formatDashboardNumber(metrics.payment.pendingOrders)} tone="warning" />
              <StatBadge label="Fallidas" value={formatDashboardNumber(metrics.payment.failedOrders)} tone="failed" />
              <StatBadge label="Canceladas" value={formatDashboardNumber(metrics.payment.cancelledOrders)} tone="cancelled" />
              <StatBadge label="Expiradas" value={formatDashboardNumber(metrics.payment.expiredOrders)} tone="neutral" />
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <div className="rounded-[16px] border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700">Facturación</p>
                <p className="mt-1 text-sm font-semibold text-emerald-950">
                  {formatDashboardPrice(metrics.payment.billingTotal)}
                </p>
              </div>
              <div className="rounded-[16px] border border-sky-200 bg-sky-50 px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-700">
                  Payment completion rate
                </p>
                <p className="mt-1 text-sm font-semibold text-sky-950">
                  {formatDashboardPercent(metrics.payment.completionRate)}
                </p>
              </div>
            </div>
          </ChartCard>

          <ChartCard
            title="Snapshots actuales"
            description="Estado actual del carrito, independiente del período."
            className="min-w-0"
          >
            <div className="grid gap-2 sm:grid-cols-2">
              <StatBadge
                label="Carritos activos ahora"
                value={formatDashboardNumber(metrics.snapshots.activeCarts)}
                tone="neutral"
              />
              <StatBadge
                label="Checkouts abiertos ahora"
                value={formatDashboardNumber(metrics.snapshots.openCheckouts)}
                tone="neutral"
              />
            </div>
          </ChartCard>
        </div>
      </div>

      <ChartCard
        title="Conversión en el tiempo"
        description="Serie diaria de sesiones, add to cart, checkout y compras reales."
        className="min-w-0"
      >
        <ConversionTimelineChart data={metrics.timeline} />
      </ChartCard>
    </DashboardShell>
  );
}
