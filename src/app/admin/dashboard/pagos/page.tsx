import type { Metadata } from "next";
import { ChartCard } from "@/features/admin/dashboard/components/chart-card";
import { DashboardPaymentMethodsChart } from "@/features/admin/dashboard/components/charts/dashboard-payment-methods-chart";
import { DashboardPaymentStatusChart } from "@/features/admin/dashboard/components/charts/dashboard-payment-status-chart";
import { DashboardRevenueByPaymentChart } from "@/features/admin/dashboard/components/charts/dashboard-revenue-by-payment-chart";
import { DashboardShell } from "@/features/admin/dashboard/components/dashboard-shell";
import { EmptyState } from "@/features/admin/dashboard/components/empty-state";
import { KpiCard } from "@/features/admin/dashboard/components/kpi-card";
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
} from "@/features/admin/dashboard/lib/dashboard-formatters";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pagos | Panel de comercio de DOTCOM",
};

type AdminDashboardPaymentsPageProps = {
  searchParams?: Promise<{
    period?: string;
  }>;
};

export default async function AdminDashboardPaymentsPage({ searchParams }: AdminDashboardPaymentsPageProps) {
  const resolvedSearchParams = await searchParams;
  const period = normalizeDashboardPeriodValue(resolvedSearchParams?.period);
  const metrics = await getDashboardMetrics(period);
  const lastUpdated = formatDashboardDateTime(new Date());

  const approvedOrders = metrics.payments.statusBreakdown.find((item) => item.status === "APPROVED")?.orders ?? 0;
  const pendingOrders = metrics.payments.statusBreakdown.find((item) => item.status === "PENDING")?.orders ?? 0;
  const failedOrders = metrics.payments.statusBreakdown.find((item) => item.status === "REJECTED")?.orders ?? 0;
  const cancelledOrders = metrics.payments.statusBreakdown.find((item) => item.status === "CANCELLED")?.orders ?? 0;
  const failedByMethod = metrics.payments.failedByMethod.filter(
    (item) => item.failedOrders > 0 || item.pendingOrders > 0,
  );

  return (
    <DashboardShell
      title="Pagos"
      subtitle={`Pagos y estados de órdenes. Período activo: ${DASHBOARD_PERIODS[period].label}.`}
      lastUpdated={lastUpdated}
    >
      <section className="grid gap-3 min-[420px]:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <KpiCard
          title="Facturación aprobada"
          value={formatDashboardPrice(metrics.summary.billingTotal)}
          description="Ingresos de pagos aprobados del período."
          tone="success"
        />
        <KpiCard
          title="Pedidos aprobados"
          value={formatDashboardNumber(approvedOrders)}
          description="Pagos aprobados o confirmados."
          tone="accent"
        />
        <KpiCard
          title="Pedidos pendientes"
          value={formatDashboardNumber(pendingOrders)}
          description="Pagos aún no resueltos."
          tone="warning"
        />
        <KpiCard
          title="Fallidos / cancelados"
          value={formatDashboardNumber(failedOrders + cancelledOrders)}
          description="Pagos rechazados o cancelados."
          tone="neutral"
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-3">
        <ChartCard
          title="Métodos de pago más usados"
          description="Pedidos y facturación por método."
          className="xl:col-span-2"
        >
          <DashboardPaymentMethodsChart data={metrics.payments.methods} />
        </ChartCard>

        <ChartCard title="Facturación por método" description="Participación de ingresos por medio de pago.">
          <DashboardRevenueByPaymentChart data={metrics.payments.methods} />
        </ChartCard>

        <ChartCard title="Estados de pago" description="Distribución de estados sobre órdenes del período.">
          <DashboardPaymentStatusChart data={metrics.payments.statusBreakdown} />
        </ChartCard>

        <ChartCard title="Alertas de pagos" description="Señales operativas del período.">
          {metrics.conversion.pendingOrders > 0 || metrics.conversion.failedOrders > 0 || failedByMethod.length > 0 ? (
            <div className="space-y-3">
              <div className="grid gap-3 min-[420px]:grid-cols-3">
                <StatBadge label="Pendientes" value={formatDashboardNumber(metrics.conversion.pendingOrders)} tone="warning" />
                <StatBadge label="Fallidos" value={formatDashboardNumber(metrics.conversion.failedOrders)} tone="failed" />
                <StatBadge label="Cancelados" value={formatDashboardNumber(metrics.conversion.cancelledOrders)} tone="neutral" />
              </div>

              <div className="rounded-[20px] border border-slate-200/70 bg-slate-50 p-4 sm:p-5">
              <p className="text-sm font-medium text-slate-900">Métodos con más fallos</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">Pendientes y fallidos por método de pago.</p>
                <div className="mt-4 space-y-3">
                  {failedByMethod.slice(0, 5).map((item) => (
                    <div key={item.method} className="rounded-[16px] border border-slate-200/70 bg-white px-4 py-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{item.label}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {formatDashboardNumber(item.pendingOrders)} pendientes · {formatDashboardNumber(item.failedOrders)} fallidos
                          </p>
                        </div>
                        <StatBadge label="Fallos" value={formatDashboardNumber(item.failedOrders)} tone="failed" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              title="Todos los pagos del período están en estado normal."
              description="No hay pendientes ni fallos relevantes para destacar."
            />
          )}
        </ChartCard>
      </div>
    </DashboardShell>
  );
}
