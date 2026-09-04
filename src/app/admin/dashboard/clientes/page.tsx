import Link from "next/link";
import type { Metadata } from "next";
import { CustomerEvolutionChart } from "@/features/admin/analytics/components/customer-evolution-chart";
import {
  getCustomerAnalyticsPageData,
  normalizeCustomerAnalyticsQuery,
  type CustomerAnalyticsFilters,
  type CustomerAnalyticsPageData,
  type CustomerAnalyticsSortKey,
} from "@/features/admin/analytics/server/customer-analytics-service";
import { ChartCard } from "@/features/admin/dashboard/components/chart-card";
import { DashboardShell } from "@/features/admin/dashboard/components/dashboard-shell";
import { EmptyState } from "@/features/admin/dashboard/components/empty-state";
import { KpiCard } from "@/features/admin/dashboard/components/kpi-card";
import { formatDashboardDateTime, formatDashboardNumber, formatDashboardPercent, formatDashboardPrice, formatDashboardShortDate, maskDashboardEmail } from "@/features/admin/dashboard/lib/dashboard-formatters";
import { DASHBOARD_PERIODS } from "@/features/admin/dashboard/server/dashboard-service";
import { dashboardToneStyles } from "@/features/admin/dashboard/lib/dashboard-ui";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Clientes | Panel de comercio de DOTCOM",
};

type AdminDashboardCustomersPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const customerSortOptions: Array<{ value: CustomerAnalyticsSortKey; label: string }> = [
  { value: "revenue", label: "Facturación" },
  { value: "orders", label: "Pedidos" },
  { value: "averageTicket", label: "Ticket promedio" },
  { value: "ltv", label: "LTV observado" },
];

const pageSizeOptions = [10, 25, 50];

type CustomerRow = CustomerAnalyticsPageData["table"]["rows"][number];

function buildCustomerHref(filters: CustomerAnalyticsFilters, overrides: Partial<CustomerAnalyticsFilters> = {}) {
  const next = { ...filters, ...overrides };
  const params = new URLSearchParams();

  params.set("period", next.period);

  if (next.q) {
    params.set("q", next.q);
  }

  if (next.sort !== "revenue") {
    params.set("sort", next.sort);
  }

  if (next.page > 1) {
    params.set("page", String(next.page));
  }

  if (next.pageSize !== 10) {
    params.set("pageSize", String(next.pageSize));
  }

  const query = params.toString();
  return query ? `/admin/dashboard/clientes?${query}` : "/admin/dashboard/clientes";
}

function formatNullableDays(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "—";
  }

  if (value <= 0) {
    return "menos de 1 día";
  }

  if (value === 1) {
    return "1 día";
  }

  return `${formatDashboardNumber(value)} días`;
}

function formatCustomerHeading(row: CustomerRow) {
  return row.displayName || maskDashboardEmail(row.email);
}

function statusToneClass(status: CustomerRow["status"]) {
  return status === "Nuevo"
    ? "border-amber-200 bg-amber-50 text-amber-900"
    : "border-emerald-200 bg-emerald-50 text-emerald-900";
}

function ShareBar({
  title,
  leftLabel,
  rightLabel,
  leftValue,
  rightValue,
  leftShare,
  rightShare,
}: {
  title: string;
  leftLabel: string;
  rightLabel: string;
  leftValue: string;
  rightValue: string;
  leftShare: number;
  rightShare: number;
}) {
  return (
    <div className="rounded-[18px] border border-slate-200/70 bg-slate-50 px-4 py-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
        <div className="flex h-full w-full">
          <div className="bg-amber-400" style={{ width: `${Math.max(leftShare, 0)}%` }} />
          <div className="bg-emerald-400" style={{ width: `${Math.max(rightShare, 0)}%` }} />
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-4 text-sm">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{leftLabel}</p>
          <p className="mt-1 font-semibold text-slate-950">{leftValue}</p>
          <p className="mt-1 text-xs text-slate-500">{formatDashboardPercent(leftShare)}</p>
        </div>
        <div className="min-w-0 text-right">
          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{rightLabel}</p>
          <p className="mt-1 font-semibold text-slate-950">{rightValue}</p>
          <p className="mt-1 text-xs text-slate-500">{formatDashboardPercent(rightShare)}</p>
        </div>
      </div>
    </div>
  );
}

function InsightCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "neutral" | "success" | "warning" | "accent";
}) {
  return (
    <div className={cn("rounded-[18px] border px-4 py-4", dashboardToneStyles[tone])}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm leading-6 text-slate-700">{value}</p>
    </div>
  );
}

function FrequencyCard({
  label,
  customers,
  share,
}: {
  label: string;
  customers: number;
  share: number;
}) {
  return (
    <div className="rounded-[18px] border border-slate-200/70 bg-white px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
          <p className="mt-2 text-[1.15rem] font-semibold tracking-[-0.04em] text-slate-950">
            {formatDashboardNumber(customers)}
          </p>
        </div>
        <p className="text-sm font-semibold text-slate-700">{formatDashboardPercent(share)}</p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-sky-400" style={{ width: `${Math.max(share, 0)}%` }} />
      </div>
    </div>
  );
}

function CustomerMobileCard({ row }: { row: CustomerRow }) {
  return (
    <article className="rounded-[20px] border border-slate-200/70 bg-white px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-950">{formatCustomerHeading(row)}</p>
          <p className="mt-1 truncate text-xs text-slate-500">{maskDashboardEmail(row.email)}</p>
        </div>
        <span className={cn("shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]", statusToneClass(row.status))}>
          {row.status}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-[14px] border border-slate-200/70 bg-slate-50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Pedidos</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{formatDashboardNumber(row.periodOrders)}</p>
        </div>
        <div className="rounded-[14px] border border-slate-200/70 bg-slate-50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Unidades</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{formatDashboardNumber(row.periodUnits)}</p>
        </div>
        <div className="rounded-[14px] border border-slate-200/70 bg-slate-50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Facturación</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{formatDashboardPrice(row.periodRevenue)}</p>
        </div>
        <div className="rounded-[14px] border border-slate-200/70 bg-slate-50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Ticket</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{formatDashboardPrice(row.periodAverageTicket)}</p>
        </div>
        <div className="rounded-[14px] border border-slate-200/70 bg-slate-50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Primera compra</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{formatDashboardShortDate(row.firstPurchaseAt)}</p>
        </div>
        <div className="rounded-[14px] border border-slate-200/70 bg-slate-50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Última compra</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{formatDashboardShortDate(row.lastPurchaseAt)}</p>
        </div>
        <div className="col-span-2 rounded-[14px] border border-slate-200/70 bg-slate-50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Días entre compras</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{formatNullableDays(row.daysBetweenPurchases)}</p>
        </div>
      </div>
    </article>
  );
}

function TopCustomerMobileCard({ row }: { row: CustomerRow }) {
  return (
    <article className="rounded-[20px] border border-slate-200/70 bg-white px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-950">{formatCustomerHeading(row)}</p>
          <p className="mt-1 truncate text-xs text-slate-500">{maskDashboardEmail(row.email)}</p>
        </div>
        <span className={cn("shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]", statusToneClass(row.status))}>
          {row.status}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-[14px] border border-slate-200/70 bg-slate-50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Pedidos</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{formatDashboardNumber(row.periodOrders)}</p>
        </div>
        <div className="rounded-[14px] border border-slate-200/70 bg-slate-50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Facturación</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{formatDashboardPrice(row.periodRevenue)}</p>
        </div>
        <div className="rounded-[14px] border border-slate-200/70 bg-slate-50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Ticket</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{formatDashboardPrice(row.periodAverageTicket)}</p>
        </div>
        <div className="rounded-[14px] border border-slate-200/70 bg-slate-50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">LTV observado</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{formatDashboardPrice(row.ltvObserved)}</p>
        </div>
        <div className="rounded-[14px] border border-slate-200/70 bg-slate-50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Primera compra</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{formatDashboardShortDate(row.firstPurchaseAt)}</p>
        </div>
        <div className="rounded-[14px] border border-slate-200/70 bg-slate-50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Última compra</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{formatDashboardShortDate(row.lastPurchaseAt)}</p>
        </div>
      </div>
    </article>
  );
}

function TablePagination({
  filters,
  page,
  pageCount,
  totalCount,
}: {
  filters: CustomerAnalyticsFilters;
  page: number;
  pageCount: number;
  totalCount: number;
}) {
  const hasPrev = page > 1;
  const hasNext = page < pageCount;
  const visibleCount = Math.min(filters.pageSize, Math.max(totalCount - (page - 1) * filters.pageSize, 0));

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5 lg:px-6">
      <p className="text-sm text-slate-500">
        Mostrando {formatDashboardNumber(visibleCount)} de {formatDashboardNumber(totalCount)} · página {formatDashboardNumber(page)} de {formatDashboardNumber(pageCount)}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {hasPrev ? (
          <Link
            href={buildCustomerHref(filters, { page: page - 1 })}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Anterior
          </Link>
        ) : (
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Anterior
          </span>
        )}

        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          {formatDashboardNumber(page)} / {formatDashboardNumber(pageCount)}
        </span>

        {hasNext ? (
          <Link
            href={buildCustomerHref(filters, { page: page + 1 })}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Siguiente
          </Link>
        ) : (
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Siguiente
          </span>
        )}
      </div>
    </div>
  );
}

export default async function AdminDashboardCustomersPage({ searchParams }: AdminDashboardCustomersPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const query = normalizeCustomerAnalyticsQuery(resolvedSearchParams);
  const metrics = await getCustomerAnalyticsPageData(query);
  const lastUpdated = formatDashboardDateTime(new Date());

  const currentFilters: CustomerAnalyticsFilters = {
    period: metrics.period,
    sort: query.sort,
    q: query.q,
    page: metrics.table.page,
    pageSize: metrics.table.pageSize,
  };

  const hasTopCustomers = metrics.topCustomers.length > 0;
  const hasCohorts = metrics.cohorts.length > 0;
  const hasInsights = metrics.insights.length > 0;
  const hasFrequency = metrics.frequency.length > 0;
  const hasTableRows = metrics.table.rows.length > 0;
  const hasSecondPurchase = metrics.secondPurchase.customers > 0;

  return (
    <DashboardShell
      title="Clientes"
      subtitle={`Compradores y recurrencia. Período activo: ${DASHBOARD_PERIODS[metrics.period].label}.`}
      lastUpdated={lastUpdated}
    >
      <section className="grid gap-3 min-[420px]:grid-cols-2 xl:grid-cols-4 sm:gap-4">
        <KpiCard
          title="Compradores únicos"
          value={formatDashboardNumber(metrics.summary.uniqueBuyers)}
          description="Clientes únicos con al menos una compra válida en el período."
          tone="accent"
        />
        <KpiCard
          title="Clientes nuevos"
          value={formatDashboardNumber(metrics.summary.newCustomers)}
          description={`${formatDashboardPercent(metrics.summary.uniqueBuyers > 0 ? metrics.summary.newCustomers / metrics.summary.uniqueBuyers : 0)} de los compradores.`}
          tone="warning"
        />
        <KpiCard
          title="Clientes recurrentes"
          value={formatDashboardNumber(metrics.summary.recurrentCustomers)}
          description={`${formatDashboardPercent(metrics.summary.uniqueBuyers > 0 ? metrics.summary.recurrentCustomers / metrics.summary.uniqueBuyers : 0)} de los compradores.`}
          tone="success"
        />
        <KpiCard
          title="Tasa de recompra"
          value={formatDashboardPercent(metrics.summary.repurchaseRate)}
          description="Clientes recurrentes sobre compradores únicos del período."
          tone="neutral"
        />
      </section>

      <section className="grid gap-3 min-[420px]:grid-cols-2 xl:grid-cols-4 sm:gap-4">
        <KpiCard
          title="Pedidos"
          value={formatDashboardNumber(metrics.summary.orders)}
          description="Compras pagadas reales dentro del período."
          tone="accent"
        />
        <KpiCard
          title="Facturación"
          value={formatDashboardPrice(metrics.summary.revenue)}
          description="Suma de los importes reales de las órdenes pagadas."
          tone="warning"
        />
        <KpiCard
          title="Ticket promedio"
          value={formatDashboardPrice(metrics.summary.averageTicket)}
          description="Facturación dividida por pedidos."
          tone="success"
        />
        <KpiCard
          title="Pedidos por cliente"
          value={formatDashboardNumber(metrics.summary.ordersPerCustomer)}
          description="Pedidos del período sobre compradores únicos."
          tone="neutral"
        />
      </section>

      <section className="grid gap-3 min-[420px]:grid-cols-2 xl:grid-cols-2 sm:gap-4">
        <KpiCard
          title="LTV observado histórico"
          value={formatDashboardPrice(metrics.summary.ltvObservedTotal)}
          description="Facturación histórica acumulada de los clientes identificados."
          tone="accent"
        />
        <KpiCard
          title="LTV observado promedio histórico"
          value={formatDashboardPrice(metrics.summary.ltvObservedAverage)}
          description="Promedio histórico por cliente identificado."
          tone="neutral"
        />
      </section>

      <ChartCard
        title="Nuevos vs recurrentes"
        description="Comparación de compradores nuevos y recurrentes."
        className="min-w-0"
      >
        <div className="grid gap-3 xl:grid-cols-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <KpiCard
              title="Clientes nuevos"
              value={formatDashboardNumber(metrics.split.newCustomers)}
              description={`${formatDashboardPercent(metrics.split.newCustomerShare)} de los compradores.`}
              tone="warning"
            />
            <KpiCard
              title="Clientes recurrentes"
              value={formatDashboardNumber(metrics.split.recurrentCustomers)}
              description={`${formatDashboardPercent(metrics.split.recurrentCustomerShare)} de los compradores.`}
              tone="success"
            />
            <KpiCard
              title="Facturación de nuevos"
              value={formatDashboardPrice(metrics.split.newRevenue)}
              description={`${formatDashboardPercent(metrics.split.newRevenueShare)} de la facturación.`}
              tone="accent"
            />
            <KpiCard
              title="Facturación de recurrentes"
              value={formatDashboardPrice(metrics.split.recurrentRevenue)}
              description={`${formatDashboardPercent(metrics.split.recurrentRevenueShare)} de la facturación.`}
              tone="neutral"
            />
          </div>

          <div className="grid gap-3">
            <ShareBar
              title="Compradores"
              leftLabel="Nuevos"
              rightLabel="Recurrentes"
              leftValue={formatDashboardNumber(metrics.split.newCustomers)}
              rightValue={formatDashboardNumber(metrics.split.recurrentCustomers)}
              leftShare={metrics.split.newCustomerShare}
              rightShare={metrics.split.recurrentCustomerShare}
            />
            <ShareBar
              title="Facturación"
              leftLabel="Nuevos"
              rightLabel="Recurrentes"
              leftValue={formatDashboardPrice(metrics.split.newRevenue)}
              rightValue={formatDashboardPrice(metrics.split.recurrentRevenue)}
              leftShare={metrics.split.newRevenueShare}
              rightShare={metrics.split.recurrentRevenueShare}
            />
          </div>
        </div>
      </ChartCard>

      <ChartCard
        title="Evolución de clientes"
        description="Series de nuevos y recurrentes por día dentro del período seleccionado."
        className="min-w-0"
      >
        <CustomerEvolutionChart data={metrics.evolution} />
      </ChartCard>

      <div className="grid gap-4 2xl:grid-cols-2">
        <ChartCard title="Top clientes" description="Clientes con mayor facturación del período.">
          {hasTopCustomers ? (
            <>
              <div className="hidden max-w-full overflow-x-auto md:block">
                <table className="min-w-[1220px] w-full border-collapse text-sm md:min-w-0">
                  <thead className="bg-slate-50 text-left">
                    <tr>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Cliente</th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Pedidos</th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Facturación</th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Ticket promedio</th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Primera compra</th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Última compra</th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">LTV observado</th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.topCustomers.map((row) => (
                      <tr key={row.key} className="border-t border-slate-200/70 align-top">
                        <td className="px-4 py-4">
                          <div className="min-w-0">
                            <p className="font-medium text-slate-950">{formatCustomerHeading(row)}</p>
                            <p className="mt-1 text-xs text-slate-500">{maskDashboardEmail(row.email)}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-slate-700">{formatDashboardNumber(row.periodOrders)}</td>
                        <td className="px-4 py-4 text-slate-700">{formatDashboardPrice(row.periodRevenue)}</td>
                        <td className="px-4 py-4 text-slate-700">{formatDashboardPrice(row.periodAverageTicket)}</td>
                        <td className="px-4 py-4 text-slate-700">{formatDashboardShortDate(row.firstPurchaseAt)}</td>
                        <td className="px-4 py-4 text-slate-700">{formatDashboardShortDate(row.lastPurchaseAt)}</td>
                        <td className="px-4 py-4 text-slate-700">{formatDashboardPrice(row.ltvObserved)}</td>
                        <td className="px-4 py-4">
                          <span className={cn("inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]", statusToneClass(row.status))}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-3 md:hidden">
                {metrics.topCustomers.map((row) => (
                  <TopCustomerMobileCard key={row.key} row={row} />
                ))}
              </div>
            </>
          ) : (
            <EmptyState
              title="No hay clientes para mostrar."
              description="Sin datos para este período."
            />
          )}
        </ChartCard>

        <ChartCard title="Frecuencia de compra" description="Cantidad de compras por cliente.">
          {hasFrequency ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {metrics.frequency.map((bucket) => (
                <FrequencyCard key={bucket.label} label={bucket.label} customers={bucket.customers} share={bucket.share} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No hay frecuencia para mostrar."
              description="Sin datos para este período."
            />
          )}
        </ChartCard>
      </div>

      <div className="grid gap-4 2xl:grid-cols-2">
        <ChartCard title="Segunda compra" description="Tiempo entre primera y segunda compra.">
          {hasSecondPurchase ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <KpiCard
                title="Clientes con segunda compra"
                value={formatDashboardNumber(metrics.secondPurchase.customers)}
                description="Clientes con al menos dos compras históricas."
                tone="accent"
              />
              <KpiCard
                title="Promedio entre compras"
                value={formatNullableDays(metrics.secondPurchase.averageDays)}
                description="Media histórica entre primera y segunda compra."
                tone="success"
              />
              <KpiCard
                title="Mediana entre compras"
                value={formatNullableDays(metrics.secondPurchase.medianDays)}
                description="Mediana histórica entre primera y segunda compra."
                tone="warning"
              />
            </div>
          ) : (
            <EmptyState
              title="Todavía no hay suficientes segundas compras."
              description="Sin datos para este período."
            />
          )}
        </ChartCard>

        <ChartCard title="Cohortes" description="Mes de primera compra y recompra.">
          {hasCohorts ? (
            <div className="max-w-full overflow-x-auto md:overflow-visible">
              <table className="w-full table-fixed border-collapse text-sm">
                <thead className="bg-slate-50 text-left">
                  <tr>
                    <th className="w-[34%] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Mes de primera compra</th>
                    <th className="w-[22%] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Clientes adquiridos</th>
                    <th className="w-[22%] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Hicieron segunda compra</th>
                    <th className="w-[22%] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">% segunda compra</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.cohorts.map((row) => (
                    <tr key={row.cohort} className="border-t border-slate-200/70">
                      <td className="break-words px-4 py-4 font-medium text-slate-950">{row.cohort}</td>
                      <td className="px-4 py-4 text-slate-700">{formatDashboardNumber(row.acquired)}</td>
                      <td className="px-4 py-4 text-slate-700">{formatDashboardNumber(row.secondPurchase)}</td>
                      <td className="px-4 py-4 text-slate-700">{formatDashboardPercent(row.secondPurchaseRate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="No hay cohortes para mostrar."
              description="Sin datos para este período."
            />
          )}
        </ChartCard>
      </div>

      <ChartCard title="Señales" description="Resumen del período.">
        {hasInsights ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {metrics.insights.map((insight) => (
              <InsightCard key={`${insight.label}::${insight.value}`} label={insight.label} value={insight.value} tone={insight.tone} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Sin señales."
            description="Sin datos para este período."
          />
        )}

        <div className="mt-4 rounded-[18px] border border-slate-200/70 bg-slate-50 px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Calidad de datos</p>
          <div className="mt-2 space-y-2 text-sm leading-6 text-slate-600">
            <p>Las métricas de clientes se calculan sobre compras con información suficiente para identificar al comprador.</p>
            <p>Las compras sin un identificador confiable no se incluyen en las métricas de cliente.</p>
            <p>LTV observado representa la facturación histórica acumulada.</p>
            <p>{metrics.notes.dataQualityNote}</p>
          </div>
        </div>
      </ChartCard>

      <ChartCard
        title="Tabla operativa de clientes"
        description="Búsqueda, orden y paginación."
        className="min-w-0"
      >
        <div className="grid gap-4">
          <form method="get" className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
            <input type="hidden" name="period" value={currentFilters.period} />
            <input type="hidden" name="sort" value={currentFilters.sort} />
            <input type="hidden" name="page" value="1" />
            <input type="hidden" name="pageSize" value={currentFilters.pageSize} />

            <label className="block min-w-0">
              <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Buscar cliente
              </span>
              <input
                type="search"
                name="q"
                defaultValue={currentFilters.q}
                placeholder="Nombre, email o teléfono"
                className="w-full rounded-[14px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
              />
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="submit"
                className="rounded-full border border-[#314158] bg-[#314158] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white shadow-[0_10px_22px_rgba(49,65,88,0.16)] transition hover:border-[#3b4f69] hover:bg-[#3b4f69]"
              >
                Buscar
              </button>
              {currentFilters.q ? (
                <Link
                  href={buildCustomerHref({ ...currentFilters, q: "" }, { page: 1 })}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  Limpiar
                </Link>
              ) : null}
            </div>
          </form>

          <div className="grid gap-3">
            <div className="flex flex-wrap gap-2">
              {customerSortOptions.map((option) => {
                const active = currentFilters.sort === option.value;

                return (
                <Link
                  key={option.value}
                  href={buildCustomerHref(currentFilters, { sort: option.value, page: 1 })}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] transition",
                    active
                        ? "border-[#314158] bg-[#314158] text-white shadow-[0_10px_20px_rgba(49,65,88,0.14)]"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
                  )}
                >
                    {option.label}
                  </Link>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Tamaño de página</span>
              {pageSizeOptions.map((option) => {
                const active = currentFilters.pageSize === option;

                return (
                  <Link
                    key={option}
                    href={buildCustomerHref(currentFilters, { pageSize: option, page: 1 })}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] transition",
                      active
                        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
                    )}
                  >
                    {formatDashboardNumber(option)}
                  </Link>
                );
              })}
            </div>
          </div>

          {hasTableRows ? (
            <>
              <div className="hidden max-w-full overflow-x-auto md:block">
                <table className="min-w-[1240px] w-full border-collapse text-sm md:min-w-0">
                  <thead className="bg-slate-50 text-left">
                    <tr>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Cliente</th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Pedidos</th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Unidades</th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Facturación</th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Ticket</th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Primera compra</th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Última compra</th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Días entre compras</th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.table.rows.map((row) => (
                      <tr key={row.key} className="border-t border-slate-200/70 align-top">
                        <td className="px-4 py-4">
                          <div className="min-w-0">
                            <p className="font-medium text-slate-950">{formatCustomerHeading(row)}</p>
                            <p className="mt-1 text-xs text-slate-500">{maskDashboardEmail(row.email)}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-slate-700">{formatDashboardNumber(row.periodOrders)}</td>
                        <td className="px-4 py-4 text-slate-700">{formatDashboardNumber(row.periodUnits)}</td>
                        <td className="px-4 py-4 text-slate-700">{formatDashboardPrice(row.periodRevenue)}</td>
                        <td className="px-4 py-4 text-slate-700">{formatDashboardPrice(row.periodAverageTicket)}</td>
                        <td className="px-4 py-4 text-slate-700">{formatDashboardShortDate(row.firstPurchaseAt)}</td>
                        <td className="px-4 py-4 text-slate-700">{formatDashboardShortDate(row.lastPurchaseAt)}</td>
                        <td className="px-4 py-4 text-slate-700">{formatNullableDays(row.daysBetweenPurchases)}</td>
                        <td className="px-4 py-4">
                          <span className={cn("inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]", statusToneClass(row.status))}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-3 md:hidden">
                {metrics.table.rows.map((row) => (
                  <CustomerMobileCard key={row.key} row={row} />
                ))}
              </div>

              <TablePagination
                filters={currentFilters}
                page={metrics.table.page}
                pageCount={metrics.table.pageCount}
                totalCount={metrics.table.totalCount}
              />
            </>
          ) : (
            <EmptyState
              title="No hay clientes para este período."
              description={
                currentFilters.q
                  ? "La búsqueda no devolvió resultados. Probá limpiando el filtro o ajustando el término."
                  : "Sin datos para este período."
              }
            />
          )}
        </div>
      </ChartCard>
    </DashboardShell>
  );
}
