import type { Metadata } from "next";
import { ChartCard } from "@/features/admin/dashboard/components/chart-card";
import { DashboardSubpageShell } from "@/features/admin/dashboard/components/dashboard-subpage-shell";
import { EmptyState } from "@/features/admin/dashboard/components/empty-state";
import { KpiCard } from "@/features/admin/dashboard/components/kpi-card";
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
  title: "Conversión | DELUAR",
};

type AdminDashboardConversionPageProps = {
  searchParams?: Promise<{ period?: string }>;
};

function IconSessions() {
  return (
    <svg viewBox="0 0 22 22" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5h14M4 11h14M4 17h7" />
    </svg>
  );
}
function IconCart() {
  return (
    <svg viewBox="0 0 22 22" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3h2l1.5 9h9.5l1.5-6H7" />
      <circle cx="9" cy="19" r="1.5" /><circle cx="17" cy="19" r="1.5" />
    </svg>
  );
}
function IconPurchases() {
  return (
    <svg viewBox="0 0 22 22" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7.5 9V7.5A3.5 3.5 0 0 1 11 4a3.5 3.5 0 0 1 3.5 3.5V9" />
      <path d="M4 9h14L16.5 18H5.5L4 9Z" />
    </svg>
  );
}
function IconConversionRate() {
  return (
    <svg viewBox="0 0 22 22" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 5.5h16l-5 7v5.5l-6-1.5v-4L3 5.5Z" />
    </svg>
  );
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] border border-[#e8e5e1] bg-[#faf9f7] px-3.5 py-3">
      <p className="text-[11px] font-semibold text-slate-400">{label}</p>
      <p className="mt-1 text-[1rem] font-semibold tracking-[-0.02em] text-slate-900">{value}</p>
    </div>
  );
}

export default async function AdminDashboardConversionPage({ searchParams }: AdminDashboardConversionPageProps) {
  const resolvedSearchParams = await searchParams;
  const period = normalizeDashboardPeriodValue(resolvedSearchParams?.period);
  const metrics = await getConversionAnalyticsMetrics(period);
  const lastUpdated = formatDashboardDateTime(new Date());
  const periodLabel = DASHBOARD_PERIODS[period].label;

  return (
    <DashboardSubpageShell
      sectionLabel="Conversión"
      title="Conversión"
      subtitle={`Funnel, abandono y pagos reales. Período activo: ${periodLabel}.`}
      lastUpdated={lastUpdated}
    >
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard
          title="Sesiones"
          value={formatDashboardNumber(metrics.summary.sessions)}
          description="Sesiones iniciadas en el período."
          icon={<IconSessions />}
          tone="neutral"
        />
        <KpiCard
          title="Add to cart"
          value={formatDashboardNumber(metrics.activity.addToCartSessions)}
          description="Sesiones que agregaron al carrito."
          icon={<IconCart />}
          tone="accent"
        />
        <KpiCard
          title="Compras"
          value={formatDashboardNumber(metrics.summary.purchases)}
          description="Compras completadas en el período."
          icon={<IconPurchases />}
          tone="success"
        />
        <KpiCard
          title="Conversión"
          value={formatDashboardPercent(metrics.summary.conversionRate)}
          description="Sesiones con compra sobre totales."
          icon={<IconConversionRate />}
          tone="warning"
        />
      </div>

      {/* Main analytics row */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_0.52fr]">
        {/* Funnel */}
        <ChartCard
          title="Funnel principal"
          description="Sesiones únicas por etapa del proceso de compra."
        >
          <ConversionFunnelChart data={metrics.funnel} />
        </ChartCard>

        {/* Right column: abandonment + payment conversion */}
        <div className="flex flex-col gap-4">
          {/* Actividad y abandono */}
          <ChartCard
            title="Actividad y abandono"
            description="Sesiones que avanzaron y carritos efectivamente abandonados."
          >
            {metrics.activity.addToCartSessions === 0 &&
            metrics.activity.checkoutStartedSessions === 0 &&
            metrics.abandonment.cart.count === 0 &&
            metrics.abandonment.checkout.count === 0 ? (
              <EmptyState
                title="Sin actividad registrada"
                description="Cuando existan sesiones con carrito o checkout, aparecerán aquí."
              />
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <MetricCell label="Agregaron al carrito" value={formatDashboardNumber(metrics.activity.addToCartSessions)} />
                  <MetricCell label="Iniciaron checkout" value={formatDashboardNumber(metrics.activity.checkoutStartedSessions)} />
                  <MetricCell label="Carritos abandonados" value={formatDashboardNumber(metrics.activity.cartAbandoned)} />
                  <MetricCell label="Checkouts abandonados" value={formatDashboardNumber(metrics.activity.checkoutAbandoned)} />
                </div>
                <div className="mt-4">
                  <ConversionAbandonmentComparison data={[metrics.abandonment.cart, metrics.abandonment.checkout]} />
                </div>
              </>
            )}
          </ChartCard>

          {/* Conversión de pago */}
          <ChartCard
            title="Conversión de pago"
            description="Lectura operativa de órdenes creadas y estados."
          >
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <MetricCell label="Órdenes creadas" value={formatDashboardNumber(metrics.payment.ordersCreated)} />
              <MetricCell label="Completadas" value={formatDashboardNumber(metrics.payment.purchasesCompleted)} />
              <MetricCell label="Pendientes" value={formatDashboardNumber(metrics.payment.pendingOrders)} />
              <MetricCell label="Fallidas" value={formatDashboardNumber(metrics.payment.failedOrders)} />
              <MetricCell label="Canceladas" value={formatDashboardNumber(metrics.payment.cancelledOrders)} />
              <MetricCell label="Expiradas" value={formatDashboardNumber(metrics.payment.expiredOrders)} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-[8px] border border-emerald-200 bg-emerald-50 px-3.5 py-3">
                <p className="text-[11px] font-semibold text-emerald-600">Facturación</p>
                <p className="mt-1 text-[1rem] font-semibold tracking-[-0.02em] text-emerald-900">
                  {formatDashboardPrice(metrics.payment.billingTotal)}
                </p>
              </div>
              <div className="rounded-[8px] border border-sky-200 bg-sky-50 px-3.5 py-3">
                <p className="text-[11px] font-semibold text-sky-600">Tasa de pago</p>
                <p className="mt-1 text-[1rem] font-semibold tracking-[-0.02em] text-sky-900">
                  {formatDashboardPercent(metrics.payment.completionRate)}
                </p>
              </div>
            </div>
          </ChartCard>

          {/* Snapshots */}
          <ChartCard title="Estado actual" description="Carritos y checkouts activos ahora (sin filtro de período).">
            <div className="grid grid-cols-2 gap-2">
              <MetricCell label="Carritos activos" value={formatDashboardNumber(metrics.snapshots.activeCarts)} />
              <MetricCell label="Checkouts abiertos" value={formatDashboardNumber(metrics.snapshots.openCheckouts)} />
            </div>
          </ChartCard>
        </div>
      </div>

      {/* Timeline chart */}
      <ChartCard
        title="Conversión en el tiempo"
        description={`Serie diaria de sesiones, add to cart, checkout y compras — ${periodLabel}.`}
        className="min-w-0"
      >
        <ConversionTimelineChart data={metrics.timeline} />
      </ChartCard>
    </DashboardSubpageShell>
  );
}
