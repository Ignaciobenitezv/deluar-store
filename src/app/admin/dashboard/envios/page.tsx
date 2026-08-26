import type { Metadata } from "next";
import { ChartCard } from "@/features/admin/dashboard/components/chart-card";
import { DashboardShippingChart } from "@/features/admin/dashboard/components/charts/dashboard-shipping-chart";
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
  title: "Envíos | Panel de comercio de DOTCOM",
};

type AdminDashboardShippingPageProps = {
  searchParams?: Promise<{
    period?: string;
  }>;
};

export default async function AdminDashboardShippingPage({ searchParams }: AdminDashboardShippingPageProps) {
  const resolvedSearchParams = await searchParams;
  const period = normalizeDashboardPeriodValue(resolvedSearchParams?.period);
  const metrics = await getDashboardMetrics(period);
  const lastUpdated = formatDashboardDateTime(new Date());

  const shippingMethods = metrics.shipping.methods;
  const totalShippingOrders = metrics.shipping.shippingOrders;
  const totalShippingCost = metrics.shipping.totalShippingCost;
  const averageShippingCost = metrics.shipping.averageShippingCost;
  const mostUsedMethod = shippingMethods[0];
  const freeShippingOrders = metrics.shipping.freeShippingOrders;
  const paidShippingOrders = metrics.shipping.paidShippingOrders;

  return (
    <DashboardShell
      title="Envíos"
      subtitle={`Operación de envíos basada en pedidos reales. Período activo: ${DASHBOARD_PERIODS[period].label}.`}
      lastUpdated={lastUpdated}
    >
      <section className="grid gap-3 min-[420px]:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <KpiCard
          title="Pedidos con envío"
          value={formatDashboardNumber(totalShippingOrders)}
          description="Pedidos con método de envío registrado."
          tone="accent"
        />
        <KpiCard
          title="Costo total cobrado"
          value={formatDashboardPrice(totalShippingCost)}
          description="Costo de envío cobrado en el período."
          tone="success"
        />
        <KpiCard
          title="Método más usado"
          value={mostUsedMethod ? mostUsedMethod.label : "-"}
          description={mostUsedMethod ? `${formatDashboardNumber(mostUsedMethod.orders)} pedidos` : "Sin datos"}
          tone="warning"
        />
        <KpiCard
          title="Retiros en Resistencia"
          value={formatDashboardNumber(metrics.shipping.pickupOrders)}
          description="Pedidos retirados en sucursal/local."
          tone="neutral"
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,0.9fr)]">
        <ChartCard
          title="Métodos de envío"
          description="Distribución de pedidos y costo de envío."
        >
          <DashboardShippingChart data={shippingMethods} />
        </ChartCard>

        <ChartCard title="Operativa" description="Distribución por tipo de operación de envío.">
          {totalShippingOrders > 0 ? (
            <div className="space-y-3">
              <div className="grid gap-3 min-[420px]:grid-cols-2">
                <StatBadge label="Costo total cobrado" value={formatDashboardPrice(totalShippingCost)} tone="approved" />
                <StatBadge label="Costo promedio por pedido" value={formatDashboardPrice(averageShippingCost)} tone="neutral" />
                <StatBadge label="Envíos gratis" value={formatDashboardNumber(freeShippingOrders)} tone="warning" />
                <StatBadge label="Envíos pagos" value={formatDashboardNumber(paidShippingOrders)} tone="neutral" />
              </div>

              <div className="rounded-[20px] border border-slate-200/70 bg-slate-50 p-4 sm:p-5">
                <p className="text-sm font-medium text-slate-900">Distribución operativa</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Los envíos se agrupan por tipo de operación real registrada en las órdenes.
                </p>
                <div className="mt-4 space-y-3">
                  <div className="rounded-[16px] border border-slate-200/70 bg-white px-4 py-3">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-slate-900">Retiros en Resistencia</p>
                        <p className="mt-1 text-xs text-slate-500">Pedidos retirados en punto local.</p>
                      </div>
                      <StatBadge label="Pedidos" value={formatDashboardNumber(metrics.shipping.pickupOrders)} tone="neutral" />
                    </div>
                  </div>

                  <div className="rounded-[16px] border border-slate-200/70 bg-white px-4 py-3">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-slate-900">Envíos a domicilio</p>
                        <p className="mt-1 text-xs text-slate-500">Entrega directa al cliente.</p>
                      </div>
                      <StatBadge label="Pedidos" value={formatDashboardNumber(metrics.shipping.homeDeliveryOrders)} tone="approved" />
                    </div>
                  </div>

                  <div className="rounded-[16px] border border-slate-200/70 bg-white px-4 py-3">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-slate-900">Envíos a sucursal</p>
                        <p className="mt-1 text-xs text-slate-500">Entrega en punto de retiro.</p>
                      </div>
                      <StatBadge label="Pedidos" value={formatDashboardNumber(metrics.shipping.cityBranchOrders)} tone="warning" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              title="Todavía no hay pedidos con método de envío en este período."
              description="La operativa de envíos aparecerá cuando haya pedidos registrados."
            />
          )}
        </ChartCard>
      </div>
    </DashboardShell>
  );
}
