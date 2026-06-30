import type { Metadata } from "next";
import { ChartCard } from "@/features/admin/dashboard/components/chart-card";
import { DashboardShell } from "@/features/admin/dashboard/components/dashboard-shell";
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
  formatDashboardPrice,
  formatDashboardShortDate,
  maskDashboardEmail,
} from "@/features/admin/dashboard/lib/dashboard-formatters";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Clientes | DOTCOM Commerce Dashboard",
};

type AdminDashboardCustomersPageProps = {
  searchParams?: Promise<{
    period?: string;
  }>;
};

export default async function AdminDashboardCustomersPage({ searchParams }: AdminDashboardCustomersPageProps) {
  const resolvedSearchParams = await searchParams;
  const period = normalizeDashboardPeriodValue(resolvedSearchParams?.period);
  const metrics = await getDashboardMetrics(period);
  const lastUpdated = formatDashboardDateTime(new Date());

  const customers = metrics.customers.allCustomers;
  const recurrentCustomers = customers.filter((customer) => customer.orders > 1);
  const newCustomers = customers.filter((customer) => customer.isNewCustomer);
  const mobileTopCustomerRows = customers.slice(0, 3);
  const hiddenMobileCustomers = Math.max(0, customers.length - mobileTopCustomerRows.length);

  const averageRevenuePerCustomer =
    metrics.customers.uniqueCustomers > 0 ? metrics.summary.billingTotal / metrics.customers.uniqueCustomers : 0;

  const topCustomerRows = customers.slice(0, 10);

  return (
    <DashboardShell
      title="Clientes"
      subtitle={`Vista comercial de clientes basada en órdenes reales. Período activo: ${DASHBOARD_PERIODS[period].label}.`}
      lastUpdated={lastUpdated}
    >
      <section className="grid gap-3 min-[420px]:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <KpiCard
          title="Clientes únicos"
          value={formatDashboardNumber(metrics.customers.uniqueCustomers)}
          description="Clientes diferentes en el período."
          tone="accent"
        />
        <KpiCard
          title="Clientes nuevos"
          value={formatDashboardNumber(metrics.customers.newCustomers)}
          description="Primera compra dentro del período."
          tone="success"
        />
        <KpiCard
          title="Clientes recurrentes"
          value={formatDashboardNumber(metrics.customers.recurrentCustomers)}
          description="Clientes con más de una compra."
          tone="warning"
        />
        <KpiCard
          title="Facturación promedio por cliente"
          value={formatDashboardPrice(averageRevenuePerCustomer)}
          description="Facturación del período dividida por clientes únicos."
          tone="neutral"
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.95fr)]">
        <ChartCard
          title="Ranking de clientes"
          description="Clientes con mayor facturación y actividad del período."
          emptyState={
            topCustomerRows.length === 0 ? (
              <EmptyState title="Sin clientes para mostrar" description="Todavía no hay clientes con compras en este período." />
            ) : undefined
          }
        >
          {topCustomerRows.length > 0 ? (
            <>
              <div className="space-y-3 sm:hidden">
                {mobileTopCustomerRows.map((customer) => {
                  const averageTicket = customer.orders > 0 ? customer.revenue / customer.orders : 0;

                  return (
                    <div key={customer.email} className="rounded-[16px] border border-slate-200/70 bg-white px-3 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900">{customer.displayName}</p>
                          <p className="mt-1 text-[11px] text-slate-500">{maskDashboardEmail(customer.email)}</p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold text-slate-950">
                          {formatDashboardPrice(customer.revenue)}
                        </p>
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Pedidos</p>
                          <p className="mt-1 text-sm font-semibold text-slate-950">{formatDashboardNumber(customer.orders)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Ticket</p>
                          <p className="mt-1 text-sm font-semibold text-slate-950">{formatDashboardPrice(averageTicket)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Facturación</p>
                          <p className="mt-1 text-sm font-semibold text-slate-950">{formatDashboardPrice(customer.revenue)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {hiddenMobileCustomers > 0 ? (
                  <p className="px-1 text-xs text-slate-500">
                    Ver detalle en desktop · +{hiddenMobileCustomers} clientes más
                  </p>
                ) : null}
              </div>

              <div className="hidden overflow-hidden rounded-[20px] border border-slate-200/70 sm:block">
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-slate-50 text-left">
                    <tr>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Cliente</th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Pedidos</th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Facturación</th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Ticket promedio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topCustomerRows.map((customer) => {
                      const averageTicket = customer.orders > 0 ? customer.revenue / customer.orders : 0;

                      return (
                        <tr key={customer.email} className="border-t border-slate-200/70">
                          <td className="px-4 py-4">
                            <div>
                              <p className="text-sm font-medium text-slate-900">{customer.displayName}</p>
                              <p className="mt-1 text-xs text-slate-500">{maskDashboardEmail(customer.email)}</p>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-700">{formatDashboardNumber(customer.orders)}</td>
                          <td className="px-4 py-4 text-sm font-semibold text-slate-950">{formatDashboardPrice(customer.revenue)}</td>
                          <td className="px-4 py-4 text-sm text-slate-700">{formatDashboardPrice(averageTicket)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </ChartCard>

        <div className="grid gap-4">
          <RankingCard
            title="Clientes recurrentes"
            description="Clientes con más de una compra."
            items={recurrentCustomers.slice(0, 8).map((customer) => ({
              id: customer.email,
              title: customer.displayName,
              subtitle: `${formatDashboardNumber(customer.orders)} pedidos`,
              value: customer.revenue,
              secondaryValue: `${formatDashboardPrice(customer.revenue)} facturados`,
              tone: "success",
            }))}
            valueFormatter={formatDashboardPrice}
            emptyState={
              <EmptyState
                title="Todavía no hay clientes recurrentes en este período."
                description="Cuando un cliente compre más de una vez, aparecerá aquí."
              />
            }
          />

          <RankingCard
            title="Nuevos clientes"
            description="Primera compra dentro del período."
            items={newCustomers.slice(0, 8).map((customer) => ({
              id: customer.email,
              title: customer.displayName,
              subtitle: formatDashboardShortDate(customer.firstOrderAt),
              value: customer.revenue,
              secondaryValue: `${formatDashboardNumber(customer.orders)} pedidos`,
              tone: "accent",
            }))}
            valueFormatter={formatDashboardPrice}
            emptyState={
              <EmptyState
                title="Todavía no hay nuevos clientes"
                description="No se registraron primeras compras dentro del período seleccionado."
              />
            }
          />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <ChartCard
          title="Ticket promedio por cliente"
          description="El ticket promedio por cliente se calcula sobre órdenes pagadas del período."
          emptyState={
            metrics.summary.paidOrders === 0 ? (
              <EmptyState title="Sin ticket promedio por cliente" description="No hay órdenes pagadas en el período seleccionado." />
            ) : undefined
          }
        >
          {metrics.summary.paidOrders > 0 ? (
            <div className="rounded-[20px] border border-slate-200/70 bg-slate-50 p-4 sm:p-5">
              <p className="text-sm font-medium text-slate-900">
                El ticket promedio por cliente se calcula sobre órdenes pagadas del período.
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Se toma la facturación total del período y se divide por la cantidad de clientes únicos para dar una lectura comercial simple y útil.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <KpiCard
                  title="Facturación promedio por cliente"
                  value={formatDashboardPrice(averageRevenuePerCustomer)}
                  description="Lectura comercial agregada."
                  tone="accent"
                />
                <KpiCard
                  title="Clientes únicos"
                  value={formatDashboardNumber(metrics.customers.uniqueCustomers)}
                  description="Base del cálculo promedio."
                  tone="neutral"
                />
              </div>
            </div>
          ) : null}
        </ChartCard>

        <ChartCard title="Segmentación rápida" description="Lectura operativa simple sobre el período.">
          <div className="grid gap-3 min-[420px]:grid-cols-2">
            <KpiCard
              title="Clientes recurrentes"
              value={formatDashboardNumber(metrics.customers.recurrentCustomers)}
              description="Más de una compra."
              tone="success"
            />
            <KpiCard
              title="Clientes nuevos"
              value={formatDashboardNumber(metrics.customers.newCustomers)}
              description="Primera compra dentro del período."
              tone="warning"
            />
          </div>
        </ChartCard>
      </div>
    </DashboardShell>
  );
}
