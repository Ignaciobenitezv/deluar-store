import type { Metadata } from "next";
import { ChartCard } from "@/features/admin/dashboard/components/chart-card";
import { DashboardPaymentMethodsChart } from "@/features/admin/dashboard/components/charts/dashboard-payment-methods-chart";
import { DashboardPaymentStatusChart } from "@/features/admin/dashboard/components/charts/dashboard-payment-status-chart";
import { DashboardRevenueByPaymentChart } from "@/features/admin/dashboard/components/charts/dashboard-revenue-by-payment-chart";
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
  formatDashboardPrice,
} from "@/features/admin/dashboard/lib/dashboard-formatters";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pagos | DELUAR",
};

type AdminDashboardPaymentsPageProps = {
  searchParams?: Promise<{
    period?: string;
  }>;
};

function IconRevenue() {
  return (
    <svg viewBox="0 0 22 22" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8.5" />
      <path d="M11 6v10M8.5 8.5c0-1.1 1.1-1.7 2.5-1.7s2.5.7 2.5 1.8c0 2.7-5 2.2-5 5.2 0 1.5 1.5 2 3 2s2.5-.7 2.5-2" />
    </svg>
  );
}
function IconApproved() {
  return (
    <svg viewBox="0 0 22 22" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 11.5L9 16.5 18 7.5" />
    </svg>
  );
}
function IconPending() {
  return (
    <svg viewBox="0 0 22 22" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8.5" />
      <path d="M11 7v4l3 2" />
    </svg>
  );
}
function IconFailed() {
  return (
    <svg viewBox="0 0 22 22" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8.5" />
      <path d="M8 8l6 6M14 8l-6 6" />
    </svg>
  );
}

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

  const periodLabel = DASHBOARD_PERIODS[period].label;

  return (
    <DashboardSubpageShell
      sectionLabel="Pagos"
      title="Pagos"
      subtitle={`Pagos y estados de órdenes. Período activo: ${periodLabel}.`}
      lastUpdated={lastUpdated}
    >
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard
          title="Facturación aprobada"
          value={formatDashboardPrice(metrics.summary.billingTotal)}
          description="Ingresos de pagos aprobados del período."
          icon={<IconRevenue />}
          tone="success"
        />
        <KpiCard
          title="Pedidos aprobados"
          value={formatDashboardNumber(approvedOrders)}
          description="Pagos aprobados o confirmados."
          icon={<IconApproved />}
          tone="accent"
        />
        <KpiCard
          title="Pedidos pendientes"
          value={formatDashboardNumber(pendingOrders)}
          description="Pagos aún no resueltos."
          icon={<IconPending />}
          tone="warning"
        />
        <KpiCard
          title="Fallidos / cancelados"
          value={formatDashboardNumber(failedOrders + cancelledOrders)}
          description="Pagos rechazados o cancelados."
          icon={<IconFailed />}
          tone="neutral"
        />
      </div>

      {/* Main charts row: methods table + revenue donut */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_0.48fr]">
        <ChartCard
          title="Métodos de pago más usados"
          description={`Pedidos y facturación por método — ${periodLabel}.`}
          className="xl:col-span-1"
        >
          <DashboardPaymentMethodsChart data={metrics.payments.methods} />
        </ChartCard>

        <ChartCard title="Facturación por método" description="Participación de ingresos por medio de pago.">
          <DashboardRevenueByPaymentChart data={metrics.payments.methods} />
        </ChartCard>
      </div>

      {/* Status + alerts row */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.48fr_1fr]">
        <ChartCard title="Estados de pago" description="Distribución de estados sobre órdenes del período.">
          <DashboardPaymentStatusChart data={metrics.payments.statusBreakdown} />
        </ChartCard>

        <ChartCard title="Alertas de pagos" description="Señales operativas del período.">
          {metrics.conversion.pendingOrders > 0 || metrics.conversion.failedOrders > 0 || failedByMethod.length > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-[10px] border border-amber-200 bg-amber-50 px-3.5 py-3">
                  <p className="text-[11px] font-semibold text-amber-600">Pendientes</p>
                  <p className="mt-1 text-[1.25rem] font-semibold tracking-[-0.03em] text-amber-900">
                    {formatDashboardNumber(metrics.conversion.pendingOrders)}
                  </p>
                </div>
                <div className="rounded-[10px] border border-rose-200 bg-rose-50 px-3.5 py-3">
                  <p className="text-[11px] font-semibold text-rose-600">Fallidos</p>
                  <p className="mt-1 text-[1.25rem] font-semibold tracking-[-0.03em] text-rose-900">
                    {formatDashboardNumber(metrics.conversion.failedOrders)}
                  </p>
                </div>
                <div className="rounded-[10px] border border-[#e8e5e1] bg-[#faf9f7] px-3.5 py-3">
                  <p className="text-[11px] font-semibold text-slate-500">Cancelados</p>
                  <p className="mt-1 text-[1.25rem] font-semibold tracking-[-0.03em] text-slate-900">
                    {formatDashboardNumber(metrics.conversion.cancelledOrders)}
                  </p>
                </div>
              </div>

              {failedByMethod.length > 0 ? (
                <div>
                  <p className="mb-3 text-[12px] font-semibold text-slate-500">Métodos con más fallos</p>
                  <div className="space-y-2">
                    {failedByMethod.slice(0, 5).map((item) => (
                      <div key={item.method} className="flex items-center justify-between gap-4 rounded-[8px] border border-[#e8e5e1] bg-white px-3.5 py-3">
                        <div>
                          <p className="text-[13px] font-medium text-slate-900">{item.label}</p>
                          <p className="mt-0.5 text-[11px] text-slate-400">
                            {formatDashboardNumber(item.pendingOrders)} pendientes · {formatDashboardNumber(item.failedOrders)} fallidos
                          </p>
                        </div>
                        <span className="rounded-[6px] border border-rose-200 bg-rose-50 px-2 py-0.5 text-[12px] font-semibold text-rose-700">
                          {formatDashboardNumber(item.failedOrders)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <EmptyState
              title="Todos los pagos del período están en estado normal."
              description="No hay pendientes ni fallos relevantes para destacar."
            />
          )}
        </ChartCard>
      </div>
    </DashboardSubpageShell>
  );
}
