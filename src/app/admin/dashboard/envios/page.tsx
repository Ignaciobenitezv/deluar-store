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
  title: "Envíos | DOTCOM Commerce Dashboard",
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
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <ChartCard
          title="Métodos de envío más usados"
          description="Pedidos, facturación, costo total y porcentaje por método."
          emptyState={
            shippingMethods.length === 0 ? (
              <EmptyState
                title="Todavía no hay pedidos con método de envío en este período."
                description="Cuando existan pedidos con envío, esta tabla mostrará la distribución operativa."
              />
            ) : undefined
          }
        >
          {shippingMethods.length > 0 ? (
            <div className="overflow-hidden rounded-[20px] border border-slate-200/70">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-slate-50 text-left">
                  <tr>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Método
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Pedidos
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Facturación
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Costo envío
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      %
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {shippingMethods.map((item) => (
                    <tr key={item.method} className="border-t border-slate-200/70">
                      <td className="px-4 py-4 font-medium text-slate-900">{item.label}</td>
                      <td className="px-4 py-4 text-slate-700">{formatDashboardNumber(item.orders)}</td>
                      <td className="px-4 py-4 text-slate-950 font-semibold">
                        {formatDashboardPrice(item.revenue)}
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {formatDashboardPrice(item.shippingCostTotal)}
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {formatDashboardPercent((item.orders / totalShippingOrders) * 100)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </ChartCard>

        <RankingCard
          title="Métodos de envío por volumen"
          description="Ranking compacto con barras horizontales."
          items={shippingMethods.map((item) => ({
            id: item.method,
            title: item.label,
            subtitle: `${formatDashboardPrice(item.revenue)} facturados`,
            value: item.orders,
            secondaryValue: formatDashboardPrice(item.shippingCostTotal),
            tone: "accent",
          }))}
          emptyState={
            <EmptyState
              title="Sin métodos de envío"
              description="Todavía no hay pedidos con método de envío en este período."
            />
          }
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <ChartCard title="Resumen de costos de envío" description="Lectura operativa de costos y gratuidad.">
          {totalShippingOrders > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
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
              <StatBadge
                label="Envíos gratis"
                value={formatDashboardNumber(freeShippingOrders)}
                tone="warning"
              />
              <StatBadge
                label="Envíos pagos"
                value={formatDashboardNumber(paidShippingOrders)}
                tone="neutral"
              />
            </div>
          ) : (
            <EmptyState
              title="Todavía no hay pedidos con método de envío en este período."
              description="Cuando existan pedidos, aquí se mostrará el resumen de costos."
            />
          )}
        </ChartCard>

        <ChartCard title="Operativa" description="Distribución por tipo de operación de envío.">
          {totalShippingOrders > 0 ? (
            <div className="space-y-3">
              <div className="rounded-[18px] border border-slate-200/70 bg-white px-4 py-4">
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

              <div className="rounded-[18px] border border-slate-200/70 bg-white px-4 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Envíos a domicilio</p>
                    <p className="mt-1 text-xs text-slate-500">Entrega directa al cliente.</p>
                  </div>
                  <StatBadge
                    label="Pedidos"
                    value={formatDashboardNumber(metrics.shipping.homeDeliveryOrders)}
                    tone="approved"
                  />
                </div>
              </div>

              <div className="rounded-[18px] border border-slate-200/70 bg-white px-4 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Envíos a sucursal</p>
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

