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
  formatDashboardPercent,
  formatDashboardPrice,
} from "@/features/admin/dashboard/lib/dashboard-formatters";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pagos | DOTCOM Commerce Dashboard",
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

  const totalPaymentOrders = metrics.payments.methods.reduce((accumulator, item) => accumulator + item.orders, 0);
  const approvedOrders = metrics.payments.statusBreakdown.find((item) => item.status === "APPROVED")?.orders ?? 0;
  const pendingOrders = metrics.payments.statusBreakdown.find((item) => item.status === "PENDING")?.orders ?? 0;
  const failedOrders = metrics.payments.statusBreakdown.find((item) => item.status === "REJECTED")?.orders ?? 0;
  const cancelledOrders = metrics.payments.statusBreakdown.find((item) => item.status === "CANCELLED")?.orders ?? 0;
  const approvedRevenue = metrics.payments.methods.reduce((accumulator, item) => accumulator + item.revenue, 0);
  const paymentMethods = metrics.payments.methods;
  const mobilePaymentMethods = paymentMethods.slice(0, 3);
  const hiddenMobilePaymentMethods = Math.max(0, paymentMethods.length - mobilePaymentMethods.length);
  const failedByMethod = metrics.payments.failedByMethod.filter(
    (item) => item.failedOrders > 0 || item.pendingOrders > 0,
  );
  const paymentStatusTotal = metrics.payments.statusBreakdown.reduce(
    (accumulator, item) => accumulator + item.orders,
    0,
  );

  return (
    <DashboardShell
      title="Pagos"
      subtitle={`Rendimiento y estado de pagos basado en órdenes reales. Período activo: ${DASHBOARD_PERIODS[period].label}.`}
      lastUpdated={lastUpdated}
    >
      <section className="grid gap-3 min-[420px]:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <KpiCard title="Facturación aprobada" value={formatDashboardPrice(approvedRevenue)} description="Ingresos de pagos aprobados del período." tone="success" />
        <KpiCard title="Pedidos aprobados" value={formatDashboardNumber(approvedOrders)} description="Pagos aprobados o confirmados." tone="accent" />
        <KpiCard title="Pedidos pendientes" value={formatDashboardNumber(pendingOrders)} description="Pagos aún no resueltos." tone="warning" />
        <KpiCard title="Fallidos / cancelados" value={formatDashboardNumber(failedOrders + cancelledOrders)} description="Pagos rechazados o cancelados." tone="neutral" />
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <ChartCard
          title="Métodos de pago más usados"
          description="Pedidos, facturación y participación por método."
          emptyState={
            paymentMethods.length === 0 ? (
              <EmptyState title="Sin métodos de pago" description="Todavía no hay pedidos con método de pago en este período." />
            ) : undefined
          }
        >
          {paymentMethods.length > 0 ? (
            <>
              <div className="space-y-3 sm:hidden">
                {mobilePaymentMethods.map((item) => (
                  <div key={item.method} className="rounded-[16px] border border-slate-200/70 bg-white px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{item.label}</p>
                        <p className="mt-1 text-xs text-slate-500">{formatDashboardNumber(item.orders)} pedidos</p>
                      </div>
                      <p className="text-sm font-semibold text-slate-950">{formatDashboardPrice(item.revenue)}</p>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                      <span>{formatDashboardPercent((item.orders / totalPaymentOrders) * 100)}</span>
                      <span>{formatDashboardNumber(item.orders)} pedidos</span>
                    </div>
                  </div>
                ))}
                {hiddenMobilePaymentMethods > 0 ? (
                  <p className="px-1 text-xs text-slate-500">
                    Ver detalle en desktop · +{hiddenMobilePaymentMethods} métodos más
                  </p>
                ) : null}
              </div>

              <div className="hidden overflow-hidden rounded-[20px] border border-slate-200/70 sm:block">
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-slate-50 text-left">
                    <tr>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Método</th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Pedidos</th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Facturación</th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentMethods.map((item) => (
                      <tr key={item.method} className="border-t border-slate-200/70">
                        <td className="px-4 py-4 font-medium text-slate-900">{item.label}</td>
                        <td className="px-4 py-4 text-slate-700">{formatDashboardNumber(item.orders)}</td>
                        <td className="px-4 py-4 text-slate-950 font-semibold">{formatDashboardPrice(item.revenue)}</td>
                        <td className="px-4 py-4 text-slate-700">{formatDashboardPercent((item.orders / totalPaymentOrders) * 100)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </ChartCard>

        <RankingCard
          title="Facturación por método"
          description="Métodos ordenados por facturación asociada."
          items={paymentMethods.map((item) => ({
            id: item.method,
            title: item.label,
            subtitle: `${formatDashboardNumber(item.orders)} pedidos`,
            value: item.revenue,
            secondaryValue: formatDashboardNumber(item.orders),
            tone: "accent",
          }))}
          valueFormatter={formatDashboardPrice}
          emptyState={
            <EmptyState title="Sin facturación por método" description="Todavía no hay facturación asociada a métodos de pago en este período." />
          }
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <ChartCard title="Estado de pagos" description="Distribución de estados sobre órdenes del período.">
          <div className="space-y-3">
            {metrics.payments.statusBreakdown.map((item) => {
              const share = paymentStatusTotal > 0 ? (item.orders / paymentStatusTotal) * 100 : 0;
              const tone =
                item.status === "APPROVED"
                  ? "approved"
                  : item.status === "PENDING"
                    ? "warning"
                    : item.status === "REJECTED" || item.status === "CHARGED_BACK"
                      ? "failed"
                      : item.status === "CANCELLED"
                        ? "cancelled"
                        : "neutral";

              return (
                <div key={item.status} className="rounded-[18px] border border-slate-200/70 bg-white px-4 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{item.label}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.status}</p>
                    </div>
                    <StatBadge label="Pedidos" value={formatDashboardNumber(item.orders)} tone={tone} />
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${
                        tone === "approved"
                          ? "bg-emerald-400"
                          : tone === "warning"
                            ? "bg-amber-400"
                            : tone === "failed"
                              ? "bg-rose-400"
                              : tone === "cancelled"
                                ? "bg-slate-400"
                                : "bg-sky-400"
                      }`}
                      style={{ width: `${Math.max(8, share)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
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
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Se calcula con estados fallidos y pendientes por método de pago.
                </p>
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
            <EmptyState title="Todos los pagos del período están en estado normal." description="No hay pendientes ni fallos relevantes para destacar." />
          )}
        </ChartCard>
      </div>
    </DashboardShell>
  );
}
