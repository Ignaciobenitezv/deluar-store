import type { Metadata } from "next";
import { ChartCard } from "@/features/admin/dashboard/components/chart-card";
import { DashboardShippingChart } from "@/features/admin/dashboard/components/charts/dashboard-shipping-chart";
import { DashboardShell } from "@/features/admin/dashboard/components/dashboard-shell";
import { EmptyState } from "@/features/admin/dashboard/components/empty-state";
import { KpiCard } from "@/features/admin/dashboard/components/kpi-card";
import { StatBadge } from "@/features/admin/dashboard/components/stat-badge";
import { AndreaniExportPanel } from "@/features/shipments/components/andreani-export-panel";
import { getAndreaniExportCandidates } from "@/features/shipments/andreani-export/service";
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
  title: "Envios | Panel de comercio de DOTCOM",
};

type AdminDashboardShippingPageProps = {
  searchParams?: Promise<{
    period?: string;
  }>;
};

export default async function AdminDashboardShippingPage({
  searchParams,
}: AdminDashboardShippingPageProps) {
  const resolvedSearchParams = await searchParams;
  const period = normalizeDashboardPeriodValue(resolvedSearchParams?.period);
  const metrics = await getDashboardMetrics(period);
  const andreaniExportData = await getAndreaniExportCandidates();
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
      title="Envios"
      subtitle={`Operacion de envios basada en pedidos reales. Periodo activo: ${DASHBOARD_PERIODS[period].label}.`}
      lastUpdated={lastUpdated}
    >
      <section className="grid gap-3 min-[420px]:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <KpiCard
          title="Pedidos con envio"
          value={formatDashboardNumber(totalShippingOrders)}
          description="Pedidos con metodo de envio registrado."
          tone="accent"
        />
        <KpiCard
          title="Costo total cobrado"
          value={formatDashboardPrice(totalShippingCost)}
          description="Costo de envio cobrado en el periodo."
          tone="success"
        />
        <KpiCard
          title="Metodo mas usado"
          value={mostUsedMethod ? mostUsedMethod.label : "-"}
          description={
            mostUsedMethod ? `${formatDashboardNumber(mostUsedMethod.orders)} pedidos` : "Sin datos"
          }
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
        <ChartCard title="Metodos de envio" description="Distribucion de pedidos y costo de envio.">
          <DashboardShippingChart data={shippingMethods} />
        </ChartCard>

        <ChartCard title="Operativa" description="Distribucion por tipo de operacion de envio.">
          {totalShippingOrders > 0 ? (
            <div className="space-y-3">
              <div className="grid gap-3 min-[420px]:grid-cols-2">
                <StatBadge
                  label="Costo total cobrado"
                  value={formatDashboardPrice(totalShippingCost)}
                  tone="approved"
                />
                <StatBadge
                  label="Costo promedio por pedido"
                  value={formatDashboardPrice(averageShippingCost)}
                  tone="neutral"
                />
                <StatBadge label="Envios gratis" value={formatDashboardNumber(freeShippingOrders)} tone="warning" />
                <StatBadge label="Envios pagos" value={formatDashboardNumber(paidShippingOrders)} tone="neutral" />
              </div>

              <div className="rounded-[20px] border border-slate-200/70 bg-slate-50 p-4 sm:p-5">
                <p className="text-sm font-medium text-slate-900">Distribucion operativa</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Los envios se agrupan por tipo de operacion real registrada en las ordenes.
                </p>
                <div className="mt-4 space-y-3">
                  <div className="rounded-[16px] border border-slate-200/70 bg-white px-4 py-3">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-slate-900">Retiros en Resistencia</p>
                        <p className="mt-1 text-xs text-slate-500">Pedidos retirados en punto local.</p>
                      </div>
                      <StatBadge
                        label="Pedidos"
                        value={formatDashboardNumber(metrics.shipping.pickupOrders)}
                        tone="neutral"
                      />
                    </div>
                  </div>

                  <div className="rounded-[16px] border border-slate-200/70 bg-white px-4 py-3">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-slate-900">Envios a domicilio</p>
                        <p className="mt-1 text-xs text-slate-500">Entrega directa al cliente.</p>
                      </div>
                      <StatBadge
                        label="Pedidos"
                        value={formatDashboardNumber(metrics.shipping.homeDeliveryOrders)}
                        tone="approved"
                      />
                    </div>
                  </div>

                  <div className="rounded-[16px] border border-slate-200/70 bg-white px-4 py-3">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-slate-900">Envios a sucursal</p>
                        <p className="mt-1 text-xs text-slate-500">Entrega en punto de retiro.</p>
                      </div>
                      <StatBadge
                        label="Pedidos"
                        value={formatDashboardNumber(metrics.shipping.cityBranchOrders)}
                        tone="warning"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              title="Todavia no hay pedidos con metodo de envio en este periodo."
              description="La operativa de envios aparecera cuando haya pedidos registrados."
            />
          )}
        </ChartCard>
      </div>

      <AndreaniExportPanel
        shipments={andreaniExportData.shipments}
        summary={andreaniExportData.summary}
      />
    </DashboardShell>
  );
}

