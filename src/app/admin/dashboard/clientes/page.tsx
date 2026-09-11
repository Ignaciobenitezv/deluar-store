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
import { DashboardSubpageShell } from "@/features/admin/dashboard/components/dashboard-subpage-shell";
import { EmptyState } from "@/features/admin/dashboard/components/empty-state";
import { KpiCard } from "@/features/admin/dashboard/components/kpi-card";
import {
  formatDashboardDateTime,
  formatDashboardNumber,
  formatDashboardPercent,
  formatDashboardPrice,
  formatDashboardShortDate,
  maskDashboardEmail,
} from "@/features/admin/dashboard/lib/dashboard-formatters";
import { DASHBOARD_PERIODS } from "@/features/admin/dashboard/server/dashboard-service";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Clientes | DELUAR",
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
  if (next.q) params.set("q", next.q);
  if (next.sort !== "revenue") params.set("sort", next.sort);
  if (next.page > 1) params.set("page", String(next.page));
  if (next.pageSize !== 10) params.set("pageSize", String(next.pageSize));

  const query = params.toString();
  return query ? `/admin/dashboard/clientes?${query}` : "/admin/dashboard/clientes";
}

function formatNullableDays(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  if (value <= 0) return "menos de 1 día";
  if (value === 1) return "1 día";
  return `${formatDashboardNumber(value)} días`;
}

function formatCustomerHeading(row: CustomerRow) {
  return row.displayName || maskDashboardEmail(row.email);
}

function statusToneClass(status: CustomerRow["status"]) {
  return status === "Nuevo"
    ? "border-amber-200 bg-amber-50 text-amber-700"
    : "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function IconBuyers() {
  return (
    <svg viewBox="0 0 22 22" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="8" r="3.5" />
      <path d="M4.5 19c0-3.314 2.91-6 6.5-6s6.5 2.686 6.5 6" />
    </svg>
  );
}
function IconOrders() {
  return (
    <svg viewBox="0 0 22 22" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7.5 9V7.5A3.5 3.5 0 0 1 11 4a3.5 3.5 0 0 1 3.5 3.5V9" />
      <path d="M4 9h14L16.5 18H5.5L4 9Z" />
    </svg>
  );
}
function IconRevenue() {
  return (
    <svg viewBox="0 0 22 22" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8.5" />
      <path d="M11 6v10M8.5 8.5c0-1.1 1.1-1.7 2.5-1.7s2.5.7 2.5 1.8c0 2.7-5 2.2-5 5.2 0 1.5 1.5 2 3 2s2.5-.7 2.5-2" />
    </svg>
  );
}
function IconRepurchase() {
  return (
    <svg viewBox="0 0 22 22" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 11a7 7 0 0 1 7-7 7 7 0 0 1 5 2.1" />
      <path d="M18 11a7 7 0 0 1-7 7 7 7 0 0 1-5-2.1" />
      <path d="M16 7l2-2 2 2M4 15l-2 2-2-2" />
    </svg>
  );
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
    <div className="rounded-[10px] border border-[#e8e5e1] bg-[#faf9f7] px-4 py-4">
      <p className="text-[12px] font-semibold text-slate-500">{title}</p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div className="flex h-full w-full">
          <div className="bg-amber-400" style={{ width: `${Math.max(leftShare, 0)}%` }} />
          <div className="bg-emerald-400" style={{ width: `${Math.max(rightShare, 0)}%` }} />
        </div>
      </div>
      <div className="mt-3 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] text-slate-400">{leftLabel}</p>
          <p className="mt-0.5 text-[15px] font-semibold tracking-[-0.02em] text-slate-900">{leftValue}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">{formatDashboardPercent(leftShare)}</p>
        </div>
        <div className="min-w-0 text-right">
          <p className="text-[11px] text-slate-400">{rightLabel}</p>
          <p className="mt-0.5 text-[15px] font-semibold tracking-[-0.02em] text-slate-900">{rightValue}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">{formatDashboardPercent(rightShare)}</p>
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
  const toneClass = {
    neutral: "border-[#e8e5e1] bg-[#faf9f7]",
    success: "border-emerald-200 bg-emerald-50",
    warning: "border-amber-200 bg-amber-50",
    accent: "border-sky-200 bg-sky-50",
  }[tone];

  return (
    <div className={cn("rounded-[10px] border px-4 py-4", toneClass)}>
      <p className="text-[11px] font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-[13px] leading-5 text-slate-700">{value}</p>
    </div>
  );
}

function FrequencyCard({ label, customers, share }: { label: string; customers: number; share: number }) {
  return (
    <div className="rounded-[10px] border border-[#e8e5e1] bg-white px-4 py-4">
      <p className="text-[11px] font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-[1.15rem] font-semibold tracking-[-0.04em] text-slate-950">
        {formatDashboardNumber(customers)}
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-[#c4b5a5]" style={{ width: `${Math.max(share, 0)}%` }} />
      </div>
      <p className="mt-1.5 text-[11px] text-slate-400">{formatDashboardPercent(share)}</p>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 last:border-0">
      <p className="text-[13px] text-slate-500">{label}</p>
      <p className="text-[13px] font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function CustomerMobileCard({ row }: { row: CustomerRow }) {
  return (
    <article className="rounded-[10px] border border-[#e8e5e1] bg-white px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-slate-950">{formatCustomerHeading(row)}</p>
          <p className="mt-0.5 truncate text-[12px] text-slate-500">{maskDashboardEmail(row.email)}</p>
        </div>
        <span className={cn("shrink-0 rounded-[6px] border px-2 py-0.5 text-[11px] font-semibold", statusToneClass(row.status))}>
          {row.status}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {[
          { label: "Pedidos", value: formatDashboardNumber(row.periodOrders) },
          { label: "Unidades", value: formatDashboardNumber(row.periodUnits) },
          { label: "Facturación", value: formatDashboardPrice(row.periodRevenue) },
          { label: "Ticket", value: formatDashboardPrice(row.periodAverageTicket) },
          { label: "Primera compra", value: formatDashboardShortDate(row.firstPurchaseAt) },
          { label: "Última compra", value: formatDashboardShortDate(row.lastPurchaseAt) },
        ].map((item) => (
          <div key={item.label} className="rounded-[8px] border border-[#e8e5e1] bg-[#faf9f7] px-3 py-2.5">
            <p className="text-[11px] text-slate-400">{item.label}</p>
            <p className="mt-0.5 text-[13px] font-semibold text-slate-900">{item.value}</p>
          </div>
        ))}
        <div className="col-span-2 rounded-[8px] border border-[#e8e5e1] bg-[#faf9f7] px-3 py-2.5">
          <p className="text-[11px] text-slate-400">Días entre compras</p>
          <p className="mt-0.5 text-[13px] font-semibold text-slate-900">{formatNullableDays(row.daysBetweenPurchases)}</p>
        </div>
      </div>
    </article>
  );
}

function TopCustomerMobileCard({ row }: { row: CustomerRow }) {
  return (
    <article className="rounded-[10px] border border-[#e8e5e1] bg-white px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-slate-950">{formatCustomerHeading(row)}</p>
          <p className="mt-0.5 truncate text-[12px] text-slate-500">{maskDashboardEmail(row.email)}</p>
        </div>
        <span className={cn("shrink-0 rounded-[6px] border px-2 py-0.5 text-[11px] font-semibold", statusToneClass(row.status))}>
          {row.status}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {[
          { label: "Pedidos", value: formatDashboardNumber(row.periodOrders) },
          { label: "Facturación", value: formatDashboardPrice(row.periodRevenue) },
          { label: "Ticket", value: formatDashboardPrice(row.periodAverageTicket) },
          { label: "LTV observado", value: formatDashboardPrice(row.ltvObserved) },
          { label: "Primera compra", value: formatDashboardShortDate(row.firstPurchaseAt) },
          { label: "Última compra", value: formatDashboardShortDate(row.lastPurchaseAt) },
        ].map((item) => (
          <div key={item.label} className="rounded-[8px] border border-[#e8e5e1] bg-[#faf9f7] px-3 py-2.5">
            <p className="text-[11px] text-slate-400">{item.label}</p>
            <p className="mt-0.5 text-[13px] font-semibold text-slate-900">{item.value}</p>
          </div>
        ))}
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
    <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[12px] text-slate-400">
        Mostrando {formatDashboardNumber(visibleCount)} de {formatDashboardNumber(totalCount)} · pág. {formatDashboardNumber(page)} de {formatDashboardNumber(pageCount)}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {hasPrev ? (
          <Link
            href={buildCustomerHref(filters, { page: page - 1 })}
            className="rounded-[8px] border border-[#e8e5e1] bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Anterior
          </Link>
        ) : (
          <span className="rounded-[8px] border border-[#e8e5e1] bg-[#faf9f7] px-3 py-1.5 text-[12px] font-semibold text-slate-300">
            Anterior
          </span>
        )}
        <span className="rounded-[8px] border border-[#e8e5e1] bg-[#faf9f7] px-3 py-1.5 text-[12px] font-semibold text-slate-500">
          {formatDashboardNumber(page)} / {formatDashboardNumber(pageCount)}
        </span>
        {hasNext ? (
          <Link
            href={buildCustomerHref(filters, { page: page + 1 })}
            className="rounded-[8px] border border-[#e8e5e1] bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Siguiente
          </Link>
        ) : (
          <span className="rounded-[8px] border border-[#e8e5e1] bg-[#faf9f7] px-3 py-1.5 text-[12px] font-semibold text-slate-300">
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

  const periodLabel = DASHBOARD_PERIODS[metrics.period].label;

  return (
    <DashboardSubpageShell
      sectionLabel="Clientes"
      title="Clientes"
      subtitle={`Compradores y recurrencia. Período activo: ${periodLabel}.`}
      lastUpdated={lastUpdated}
    >
      {/* Primary KPI row */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard
          title="Compradores únicos"
          value={formatDashboardNumber(metrics.summary.uniqueBuyers)}
          description="Clientes únicos con al menos una compra válida."
          icon={<IconBuyers />}
          tone="accent"
        />
        <KpiCard
          title="Pedidos"
          value={formatDashboardNumber(metrics.summary.orders)}
          description="Compras pagadas reales del período."
          icon={<IconOrders />}
          tone="neutral"
        />
        <KpiCard
          title="Facturación"
          value={formatDashboardPrice(metrics.summary.revenue)}
          description="Suma de órdenes pagadas del período."
          icon={<IconRevenue />}
          tone="success"
        />
        <KpiCard
          title="Tasa de recompra"
          value={formatDashboardPercent(metrics.summary.repurchaseRate)}
          description="Clientes recurrentes sobre compradores únicos."
          icon={<IconRepurchase />}
          tone="warning"
        />
      </div>

      {/* Evolution + split */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_0.42fr]">
        <ChartCard
          title="Evolución de clientes"
          description={`Nuevos y recurrentes por día — ${periodLabel}.`}
          className="min-w-0"
        >
          <CustomerEvolutionChart data={metrics.evolution} />
        </ChartCard>

        <ChartCard title="Nuevos vs recurrentes" description="Distribución de compradores del período.">
          <div className="space-y-3">
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
          <div className="mt-4 space-y-0">
            <MetricRow label="Ticket promedio" value={formatDashboardPrice(metrics.summary.averageTicket)} />
            <MetricRow label="Pedidos por cliente" value={formatDashboardNumber(metrics.summary.ordersPerCustomer)} />
            <MetricRow label="LTV observado promedio" value={formatDashboardPrice(metrics.summary.ltvObservedAverage)} />
          </div>
        </ChartCard>
      </div>

      {/* Top clientes + Frecuencia */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_0.45fr]">
        <ChartCard title="Top clientes" description="Clientes con mayor facturación del período.">
          {hasTopCustomers ? (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full border-collapse text-sm">
                  <thead className="border-b border-slate-100 text-left">
                    <tr>
                      {["Cliente", "Pedidos", "Facturación", "Ticket", "1ª compra", "Última compra", "LTV", "Estado"].map((h) => (
                        <th key={h} className="px-4 py-3 text-[11px] font-semibold text-slate-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.topCustomers.map((row) => (
                      <tr key={row.key} className="border-b border-slate-100 last:border-0">
                        <td className="px-4 py-3">
                          <p className="text-[13px] font-medium text-slate-900">{formatCustomerHeading(row)}</p>
                          <p className="text-[11px] text-slate-400">{maskDashboardEmail(row.email)}</p>
                        </td>
                        <td className="px-4 py-3 text-[13px] text-slate-700">{formatDashboardNumber(row.periodOrders)}</td>
                        <td className="px-4 py-3 text-[13px] text-slate-700">{formatDashboardPrice(row.periodRevenue)}</td>
                        <td className="px-4 py-3 text-[13px] text-slate-700">{formatDashboardPrice(row.periodAverageTicket)}</td>
                        <td className="px-4 py-3 text-[13px] text-slate-700">{formatDashboardShortDate(row.firstPurchaseAt)}</td>
                        <td className="px-4 py-3 text-[13px] text-slate-700">{formatDashboardShortDate(row.lastPurchaseAt)}</td>
                        <td className="px-4 py-3 text-[13px] text-slate-700">{formatDashboardPrice(row.ltvObserved)}</td>
                        <td className="px-4 py-3">
                          <span className={cn("rounded-[6px] border px-2 py-0.5 text-[11px] font-semibold", statusToneClass(row.status))}>
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
            <EmptyState title="No hay clientes para mostrar." description="Sin datos para este período." />
          )}
        </ChartCard>

        <ChartCard title="Frecuencia de compra" description="Cantidad de compras por cliente.">
          {hasFrequency ? (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              {metrics.frequency.map((bucket) => (
                <FrequencyCard key={bucket.label} label={bucket.label} customers={bucket.customers} share={bucket.share} />
              ))}
            </div>
          ) : (
            <EmptyState title="No hay frecuencia para mostrar." description="Sin datos para este período." />
          )}
        </ChartCard>
      </div>

      {/* Segunda compra + Cohorts */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard title="Segunda compra" description="Tiempo entre primera y segunda compra.">
          {hasSecondPurchase ? (
            <div className="space-y-0">
              <MetricRow label="Clientes con segunda compra" value={formatDashboardNumber(metrics.secondPurchase.customers)} />
              <MetricRow label="Promedio entre compras" value={formatNullableDays(metrics.secondPurchase.averageDays)} />
              <MetricRow label="Mediana entre compras" value={formatNullableDays(metrics.secondPurchase.medianDays)} />
            </div>
          ) : (
            <EmptyState title="Todavía no hay suficientes segundas compras." description="Sin datos para este período." />
          )}
        </ChartCard>

        <ChartCard title="Cohortes" description="Mes de primera compra y recompra.">
          {hasCohorts ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead className="border-b border-slate-100 text-left">
                  <tr>
                    {["Mes", "Adquiridos", "2ª compra", "% 2ª compra"].map((h) => (
                      <th key={h} className="px-4 py-3 text-[11px] font-semibold text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {metrics.cohorts.map((row) => (
                    <tr key={row.cohort} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-3 text-[13px] font-medium text-slate-900">{row.cohort}</td>
                      <td className="px-4 py-3 text-[13px] text-slate-700">{formatDashboardNumber(row.acquired)}</td>
                      <td className="px-4 py-3 text-[13px] text-slate-700">{formatDashboardNumber(row.secondPurchase)}</td>
                      <td className="px-4 py-3 text-[13px] text-slate-700">{formatDashboardPercent(row.secondPurchaseRate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No hay cohortes para mostrar." description="Sin datos para este período." />
          )}
        </ChartCard>
      </div>

      {/* Insights */}
      <ChartCard title="Señales" description="Resumen del período.">
        {hasInsights ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {metrics.insights.map((insight) => (
              <InsightCard key={`${insight.label}::${insight.value}`} label={insight.label} value={insight.value} tone={insight.tone} />
            ))}
          </div>
        ) : (
          <EmptyState title="Sin señales." description="Sin datos para este período." />
        )}
        <div className="mt-4 rounded-[10px] border border-[#e8e5e1] bg-[#faf9f7] px-4 py-4">
          <p className="text-[12px] font-semibold text-slate-500">Calidad de datos</p>
          <div className="mt-2 space-y-1.5 text-[13px] leading-5 text-slate-500">
            <p>Las métricas se calculan sobre compras con información suficiente para identificar al comprador.</p>
            <p>Las compras sin identificador confiable no se incluyen. LTV observado = facturación histórica acumulada.</p>
            <p>{metrics.notes.dataQualityNote}</p>
          </div>
        </div>
      </ChartCard>

      {/* Full customer table */}
      <ChartCard title="Tabla de clientes" description="Búsqueda, orden y paginación." className="min-w-0">
        <div className="space-y-4">
          {/* Search form */}
          <form method="get" className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="period" value={currentFilters.period} />
            <input type="hidden" name="sort" value={currentFilters.sort} />
            <input type="hidden" name="page" value="1" />
            <input type="hidden" name="pageSize" value={currentFilters.pageSize} />

            <div className="min-w-0 flex-1">
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold text-slate-400">Buscar cliente</span>
                <input
                  type="search"
                  name="q"
                  defaultValue={currentFilters.q}
                  placeholder="Nombre, email o teléfono"
                  className="w-full rounded-[8px] border border-[#e8e5e1] bg-white px-3.5 py-2.5 text-[13px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:ring-2 focus:ring-slate-100"
                />
              </label>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="rounded-[8px] border border-slate-800 bg-slate-800 px-4 py-2.5 text-[12px] font-semibold text-white transition hover:bg-slate-700"
              >
                Buscar
              </button>
              {currentFilters.q ? (
                <Link
                  href={buildCustomerHref({ ...currentFilters, q: "" }, { page: 1 })}
                  className="rounded-[8px] border border-[#e8e5e1] bg-white px-4 py-2.5 text-[12px] font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Limpiar
                </Link>
              ) : null}
            </div>
          </form>

          {/* Sort + page size pills */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap gap-1.5">
              {customerSortOptions.map((option) => {
                const active = currentFilters.sort === option.value;
                return (
                  <Link
                    key={option.value}
                    href={buildCustomerHref(currentFilters, { sort: option.value, page: 1 })}
                    className={cn(
                      "rounded-[8px] border px-3 py-1.5 text-[12px] font-semibold transition",
                      active
                        ? "border-slate-800 bg-slate-800 text-white"
                        : "border-[#e8e5e1] bg-white text-slate-600 hover:bg-slate-50",
                    )}
                  >
                    {option.label}
                  </Link>
                );
              })}
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400">Por página</span>
              {pageSizeOptions.map((option) => {
                const active = currentFilters.pageSize === option;
                return (
                  <Link
                    key={option}
                    href={buildCustomerHref(currentFilters, { pageSize: option, page: 1 })}
                    className={cn(
                      "rounded-[8px] border px-3 py-1.5 text-[12px] font-semibold transition",
                      active
                        ? "border-[#c4b5a5] bg-[#f4efea] text-[#6b4f3a]"
                        : "border-[#e8e5e1] bg-white text-slate-600 hover:bg-slate-50",
                    )}
                  >
                    {formatDashboardNumber(option)}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Table */}
          {hasTableRows ? (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full border-collapse text-sm">
                  <thead className="border-b border-slate-100 text-left">
                    <tr>
                      {["Cliente", "Pedidos", "Unidades", "Facturación", "Ticket", "1ª compra", "Última compra", "Entre compras", "Estado"].map((h) => (
                        <th key={h} className="px-4 py-3 text-[11px] font-semibold text-slate-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.table.rows.map((row) => (
                      <tr key={row.key} className="border-b border-slate-100 last:border-0">
                        <td className="px-4 py-3">
                          <p className="text-[13px] font-medium text-slate-900">{formatCustomerHeading(row)}</p>
                          <p className="text-[11px] text-slate-400">{maskDashboardEmail(row.email)}</p>
                        </td>
                        <td className="px-4 py-3 text-[13px] text-slate-700">{formatDashboardNumber(row.periodOrders)}</td>
                        <td className="px-4 py-3 text-[13px] text-slate-700">{formatDashboardNumber(row.periodUnits)}</td>
                        <td className="px-4 py-3 text-[13px] text-slate-700">{formatDashboardPrice(row.periodRevenue)}</td>
                        <td className="px-4 py-3 text-[13px] text-slate-700">{formatDashboardPrice(row.periodAverageTicket)}</td>
                        <td className="px-4 py-3 text-[13px] text-slate-700">{formatDashboardShortDate(row.firstPurchaseAt)}</td>
                        <td className="px-4 py-3 text-[13px] text-slate-700">{formatDashboardShortDate(row.lastPurchaseAt)}</td>
                        <td className="px-4 py-3 text-[13px] text-slate-700">{formatNullableDays(row.daysBetweenPurchases)}</td>
                        <td className="px-4 py-3">
                          <span className={cn("rounded-[6px] border px-2 py-0.5 text-[11px] font-semibold", statusToneClass(row.status))}>
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
    </DashboardSubpageShell>
  );
}
