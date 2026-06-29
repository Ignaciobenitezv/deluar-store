import type { Metadata } from "next";
import { ChartCard } from "@/features/admin/dashboard/components/chart-card";
import { DashboardShell } from "@/features/admin/dashboard/components/dashboard-shell";
import { EmptyState } from "@/features/admin/dashboard/components/empty-state";
import { KpiCard } from "@/features/admin/dashboard/components/kpi-card";
import { LockedMetricCard } from "@/features/admin/dashboard/components/locked-metric-card";
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
  formatDashboardPercent,
  formatDashboardPrice,
} from "@/features/admin/dashboard/lib/dashboard-formatters";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Checkout | DOTCOM Commerce Dashboard",
};

type AdminDashboardCheckoutPageProps = {
  searchParams?: Promise<{
    period?: string;
  }>;
};

export default async function AdminDashboardCheckoutPage({
  searchParams,
}: AdminDashboardCheckoutPageProps) {
  const resolvedSearchParams = await searchParams;
  const period = normalizeDashboardPeriodValue(resolvedSearchParams?.period);
  const metrics = await getDashboardMetrics(period);
  const lastUpdated = formatDashboardDateTime(new Date());

  const paymentStatuses = metrics.payments.statusBreakdown
    .map((item) => ({
      id: item.status,
      title: item.label,
      subtitle: item.status,
      value: item.orders,
      secondaryValue: formatDashboardNumber(item.orders),
      tone:
        item.status === "APPROVED"
          ? ("success" as const)
          : item.status === "PENDING"
            ? ("warning" as const)
            : item.status === "REJECTED" || item.status === "CHARGED_BACK"
              ? ("danger" as const)
              : ("neutral" as const),
    }))
    .filter((item) => item.value > 0);

  const paymentMethods = metrics.payments.methods
    .map((item) => ({
      id: item.method,
      title: item.label,
      subtitle: `${formatDashboardNumber(item.orders)} pedidos`,
      value: item.orders,
      secondaryValue: formatDashboardPrice(item.revenue),
      tone: "accent" as const,
    }))
    .filter((item) => item.value > 0);

  const createdWithoutPayment = Math.max(
    metrics.conversion.checkoutOrders - metrics.conversion.paidOrders,
    0,
  );
  const checkoutAlerts = [
    {
      label: "Pendientes de pago",
      value: metrics.conversion.pendingOrders,
      tone: "warning" as const,
    },
    {
      label: "Fallidos",
      value: metrics.conversion.failedOrders,
      tone: "failed" as const,
    },
    {
      label: "Creados sin pago",
      value: createdWithoutPayment,
      tone: "neutral" as const,
    },
  ].filter((item) => item.value > 0);

  return (
    <DashboardShell
      title="Checkout"
      subtitle={`Vista de conversión basada en órdenes reales. Período activo: ${DASHBOARD_PERIODS[period].label}.`}
      lastUpdated={lastUpdated}
    >
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Pedidos creados"
          value={formatDashboardNumber(metrics.conversion.checkoutOrders)}
          description="Órdenes generadas en el período."
          tone="neutral"
        />
        <KpiCard
          title="Pedidos pagados"
          value={formatDashboardNumber(metrics.conversion.paidOrders)}
          description="Órdenes aprobadas o pagadas."
          tone="success"
        />
        <KpiCard
          title="Tasa de aprobación"
          value={formatDashboardPercent(metrics.conversion.approvalRate)}
          description="Pedidos pagados sobre pedidos creados."
          tone="accent"
        />
        <KpiCard
          title="Pendientes / fallidos"
          value={formatDashboardNumber(
            metrics.conversion.pendingOrders + metrics.conversion.failedOrders + metrics.conversion.cancelledOrders,
          )}
          description={`${formatDashboardNumber(metrics.conversion.pendingOrders)} pendientes · ${formatDashboardNumber(metrics.conversion.failedOrders)} fallidos`}
          tone="warning"
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <ChartCard
          title="Embudo de checkout"
          description="Embudo parcial basado en órdenes reales. Las etapas intermedias estarán disponibles al activar tracking avanzado."
        >
          <div className="space-y-3">
            <StatBadge
              label="Pedidos creados"
              value={formatDashboardNumber(metrics.conversion.checkoutOrders)}
              tone="neutral"
            />
            <StatBadge
              label="Pedidos pagados"
              value={formatDashboardNumber(metrics.conversion.paidOrders)}
              tone="approved"
            />
            <LockedMetricCard
              title="Datos de entrega"
              description="Tracking pendiente para agregar pasos intermedios del embudo."
            />
            <LockedMetricCard
              title="Método de pago"
              description="Tracking pendiente para segmentar etapas reales del checkout."
            />
          </div>
          <p className="mt-4 text-xs text-slate-500">
            Embudo parcial basado en órdenes reales. Las etapas intermedias estarán disponibles al
            activar tracking avanzado.
          </p>
        </ChartCard>

        <ChartCard
          title="Estados de pago"
          description="Distribución de estados sobre órdenes del período."
          emptyState={
            paymentStatuses.length === 0 ? (
              <EmptyState
                title="Sin estados de pago"
                description="No hay pagos para mostrar en el período seleccionado."
              />
            ) : undefined
          }
        >
          {paymentStatuses.length > 0 ? (
            <div className="space-y-3">
              {paymentStatuses.map((item) => (
                <StatBadge
                  key={item.id}
                  label={item.title}
                  value={item.secondaryValue}
                  tone={
                    item.tone === "success"
                      ? "approved"
                      : item.tone === "warning"
                        ? "warning"
                        : item.tone === "danger"
                          ? "failed"
                          : "neutral"
                  }
                />
              ))}
            </div>
          ) : null}
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <RankingCard
          title="Métodos de pago"
          description="Cantidad de pedidos y facturación asociada."
          items={paymentMethods}
          valueFormatter={formatDashboardNumber}
          emptyState={
            <EmptyState
              title="Sin métodos de pago"
              description="No hay métodos de pago para mostrar en el período seleccionado."
            />
          }
        />

        <ChartCard
          title="Alertas"
          description="Señales operativas simples basadas en el checkout real."
          emptyState={
            checkoutAlerts.length === 0 ? (
              <EmptyState
                title="Sin alertas"
                description="No hay pedidos pendientes, fallidos ni creados sin pago en el período."
              />
            ) : undefined
          }
        >
          {checkoutAlerts.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-3">
              {checkoutAlerts.map((item) => (
                <StatBadge
                  key={item.label}
                  label={item.label}
                  value={formatDashboardNumber(item.value)}
                  tone={item.tone}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 py-4">
              <p className="text-sm font-medium text-emerald-900">No hay alertas activas</p>
              <p className="mt-2 text-sm leading-6 text-emerald-800">
                El checkout se encuentra sin pendientes ni fallas relevantes en el período.
              </p>
            </div>
          )}
        </ChartCard>
      </div>
    </DashboardShell>
  );
}

