import type { Metadata } from "next";
import { ChartCard } from "@/features/admin/dashboard/components/chart-card";
import { DashboardSubpageShell } from "@/features/admin/dashboard/components/dashboard-subpage-shell";
import { EmptyState } from "@/features/admin/dashboard/components/empty-state";
import { KpiCard } from "@/features/admin/dashboard/components/kpi-card";
import { RankingCard } from "@/features/admin/dashboard/components/ranking-card";
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
  title: "Finalización de compra | DELUAR",
};

type AdminDashboardCheckoutPageProps = {
  searchParams?: Promise<{
    period?: string;
  }>;
};

function IconCheckout() {
  return (
    <svg viewBox="0 0 22 22" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3h2l1.5 9h9.5l1.5-6H7" />
      <circle cx="9" cy="19" r="1.5" /><circle cx="17" cy="19" r="1.5" />
    </svg>
  );
}
function IconCompleted() {
  return (
    <svg viewBox="0 0 22 22" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 11.5L9 16.5 18 7.5" />
    </svg>
  );
}
function IconRate() {
  return (
    <svg viewBox="0 0 22 22" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 5.5h16l-5 7v5.5l-6-1.5v-4L3 5.5Z" />
    </svg>
  );
}
function IconAlert() {
  return (
    <svg viewBox="0 0 22 22" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4L3 18h16L11 4Z" />
      <path d="M11 9v5M11 16.5v.5" />
    </svg>
  );
}

function FunnelBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.max((value / total) * 100, 0) : 0;
  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <p className="text-[13px] text-slate-600">{label}</p>
        <p className="text-[13px] font-semibold text-slate-900">{formatDashboardNumber(value)}</p>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function StatusRow({ label, value, badge }: { label: string; value: string; badge?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 last:border-0">
      <p className="text-[13px] text-slate-500">{label}</p>
      <div className="flex items-center gap-2">
        {badge}
        <p className="text-[13px] font-semibold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

export default async function AdminDashboardCheckoutPage({
  searchParams,
}: AdminDashboardCheckoutPageProps) {
  const resolvedSearchParams = await searchParams;
  const period = normalizeDashboardPeriodValue(resolvedSearchParams?.period);
  const metrics = await getDashboardMetrics(period);
  const lastUpdated = formatDashboardDateTime(new Date());

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
    { label: "Pendientes de pago", value: metrics.conversion.pendingOrders, cls: "border-amber-200 bg-amber-50 text-amber-700" },
    { label: "Fallidos", value: metrics.conversion.failedOrders, cls: "border-rose-200 bg-rose-50 text-rose-700" },
    { label: "Sin resolver", value: createdWithoutPayment, cls: "border-slate-200 bg-slate-50 text-slate-600" },
  ].filter((item) => item.value > 0);

  const periodLabel = DASHBOARD_PERIODS[period].label;
  const approvalRate = metrics.conversion.approvalRate;
  const abandonedCheckouts = Math.max(
    metrics.conversion.checkoutOrders - metrics.conversion.paidOrders - metrics.conversion.pendingOrders,
    0,
  );

  return (
    <DashboardSubpageShell
      sectionLabel="Finalización de compra"
      title="Finalización de compra"
      subtitle={`Análisis del proceso de checkout. Período activo: ${periodLabel}.`}
      lastUpdated={lastUpdated}
    >
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard
          title="Checkouts iniciados"
          value={formatDashboardNumber(metrics.conversion.checkoutOrders)}
          description="Órdenes generadas en el período."
          icon={<IconCheckout />}
          tone="neutral"
        />
        <KpiCard
          title="Checkouts completados"
          value={formatDashboardNumber(metrics.conversion.paidOrders)}
          description="Órdenes aprobadas o pagadas."
          icon={<IconCompleted />}
          tone="success"
        />
        <KpiCard
          title="Tasa de finalización"
          value={formatDashboardPercent(approvalRate)}
          description="Pedidos pagados sobre pedidos creados."
          icon={<IconRate />}
          tone="accent"
        />
        <KpiCard
          title="Checkouts abandonados"
          value={formatDashboardNumber(abandonedCheckouts)}
          description="Iniciados sin completar ni quedar pendientes."
          icon={<IconAlert />}
          tone="warning"
        />
      </div>

      {/* Main grid: funnel + status */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_0.52fr]">
        {/* Funnel */}
        <ChartCard
          title="Embudo de finalización de compra"
          description={`Pedidos creados y pagados del período — ${periodLabel}.`}
        >
          <div className="space-y-4">
            <FunnelBar
              label="Órdenes creadas"
              value={metrics.conversion.checkoutOrders}
              total={metrics.conversion.checkoutOrders}
              color="bg-slate-300"
            />
            <FunnelBar
              label="Pagadas / aprobadas"
              value={metrics.conversion.paidOrders}
              total={metrics.conversion.checkoutOrders}
              color="bg-emerald-400"
            />
            <FunnelBar
              label="Pendientes"
              value={metrics.conversion.pendingOrders}
              total={metrics.conversion.checkoutOrders}
              color="bg-amber-400"
            />
            <FunnelBar
              label="Fallidas"
              value={metrics.conversion.failedOrders}
              total={metrics.conversion.checkoutOrders}
              color="bg-rose-400"
            />
            <FunnelBar
              label="Canceladas"
              value={metrics.conversion.cancelledOrders}
              total={metrics.conversion.checkoutOrders}
              color="bg-slate-200"
            />
          </div>
          <div className="mt-5 rounded-[10px] bg-[#f6f3ef] px-4 py-3">
            <p className="text-[11px] text-slate-500">Tasa de finalización de pago</p>
            <p className="mt-1 text-[1.5rem] font-semibold tracking-[-0.03em] text-slate-900">
              {metrics.conversion.checkoutOrders > 0
                ? formatDashboardPercent((metrics.conversion.paidOrders / metrics.conversion.checkoutOrders) * 100)
                : "—"}
            </p>
          </div>
        </ChartCard>

        {/* Right column: payment status + alerts */}
        <div className="flex flex-col gap-4">
          {/* Métodos de pago */}
          <ChartCard title="Métodos de pago" description="Facturación y pedidos por método.">
            {metrics.payments.statusBreakdown.some((s) => s.orders > 0) ? (
              <div className="space-y-0">
                {metrics.payments.statusBreakdown
                  .filter((item) => item.orders > 0)
                  .map((item) => {
                    const dotCls =
                      item.status === "APPROVED"
                        ? "bg-emerald-400"
                        : item.status === "PENDING"
                          ? "bg-amber-400"
                          : item.status === "REJECTED" || item.status === "CHARGED_BACK"
                            ? "bg-rose-400"
                            : "bg-slate-300";
                    return (
                      <StatusRow
                        key={item.status}
                        label={item.label}
                        value={formatDashboardNumber(item.orders)}
                        badge={<span className={`h-2 w-2 shrink-0 rounded-full ${dotCls}`} />}
                      />
                    );
                  })}
              </div>
            ) : (
              <EmptyState title="Sin estados de pago" description="No hay pagos para mostrar en el período." />
            )}
          </ChartCard>

          {/* Alertas operativas */}
          <ChartCard title="Alertas" description="Señales operativas del checkout.">
            {checkoutAlerts.length > 0 ? (
              <div className="space-y-2">
                {checkoutAlerts.map((item) => (
                  <div key={item.label} className={`flex items-center justify-between gap-3 rounded-[8px] border px-3.5 py-3 ${item.cls}`}>
                    <p className="text-[13px] font-medium">{item.label}</p>
                    <p className="text-[15px] font-semibold tracking-[-0.02em]">{formatDashboardNumber(item.value)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[10px] border border-emerald-200 bg-emerald-50 px-4 py-4">
                <p className="text-[13px] font-medium text-emerald-900">Sin alertas activas</p>
                <p className="mt-1.5 text-[13px] leading-5 text-emerald-700">
                  El checkout no tiene pendientes ni fallas relevantes en el período.
                </p>
              </div>
            )}
          </ChartCard>
        </div>
      </div>

      {/* Payment methods ranking */}
      <RankingCard
        title="Métodos de pago más usados"
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
    </DashboardSubpageShell>
  );
}
