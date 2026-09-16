import Link from "next/link";
import type { Metadata } from "next";
import { DateRangeFilter } from "@/features/admin/dashboard/components/date-range-filter";
import {
  AcqHighlight,
  AcqKpi,
  AcqModule,
  IconConversion,
  IconMoney,
  IconPurchases,
  IconRevenue,
  IconSessions,
  IconTraffic,
  IconVisitors,
  type HighlightTone,
} from "@/features/admin/dashboard/components/acquisition/acquisition-ui";
import {
  OverviewEmpty,
  overviewColor,
} from "@/features/admin/dashboard/components/overview/overview-ui";
import { AcquisitionHorizontalBarChart } from "@/features/admin/dashboard/components/charts/acquisition-horizontal-bar-chart";
import {
  DASHBOARD_PERIODS,
  normalizeDashboardPeriodValue,
} from "@/features/admin/dashboard/server/dashboard-service";
import {
  formatDashboardNumber,
  formatDashboardPercent,
  formatDashboardPrice,
} from "@/features/admin/dashboard/lib/dashboard-formatters";
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

const ARGENTINA_TIME_ZONE = "America/Argentina/Buenos_Aires";

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

function buildAcquisitionHref(
  filters: AcquisitionFilters,
  overrides: Partial<AcquisitionFilters> = {},
) {
  const next = { ...filters, ...overrides };
  const params = new URLSearchParams();
  params.set("period", next.period);
  if (next.sort !== "revenue") params.set("sort", next.sort);
  const query = params.toString();
  return query ? `/admin/dashboard/adquisicion?${query}` : "/admin/dashboard/adquisicion";
}

function formatGeneratedAt(value: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: ARGENTINA_TIME_ZONE,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}

const CELL = "px-2 py-2 align-middle whitespace-nowrap text-[13px] tabular-nums text-text-secondary";

/**
 * Fixed columns with declared widths: the reference shows no horizontal
 * scrollbar on any table, so the grid is sized to the space available instead
 * of overflowing it.
 */
function DataTable({
  headers,
  widths,
  children,
  dense = false,
}: {
  headers: string[];
  widths: string[];
  children: React.ReactNode;
  /** Half-width modules pack the same column count into half the space. */
  dense?: boolean;
}) {
  return (
    <table className="w-full table-fixed border-collapse">
      <colgroup>
        {widths.map((width, index) => (
          <col key={index} style={{ width }} />
        ))}
      </colgroup>
      <thead>
        <tr className="border-y border-border bg-surface-elevated">
          {headers.map((header) => (
            <th
              key={header}
              scope="col"
              className={cn(
                "px-2 py-2.5 text-left align-bottom font-semibold uppercase text-text-secondary",
                dense
                  ? "px-1.5 text-[9.5px] leading-[1.25] tracking-[0.05em]"
                  : "text-[10px] leading-[1.25] tracking-[0.07em]",
              )}
            >
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}

export default async function AdminDashboardAcquisitionPage({
  searchParams,
}: AdminDashboardAcquisitionPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const normalizedPeriod = normalizeDashboardPeriodValue(
    Array.isArray(resolvedSearchParams.period)
      ? resolvedSearchParams.period[0]
      : resolvedSearchParams.period,
  );
  const query = normalizeAcquisitionQuery({ ...resolvedSearchParams, period: normalizedPeriod });
  const metrics = await getAcquisitionAnalyticsPageData(query);

  const lastUpdated = formatGeneratedAt(new Date());
  const periodLabel = DASHBOARD_PERIODS[query.period].label;
  const currentFilters: AcquisitionFilters = { period: query.period, sort: query.sort };

  const sourceSessionsChart = [...metrics.sources]
    .sort((a, b) => b.sessions - a.sessions || b.billingTotal - a.billingTotal)
    .slice(0, 8)
    .map((row) => ({
      id: `${row.source}::${row.medium}`,
      label: row.source,
      subtitle: row.medium !== "—" ? row.medium : undefined,
      value: row.sessions,
    }));

  const sourceRevenueChart = [...metrics.sources]
    .sort((a, b) => b.billingTotal - a.billingTotal || b.sessions - a.sessions)
    .slice(0, 8)
    .map((row) => ({
      id: `${row.source}::${row.medium}`,
      label: row.source,
      subtitle: row.medium !== "—" ? row.medium : undefined,
      value: row.billingTotal,
    }));

  const sourceConversionCandidates = metrics.sources.filter(
    (row) => row.sessions >= metrics.sampleSizeRule.minSessionsForConversionRank,
  );
  const sourceConversionChartSource =
    sourceConversionCandidates.length > 0 ? sourceConversionCandidates : metrics.sources;
  const sourceConversionChart = [...sourceConversionChartSource]
    .sort((a, b) => b.conversionRate - a.conversionRate || b.sessions - a.sessions)
    .slice(0, 8)
    .map((row) => ({
      id: `${row.source}::${row.medium}`,
      label: row.source,
      subtitle:
        row.sessions >= metrics.sampleSizeRule.minSessionsForConversionRank
          ? row.medium
          : `Muestra: ${formatDashboardNumber(row.sessions)} sesiones`,
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

  const highlights: Array<{
    fallback: string;
    data: (typeof metrics.highlights)["traffic"];
    icon: React.ReactNode;
    tone: HighlightTone;
  }> = [
    {
      fallback: "Fuente con más tráfico",
      data: metrics.highlights.traffic,
      icon: <IconTraffic />,
      tone: "neutral",
    },
    {
      fallback: "Fuente con más compras",
      data: metrics.highlights.purchases,
      icon: <IconPurchases />,
      tone: "positive",
    },
    {
      fallback: "Mejor conversión",
      data: metrics.highlights.conversion,
      icon: <IconConversion />,
      tone: "info",
    },
    {
      fallback: "Fuente con más facturación",
      data: metrics.highlights.revenue,
      icon: <IconMoney />,
      tone: "warning",
    },
  ];

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center gap-5 border-b border-border bg-background px-6 lg:px-8">
        <nav aria-label="Ubicación" className="min-w-0 flex-1">
          <ol className="flex items-center gap-2 text-[13px]">
            <li className="font-medium text-text-secondary">Estadísticas</li>
            <li aria-hidden className="text-text-secondary">
              /
            </li>
            <li className="font-semibold text-text-primary" aria-current="page">
              Adquisición
            </li>
          </ol>
        </nav>
        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden items-center gap-2 text-[12px] tabular-nums text-text-secondary lg:flex">
            <span aria-hidden className="h-[6px] w-[6px] rounded-full bg-[#1f9d55]" />
            Actualizado {lastUpdated}
          </span>
          <DateRangeFilter topBar />
        </div>
      </header>

      <div className="flex-1 px-6 pb-12 pt-6 lg:px-8">
        <div className="w-full min-w-0">
          <h1 className="text-[2.4rem] font-semibold leading-none tracking-[-0.04em] text-text-primary">
            Adquisición
          </h1>
          <p className="mt-3 text-[13.5px] text-text-secondary">
            Fuentes y rendimiento del tráfico · {periodLabel}
          </p>

          {/* ── Row 1 · four equal KPIs ─────────────────────────────────────── */}
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <AcqKpi
              icon={<IconSessions />}
              accent
              label="Sesiones"
              value={formatDashboardNumber(metrics.summary.sessions)}
              description="Sesiones iniciadas dentro de la cohorte."
            />
            <AcqKpi
              icon={<IconVisitors />}
              label="Visitantes"
              value={formatDashboardNumber(metrics.summary.uniqueVisitors)}
              description="Visitantes únicos en esas sesiones."
            />
            <AcqKpi
              icon={<IconPurchases />}
              label="Compras"
              value={formatDashboardNumber(metrics.summary.purchases)}
              description="Compras reales atribuidas a la sesión."
            />
            <AcqKpi
              icon={<IconRevenue />}
              label="Facturación"
              value={formatDashboardPrice(metrics.summary.billingTotal)}
              description="Ingresos totales atribuidos por sesión."
            />
          </div>

          {/* ── Row 2 · four standalone source highlights ───────────────────── */}
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {highlights.map((item) => (
              <AcqHighlight
                key={item.fallback}
                label={item.data?.label ?? item.fallback}
                value={item.data?.value ?? "Sin datos"}
                subtitle={item.data?.subtitle}
                href={item.data?.href}
                icon={item.icon}
                tone={item.tone}
              />
            ))}
          </div>

          {/* ── Row 3 · 50 / 50 ─────────────────────────────────────────────── */}
          <div className="mt-3 grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-2">
            <AcqModule
              title="Sesiones por fuente"
              note="Comparación de fuentes de tráfico por sesiones de la cohorte."
              periodLabel={periodLabel}
            >
              <div className="px-5 pb-5">
                <AcquisitionHorizontalBarChart
                  data={sourceSessionsChart}
                  metricLabel="Sesiones"
                  metricFormat="number"
                  color={overviewColor.series}
                  emptyTitle="Sin datos para este período."
                  emptyDescription="Las fuentes se mostrarán cuando haya sesiones."
                />
              </div>
            </AcqModule>

            <AcqModule
              title="Facturación por fuente"
              note="Ingresos atribuidos por sesión de atribución."
              periodLabel={periodLabel}
            >
              <div className="px-5 pb-5">
                <AcquisitionHorizontalBarChart
                  data={sourceRevenueChart}
                  metricLabel="Facturación"
                  metricFormat="currency"
                  color={overviewColor.series}
                  emptyTitle="Sin datos para este período."
                  emptyDescription="Las fuentes se mostrarán cuando haya compras."
                />
              </div>
            </AcqModule>
          </div>

          {/* ── Row 4 · 50 / 50 ─────────────────────────────────────────────── */}
          <div className="mt-3 grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-2">
            <AcqModule
              title="Conversión por fuente"
              note="Conversión de sesiones con compra sobre sesiones totales."
              periodLabel={periodLabel}
            >
              <div className="px-5 pb-5">
                <AcquisitionHorizontalBarChart
                  data={sourceConversionChart}
                  metricLabel="Conversión"
                  metricFormat="percentage"
                  color={overviewColor.series}
                  emptyTitle="Sin datos para este período."
                  emptyDescription="La conversión se mostrará cuando haya sesiones."
                />
              </div>
            </AcqModule>

            <AcqModule
              title="Top campañas"
              note="Campañas con mayor facturación atribuida."
              periodLabel={periodLabel}
            >
              <div className="px-5 pb-5">
                <AcquisitionHorizontalBarChart
                  data={campaignChart}
                  metricLabel="Facturación"
                  metricFormat="currency"
                  color={overviewColor.series}
                  emptyTitle="Sin campañas para este período."
                  emptyDescription="Las campañas se mostrarán cuando haya UTMs."
                />
              </div>
            </AcqModule>
          </div>

          {/* ── Row 5 · full width source table ─────────────────────────────── */}
          <AcqModule
            title="Tabla principal de fuentes"
            note="Ordená por facturación, sesiones, compras, conversión o abandonos."
            action={{ href: "/admin/dashboard/conversion", label: "Ver conversión" }}
            className="mt-3"
          >
            <div className="flex flex-wrap gap-2 px-5 pb-4">
              {acquisitionSortOptions.map((option) => {
                const active = query.sort === option.value;

                return (
                  <Link
                    key={option.value}
                    href={buildAcquisitionHref(currentFilters, { sort: option.value })}
                    className={cn(
                      "rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-colors",
                      active
                        ? "border-[#4f52c9] bg-[#4f52c9] text-white"
                        : "border-border bg-surface text-text-secondary hover:text-text-primary",
                    )}
                  >
                    {option.label}
                  </Link>
                );
              })}
            </div>

            {metrics.sources.length > 0 ? (
              <DataTable
                widths={[
                  "3%", "10%", "6%", "7.5%", "8%", "9%", "8%",
                  "7.5%", "7.5%", "9%", "9.5%", "7%", "8%",
                ]}
                headers={[
                  "#",
                  "Fuente",
                  "Medium",
                  "Sesiones",
                  "Visitantes",
                  "Add to cart",
                  "Checkout",
                  "Órdenes",
                  "Compras",
                  "Conversión",
                  "Facturación",
                  "Ticket",
                  "Abandonos",
                ]}
              >
                {metrics.sources.map((row, index) => (
                  <tr
                    key={`${row.source}::${row.medium}`}
                    className="border-b border-border last:border-b-0"
                  >
                    <td className={cn(CELL, "text-text-secondary")}>{index + 1}</td>
                    <td className={cn(CELL, "truncate font-medium text-text-primary")} title={row.source}>
                      {row.source}
                    </td>
                    <td className={cn(CELL, "text-text-secondary")}>{row.medium}</td>
                    <td className={CELL}>{formatDashboardNumber(row.sessions)}</td>
                    <td className={CELL}>{formatDashboardNumber(row.visitors)}</td>
                    <td className={CELL}>{formatDashboardNumber(row.addToCart)}</td>
                    <td className={CELL}>{formatDashboardNumber(row.checkoutStarted)}</td>
                    <td className={CELL}>{formatDashboardNumber(row.orders)}</td>
                    <td className={CELL}>{formatDashboardNumber(row.purchases)}</td>
                    <td
                      className={cn(
                        CELL,
                        "font-semibold",
                        row.conversionRate > 0 ? "text-success" : "text-text-secondary",
                      )}
                    >
                      {formatDashboardPercent(row.conversionRate)}
                    </td>
                    <td className={cn(CELL, "font-semibold text-text-primary")}>
                      {formatDashboardPrice(row.billingTotal)}
                    </td>
                    <td className={CELL}>{formatDashboardPrice(row.averageTicket)}</td>
                    <td className={CELL}>{formatDashboardNumber(row.abandonments)}</td>
                  </tr>
                ))}
              </DataTable>
            ) : (
              <OverviewEmpty message="Sin sesiones registradas en el período." />
            )}
          </AcqModule>

          {/* ── Row 6 · 50 / 50 ─────────────────────────────────────────────── */}
          <div className="mt-3 grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-2">
            <AcqModule
              title="Campañas"
              note="Comparación de campañas del período."
              periodLabel={periodLabel}
            >
              {metrics.campaigns.length > 0 ? (
                <DataTable
                  dense
                  widths={[
                    "5%", "19%", "14%", "10%", "12%", "10%", "9%", "10%", "11%",
                  ]}
                  headers={[
                    "#",
                    "Campaña",
                    "Fuente",
                    "Sesiones",
                    "Add to cart",
                    "Checkout",
                    "Compras",
                    "Conversión",
                    "Facturación",
                  ]}
                >
                  {metrics.campaigns.map((row, index) => (
                    <tr
                      key={`${row.campaign}::${row.source}::${row.medium}`}
                      className="border-b border-border last:border-b-0"
                    >
                      <td className={cn(CELL, "text-text-secondary")}>{index + 1}</td>
                      <td className={cn(CELL, "truncate font-medium text-text-primary")} title={row.campaign}>
                        {row.campaign}
                      </td>
                      <td className={cn(CELL, "truncate text-text-secondary")} title={row.source}>
                        {row.source}
                      </td>
                      <td className={CELL}>{formatDashboardNumber(row.sessions)}</td>
                      <td className={CELL}>{formatDashboardNumber(row.addToCart)}</td>
                      <td className={CELL}>{formatDashboardNumber(row.checkoutStarted)}</td>
                      <td className={CELL}>{formatDashboardNumber(row.purchases)}</td>
                      <td
                        className={cn(
                          CELL,
                          "font-semibold",
                          row.conversionRate > 0 ? "text-success" : "text-text-secondary",
                        )}
                      >
                        {formatDashboardPercent(row.conversionRate)}
                      </td>
                      <td className={cn(CELL, "font-semibold text-text-primary")}>
                        {formatDashboardPrice(row.billingTotal)}
                      </td>
                    </tr>
                  ))}
                </DataTable>
              ) : (
                <OverviewEmpty message="Sin campañas UTM registradas en el período." />
              )}
            </AcqModule>

            <AcqModule
              title="Landing pages"
              note="Páginas de entrada del período."
              periodLabel={periodLabel}
            >
              {metrics.landingPages.length > 0 ? (
                <DataTable
                  dense
                  widths={["5%", "37%", "13%", "15%", "13%", "17%"]}
                  headers={[
                    "#",
                    "Landing page",
                    "Sesiones",
                    "Add to cart",
                    "Compras",
                    "Facturación",
                  ]}
                >
                  {metrics.landingPages.map((row, index) => (
                    <tr
                      key={row.landingPage}
                      className="border-b border-border last:border-b-0"
                    >
                      <td className={cn(CELL, "text-text-secondary")}>{index + 1}</td>
                      <td
                        className={cn(CELL, "truncate font-medium text-text-primary")}
                        title={row.landingPage}
                      >
                        {row.landingPage}
                      </td>
                      <td className={CELL}>{formatDashboardNumber(row.sessions)}</td>
                      <td className={CELL}>{formatDashboardNumber(row.addToCart)}</td>
                      <td className={CELL}>{formatDashboardNumber(row.purchases)}</td>
                      <td className={cn(CELL, "font-semibold text-text-primary")}>
                        {formatDashboardPrice(row.billingTotal)}
                      </td>
                    </tr>
                  ))}
                </DataTable>
              ) : (
                <OverviewEmpty message="Sin landing pages registradas en el período." />
              )}
            </AcqModule>
          </div>
        </div>
      </div>
    </main>
  );
}
