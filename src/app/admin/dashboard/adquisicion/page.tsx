import Link from "next/link";
import type { Metadata } from "next";
import { ChartCard } from "@/features/admin/dashboard/components/chart-card";
import { DashboardSubpageShell } from "@/features/admin/dashboard/components/dashboard-subpage-shell";
import { EmptyState } from "@/features/admin/dashboard/components/empty-state";
import { KpiCard } from "@/features/admin/dashboard/components/kpi-card";
import { AcquisitionHorizontalBarChart } from "@/features/admin/dashboard/components/charts/acquisition-horizontal-bar-chart";
import {
  formatDashboardDateTime,
  formatDashboardNumber,
  formatDashboardPercent,
  formatDashboardPrice,
} from "@/features/admin/dashboard/lib/dashboard-formatters";
import {
  DASHBOARD_PERIODS,
  normalizeDashboardPeriodValue,
} from "@/features/admin/dashboard/server/dashboard-service";
import { cn } from "@/lib/utils";
import {
  getAcquisitionAnalyticsPageData,
  normalizeAcquisitionQuery,
  type AcquisitionFilters,
  type AcquisitionSortKey,
} from "@/features/admin/analytics/server/acquisition-analytics-service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Adquisición | DELUAR",
};

type AdminDashboardAcquisitionPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const acquisitionSortOptions: Array<{ value: AcquisitionSortKey; label: string }> = [
  { value: "revenue", label: "Facturación" },
  { value: "sessions", label: "Sesiones" },
  { value: "purchases", label: "Compras" },
  { value: "conversion", label: "Conversión" },
  { value: "abandonments", label: "Abandonos" },
];

function buildAcquisitionHref(filters: AcquisitionFilters, overrides: Partial<AcquisitionFilters> = {}) {
  const next = { ...filters, ...overrides };
  const params = new URLSearchParams();
  params.set("period", next.period);
  if (next.sort !== "revenue") params.set("sort", next.sort);
  const query = params.toString();
  return query ? `/admin/dashboard/adquisicion?${query}` : "/admin/dashboard/adquisicion";
}

function IconSessions() {
  return (
    <svg viewBox="0 0 22 22" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5h14M4 11h14M4 17h7" />
    </svg>
  );
}
function IconVisitors() {
  return (
    <svg viewBox="0 0 22 22" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="8" r="3.5" />
      <path d="M4 19c0-3.3 3.1-6 7-6s7 2.7 7 6" />
    </svg>
  );
}
function IconPurchases() {
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

function SourceMobileCard({ row }: {
  row: { source: string; medium: string; sessions: number; visitors: number; addToCart: number; checkoutStarted: number; orders: number; purchases: number; conversionRate: number; billingTotal: number; averageTicket: number; abandonments: number; };
}) {
  return (
    <article className="rounded-[10px] border border-[#e8e5e1] bg-white px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-slate-950">{row.source}</p>
          <p className="mt-0.5 truncate text-[12px] text-slate-400">{row.medium}</p>
        </div>
        <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-500">
          {formatDashboardPercent(row.conversionRate)}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {[
          ["Sesiones", formatDashboardNumber(row.sessions)],
          ["Visitantes", formatDashboardNumber(row.visitors)],
          ["Add to cart", formatDashboardNumber(row.addToCart)],
          ["Compras", formatDashboardNumber(row.purchases)],
          ["Facturación", formatDashboardPrice(row.billingTotal)],
          ["Abandonos", formatDashboardNumber(row.abandonments)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[8px] border border-slate-100 bg-slate-50 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
            <p className="mt-0.5 text-[12px] font-semibold text-slate-900">{value}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

function CampaignMobileCard({ row }: {
  row: { campaign: string; source: string; medium: string; sessions: number; addToCart: number; checkoutStarted: number; purchases: number; conversionRate: number; billingTotal: number; };
}) {
  return (
    <article className="rounded-[10px] border border-[#e8e5e1] bg-white px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-slate-950">{row.campaign}</p>
          <p className="mt-0.5 truncate text-[12px] text-slate-400">{row.source}{row.medium !== "—" ? ` · ${row.medium}` : ""}</p>
        </div>
        <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-500">
          {formatDashboardPercent(row.conversionRate)}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {[
          ["Sesiones", formatDashboardNumber(row.sessions)],
          ["Add to cart", formatDashboardNumber(row.addToCart)],
          ["Compras", formatDashboardNumber(row.purchases)],
          ["Facturación", formatDashboardPrice(row.billingTotal)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[8px] border border-slate-100 bg-slate-50 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
            <p className="mt-0.5 text-[12px] font-semibold text-slate-900">{value}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

function LandingMobileCard({ row }: {
  row: { landingPage: string; sessions: number; addToCart: number; purchases: number; conversionRate: number; billingTotal: number; };
}) {
  return (
    <article className="rounded-[10px] border border-[#e8e5e1] bg-white px-4 py-4">
      <p className="break-all text-[13px] font-semibold text-slate-950">{row.landingPage}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {[
          ["Sesiones", formatDashboardNumber(row.sessions)],
          ["Add to cart", formatDashboardNumber(row.addToCart)],
          ["Compras", formatDashboardNumber(row.purchases)],
          ["Conversión", formatDashboardPercent(row.conversionRate)],
          ["Facturación", formatDashboardPrice(row.billingTotal)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[8px] border border-slate-100 bg-slate-50 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
            <p className="mt-0.5 text-[12px] font-semibold text-slate-900">{value}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

function ReferrerMobileCard({ row }: {
  row: { referrer: string; sessions: number; purchases: number; billingTotal: number; };
}) {
  return (
    <article className="rounded-[10px] border border-[#e8e5e1] bg-white px-4 py-4">
      <p className="break-all text-[13px] font-semibold text-slate-950">{row.referrer}</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[
          ["Sesiones", formatDashboardNumber(row.sessions)],
          ["Compras", formatDashboardNumber(row.purchases)],
          ["Facturación", formatDashboardPrice(row.billingTotal)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[8px] border border-slate-100 bg-slate-50 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
            <p className="mt-0.5 text-[12px] font-semibold text-slate-900">{value}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

export default async function AdminDashboardAcquisitionPage({ searchParams }: AdminDashboardAcquisitionPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const normalizedPeriod = normalizeDashboardPeriodValue(
    Array.isArray(resolvedSearchParams.period) ? resolvedSearchParams.period[0] : resolvedSearchParams.period,
  );
  const query = normalizeAcquisitionQuery({ ...resolvedSearchParams, period: normalizedPeriod });
  const metrics = await getAcquisitionAnalyticsPageData(query);
  const lastUpdated = formatDashboardDateTime(new Date());

  const sourceSessionsChart = [...metrics.sources]
    .sort((a, b) => b.sessions - a.sessions || b.billingTotal - a.billingTotal)
    .slice(0, 8)
    .map((row) => ({ id: `${row.source}::${row.medium}`, label: row.source, subtitle: row.medium !== "—" ? row.medium : undefined, value: row.sessions }));

  const sourceRevenueChart = [...metrics.sources]
    .sort((a, b) => b.billingTotal - a.billingTotal || b.sessions - a.sessions)
    .slice(0, 8)
    .map((row) => ({ id: `${row.source}::${row.medium}`, label: row.source, subtitle: row.medium !== "—" ? row.medium : undefined, value: row.billingTotal }));

  const sourceConversionCandidates = metrics.sources.filter((row) => row.sessions >= metrics.sampleSizeRule.minSessionsForConversionRank);
  const sourceConversionChartSource = sourceConversionCandidates.length > 0 ? sourceConversionCandidates : metrics.sources;
  const sourceConversionChart = [...sourceConversionChartSource]
    .sort((a, b) => b.conversionRate - a.conversionRate || b.sessions - a.sessions)
    .slice(0, 8)
    .map((row) => ({
      id: `${row.source}::${row.medium}`,
      label: row.source,
      subtitle: row.sessions >= metrics.sampleSizeRule.minSessionsForConversionRank ? row.medium : `Muestra: ${formatDashboardNumber(row.sessions)} sesiones`,
      value: row.conversionRate,
    }));

  const campaignChart = [...metrics.campaigns]
    .sort((a, b) => b.billingTotal - a.billingTotal || b.sessions - a.sessions)
    .slice(0, 8)
    .map((row) => ({
      id: `${row.campaign}::${row.source}::${row.medium}`,
      label: row.campaign,
      subtitle: `${row.source}${row.medium !== "—" ? ` · ${row.medium}` : ""}`,
      value: row.billingTotal,
    }));

  const currentFilters: AcquisitionFilters = { period: query.period, sort: query.sort };
  const hasSourceRows = metrics.sources.length > 0;
  const hasCampaignRows = metrics.campaigns.length > 0;
  const hasLandingRows = metrics.landingPages.length > 0;
  const hasReferrerRows = metrics.referrers.length > 0;
  const periodLabel = DASHBOARD_PERIODS[query.period].label;

  return (
    <DashboardSubpageShell
      sectionLabel="Adquisición"
      title="Adquisición"
      subtitle={`Fuentes y rendimiento del tráfico. Período activo: ${periodLabel}.`}
      lastUpdated={lastUpdated}
    >
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard
          title="Sesiones"
          value={formatDashboardNumber(metrics.summary.sessions)}
          description="Sesiones iniciadas en el período."
          icon={<IconSessions />}
          tone="neutral"
        />
        <KpiCard
          title="Visitantes"
          value={formatDashboardNumber(metrics.summary.uniqueVisitors)}
          description="Visitantes únicos identificados."
          icon={<IconVisitors />}
          tone="accent"
        />
        <KpiCard
          title="Compras"
          value={formatDashboardNumber(metrics.summary.purchases)}
          description="Compras atribuidas a la sesión."
          icon={<IconPurchases />}
          tone="success"
        />
        <KpiCard
          title="Facturación"
          value={formatDashboardPrice(metrics.summary.billingTotal)}
          description="Ingresos atribuidos por sesión."
          icon={<IconRevenue />}
          tone="warning"
        />
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Add to cart", value: formatDashboardNumber(metrics.summary.addToCartSessions) },
          { label: "Checkout iniciado", value: formatDashboardNumber(metrics.summary.checkoutStartedSessions) },
          { label: "Conversión", value: formatDashboardPercent(metrics.summary.conversionRate) },
          { label: "Ticket promedio", value: formatDashboardPrice(metrics.summary.averageTicket) },
        ].map((m) => (
          <div key={m.label} className="rounded-[10px] border border-[#e8e5e1] bg-white px-4 py-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{m.label}</p>
            <p className="mt-1.5 text-[1.25rem] font-semibold leading-none tracking-[-0.03em] text-slate-900">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Source highlights */}
      <ChartCard title="Resumen de fuentes" description={`Principales fuentes del período — ${periodLabel}.`}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: metrics.highlights.traffic?.label ?? "Fuente con más tráfico", value: metrics.highlights.traffic?.value ?? "Sin datos", subtitle: metrics.highlights.traffic?.subtitle },
            { label: metrics.highlights.purchases?.label ?? "Fuente con más compras", value: metrics.highlights.purchases?.value ?? "Sin datos", subtitle: metrics.highlights.purchases?.subtitle },
            { label: metrics.highlights.conversion?.label ?? "Mejor conversión", value: metrics.highlights.conversion?.value ?? "Sin datos", subtitle: metrics.highlights.conversion?.subtitle },
            { label: metrics.highlights.revenue?.label ?? "Mayor facturación", value: metrics.highlights.revenue?.value ?? "Sin datos", subtitle: metrics.highlights.revenue?.subtitle },
          ].map((tile) => (
            <div key={tile.label} className="rounded-[10px] border border-[#e8e5e1] bg-[#faf9f7] px-4 py-3.5">
              <p className="text-[11px] font-semibold text-slate-400">{tile.label}</p>
              <p className="mt-1.5 text-[1.1rem] font-semibold tracking-[-0.03em] text-slate-950">{tile.value}</p>
              {tile.subtitle ? <p className="mt-0.5 text-[11px] text-slate-400">{tile.subtitle}</p> : null}
            </div>
          ))}
        </div>
      </ChartCard>

      {/* Source charts 2-col */}
      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Sesiones por fuente" description="Fuentes de tráfico ordenadas por sesiones." className="min-w-0">
          <AcquisitionHorizontalBarChart data={sourceSessionsChart} metricLabel="Sesiones" metricFormat="number" emptyTitle="Sin datos para este período." emptyDescription="Las fuentes se mostrarán cuando haya sesiones." />
        </ChartCard>
        <ChartCard title="Facturación por fuente" description="Ingresos atribuidos por fuente de sesión." className="min-w-0">
          <AcquisitionHorizontalBarChart data={sourceRevenueChart} metricLabel="Facturación" metricFormat="currency" emptyTitle="Sin datos para este período." emptyDescription="Las fuentes se mostrarán cuando haya compras." />
        </ChartCard>
        <ChartCard title="Conversión por fuente" description="Sesiones con compra sobre sesiones totales. Se priorizan fuentes con al menos 10 sesiones." className="min-w-0">
          <AcquisitionHorizontalBarChart data={sourceConversionChart} metricLabel="Conversión" metricFormat="percentage" emptyTitle="Sin datos para este período." emptyDescription="La conversión se mostrará cuando haya sesiones." />
        </ChartCard>
        <ChartCard title="Top campañas" description="Campañas con mayor facturación atribuida." className="min-w-0">
          <AcquisitionHorizontalBarChart data={campaignChart} metricLabel="Facturación" metricFormat="currency" emptyTitle="Sin campañas para este período." emptyDescription="Las campañas se mostrarán cuando haya UTMs." />
        </ChartCard>
      </div>

      {/* Source table */}
      <ChartCard title="Tabla principal de fuentes" description="Ordená por facturación, sesiones, compras, conversión o abandonos." className="min-w-0">
        <div className="flex flex-wrap gap-2">
          {acquisitionSortOptions.map((option) => {
            const active = query.sort === option.value;
            return (
              <Link
                key={option.value}
                href={buildAcquisitionHref(currentFilters, { sort: option.value })}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[11px] font-semibold transition",
                  active
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-[#e8e5e1] bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
                )}
              >
                {option.label}
              </Link>
            );
          })}
        </div>
        <div className="mt-4">
          {hasSourceRows ? (
            <>
              <div className="hidden overflow-hidden rounded-[10px] border border-[#e8e5e1] md:block">
                <div className="overflow-x-auto">
                  <table className="min-w-[1480px] w-full border-collapse">
                    <thead className="bg-slate-50 text-left">
                      <tr>
                        {["Fuente", "Medium", "Sesiones", "Visitantes", "Add to cart", "Checkout", "Órdenes", "Compras", "Conversión", "Facturación", "Ticket", "Abandonos"].map((h) => (
                          <th key={h} className="px-4 py-3 text-[11px] font-semibold text-slate-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.sources.map((row) => (
                        <tr key={`${row.source}::${row.medium}`} className="border-t border-[#e8e5e1]">
                          <td className="px-4 py-3 text-[13px] font-medium text-slate-900">{row.source}</td>
                          <td className="px-4 py-3 text-[13px] text-slate-500">{row.medium}</td>
                          <td className="px-4 py-3 text-[13px] text-slate-700">{formatDashboardNumber(row.sessions)}</td>
                          <td className="px-4 py-3 text-[13px] text-slate-700">{formatDashboardNumber(row.visitors)}</td>
                          <td className="px-4 py-3 text-[13px] text-slate-700">{formatDashboardNumber(row.addToCart)}</td>
                          <td className="px-4 py-3 text-[13px] text-slate-700">{formatDashboardNumber(row.checkoutStarted)}</td>
                          <td className="px-4 py-3 text-[13px] text-slate-700">{formatDashboardNumber(row.orders)}</td>
                          <td className="px-4 py-3 text-[13px] text-slate-700">{formatDashboardNumber(row.purchases)}</td>
                          <td className="px-4 py-3 text-[13px] text-slate-700">{formatDashboardPercent(row.conversionRate)}</td>
                          <td className="px-4 py-3 text-[13px] text-slate-700">{formatDashboardPrice(row.billingTotal)}</td>
                          <td className="px-4 py-3 text-[13px] text-slate-700">{formatDashboardPrice(row.averageTicket)}</td>
                          <td className="px-4 py-3 text-[13px] text-slate-700">{formatDashboardNumber(row.abandonments)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="grid gap-3 md:hidden">
                {metrics.sources.map((row) => (
                  <SourceMobileCard key={`${row.source}::${row.medium}`} row={row} />
                ))}
              </div>
            </>
          ) : (
            <EmptyState title="Sin datos para este período." description="La tabla se mostrará cuando haya sesiones." />
          )}
        </div>
      </ChartCard>

      {/* Campaigns table */}
      <ChartCard title="Campañas" description="Comparación de campañas UTM del período." className="min-w-0">
        {hasCampaignRows ? (
          <>
            <div className="hidden overflow-hidden rounded-[10px] border border-[#e8e5e1] md:block">
              <div className="overflow-x-auto">
                <table className="min-w-[1120px] w-full border-collapse">
                  <thead className="bg-slate-50 text-left">
                    <tr>
                      {["Campaña", "Fuente", "Sesiones", "Add to cart", "Checkout", "Compras", "Conversión", "Facturación"].map((h) => (
                        <th key={h} className="px-4 py-3 text-[11px] font-semibold text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.campaigns.map((row) => (
                      <tr key={`${row.campaign}::${row.source}::${row.medium}`} className="border-t border-[#e8e5e1]">
                        <td className="px-4 py-3">
                          <p className="text-[13px] font-medium text-slate-900">{row.campaign}</p>
                          <p className="text-[11px] text-slate-400">{row.medium !== "—" ? row.medium : "Sin medium"}</p>
                        </td>
                        <td className="px-4 py-3 text-[13px] text-slate-500">{row.source}</td>
                        <td className="px-4 py-3 text-[13px] text-slate-700">{formatDashboardNumber(row.sessions)}</td>
                        <td className="px-4 py-3 text-[13px] text-slate-700">{formatDashboardNumber(row.addToCart)}</td>
                        <td className="px-4 py-3 text-[13px] text-slate-700">{formatDashboardNumber(row.checkoutStarted)}</td>
                        <td className="px-4 py-3 text-[13px] text-slate-700">{formatDashboardNumber(row.purchases)}</td>
                        <td className="px-4 py-3 text-[13px] text-slate-700">{formatDashboardPercent(row.conversionRate)}</td>
                        <td className="px-4 py-3 text-[13px] text-slate-700">{formatDashboardPrice(row.billingTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="grid gap-3 md:hidden">
              {metrics.campaigns.map((row) => (
                <CampaignMobileCard key={`${row.campaign}::${row.source}::${row.medium}`} row={row} />
              ))}
            </div>
          </>
        ) : (
          <EmptyState title="Sin campañas para este período." description="La tabla se mostrará cuando haya campañas UTM." />
        )}
      </ChartCard>

      {/* Landing + Referrer 2-col */}
      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Landing pages" description="Páginas de entrada del período." className="min-w-0">
          {hasLandingRows ? (
            <>
              <div className="hidden overflow-hidden rounded-[10px] border border-[#e8e5e1] md:block">
                <div className="overflow-x-auto">
                  <table className="min-w-[900px] w-full border-collapse">
                    <thead className="bg-slate-50 text-left">
                      <tr>
                        {["Landing page", "Sesiones", "Add to cart", "Compras", "Conversión", "Facturación"].map((h) => (
                          <th key={h} className="px-4 py-3 text-[11px] font-semibold text-slate-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.landingPages.map((row) => (
                        <tr key={row.landingPage} className="border-t border-[#e8e5e1]">
                          <td className="px-4 py-3 text-[13px] font-medium text-slate-900 break-all">{row.landingPage}</td>
                          <td className="px-4 py-3 text-[13px] text-slate-700">{formatDashboardNumber(row.sessions)}</td>
                          <td className="px-4 py-3 text-[13px] text-slate-700">{formatDashboardNumber(row.addToCart)}</td>
                          <td className="px-4 py-3 text-[13px] text-slate-700">{formatDashboardNumber(row.purchases)}</td>
                          <td className="px-4 py-3 text-[13px] text-slate-700">{formatDashboardPercent(row.conversionRate)}</td>
                          <td className="px-4 py-3 text-[13px] text-slate-700">{formatDashboardPrice(row.billingTotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="grid gap-3 md:hidden">
                {metrics.landingPages.map((row) => <LandingMobileCard key={row.landingPage} row={row} />)}
              </div>
            </>
          ) : (
            <EmptyState title="Sin landing pages para este período." description="La tabla se mostrará cuando haya sesiones." />
          )}
        </ChartCard>

        <ChartCard title="Referencias" description="Referrers del período." className="min-w-0">
          {hasReferrerRows ? (
            <>
              <div className="hidden overflow-hidden rounded-[10px] border border-[#e8e5e1] md:block">
                <div className="overflow-x-auto">
                  <table className="min-w-[700px] w-full border-collapse">
                    <thead className="bg-slate-50 text-left">
                      <tr>
                        {["Referrer", "Sesiones", "Compras", "Facturación"].map((h) => (
                          <th key={h} className="px-4 py-3 text-[11px] font-semibold text-slate-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.referrers.map((row) => (
                        <tr key={row.referrer} className="border-t border-[#e8e5e1]">
                          <td className="px-4 py-3 text-[13px] font-medium text-slate-900 break-all">{row.referrer}</td>
                          <td className="px-4 py-3 text-[13px] text-slate-700">{formatDashboardNumber(row.sessions)}</td>
                          <td className="px-4 py-3 text-[13px] text-slate-700">{formatDashboardNumber(row.purchases)}</td>
                          <td className="px-4 py-3 text-[13px] text-slate-700">{formatDashboardPrice(row.billingTotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="grid gap-3 md:hidden">
                {metrics.referrers.map((row) => <ReferrerMobileCard key={row.referrer} row={row} />)}
              </div>
            </>
          ) : (
            <EmptyState title="Sin referencias para este período." description="La tabla se mostrará cuando haya referrers." />
          )}
        </ChartCard>
      </div>
    </DashboardSubpageShell>
  );
}
