import Link from "next/link";
import type { Metadata } from "next";
import { ChartCard } from "@/features/admin/dashboard/components/chart-card";
import { DashboardShell } from "@/features/admin/dashboard/components/dashboard-shell";
import { EmptyState } from "@/features/admin/dashboard/components/empty-state";
import { KpiCard } from "@/features/admin/dashboard/components/kpi-card";
import { StatBadge } from "@/features/admin/dashboard/components/stat-badge";
import { AcquisitionHorizontalBarChart } from "@/features/admin/dashboard/components/charts/acquisition-horizontal-bar-chart";
import { dashboardToneStyles } from "@/features/admin/dashboard/lib/dashboard-ui";
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
  title: "Adquisicion | Panel de comercio de DOTCOM",
};

type AdminDashboardAcquisitionPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const acquisitionSortOptions: Array<{ value: AcquisitionSortKey; label: string }> = [
  { value: "revenue", label: "Facturacion" },
  { value: "sessions", label: "Sesiones" },
  { value: "purchases", label: "Compras" },
  { value: "conversion", label: "Conversion" },
  { value: "abandonments", label: "Abandonos" },
];

function buildAcquisitionHref(filters: AcquisitionFilters, overrides: Partial<AcquisitionFilters> = {}) {
  const next = { ...filters, ...overrides };
  const params = new URLSearchParams();

  params.set("period", next.period);

  if (next.sort !== "revenue") {
    params.set("sort", next.sort);
  }

  const query = params.toString();
  return query ? `/admin/dashboard/adquisicion?${query}` : "/admin/dashboard/adquisicion";
}

function formatCurrencyShort(value: number) {
  return formatDashboardPrice(value);
}

function HighlightTile({
  label,
  value,
  subtitle,
  tone = "neutral",
}: {
  label: string;
  value: string;
  subtitle?: string;
  tone?: "neutral" | "success" | "warning" | "accent";
}) {
  return (
    <div className={cn("rounded-[18px] border px-4 py-3 sm:px-4 sm:py-4", dashboardToneStyles[tone])}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 text-[1.05rem] font-semibold tracking-[-0.04em] text-slate-950 sm:text-[1.2rem]">{value}</p>
      {subtitle ? <p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p> : null}
    </div>
  );
}

function CompactMetric({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "success" | "warning" | "accent";
}) {
  return <StatBadge label={label} value={value} tone={tone === "success" ? "approved" : tone === "warning" ? "warning" : tone === "accent" ? "neutral" : "neutral"} />;
}

function SourceMobileCard({
  row,
}: {
  row: {
    source: string;
    medium: string;
    sessions: number;
    visitors: number;
    addToCart: number;
    checkoutStarted: number;
    orders: number;
    purchases: number;
    conversionRate: number;
    billingTotal: number;
    averageTicket: number;
    abandonments: number;
  };
}) {
  return (
    <article className="rounded-[20px] border border-slate-200/70 bg-white px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-950">{row.source}</p>
          <p className="mt-0.5 truncate text-xs text-slate-500">{row.medium}</p>
        </div>
        <div className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          {formatDashboardPercent(row.conversionRate)}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-[14px] border border-slate-200/70 bg-slate-50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Sesiones</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{formatDashboardNumber(row.sessions)}</p>
        </div>
        <div className="rounded-[14px] border border-slate-200/70 bg-slate-50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Visitantes</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{formatDashboardNumber(row.visitors)}</p>
        </div>
        <div className="rounded-[14px] border border-slate-200/70 bg-slate-50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Add to cart</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{formatDashboardNumber(row.addToCart)}</p>
        </div>
        <div className="rounded-[14px] border border-slate-200/70 bg-slate-50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Checkout</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{formatDashboardNumber(row.checkoutStarted)}</p>
        </div>
        <div className="rounded-[14px] border border-slate-200/70 bg-slate-50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Compras</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{formatDashboardNumber(row.purchases)}</p>
        </div>
        <div className="rounded-[14px] border border-slate-200/70 bg-slate-50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Facturacion</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{formatCurrencyShort(row.billingTotal)}</p>
        </div>
        <div className="rounded-[14px] border border-slate-200/70 bg-slate-50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Ticket</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{formatCurrencyShort(row.averageTicket)}</p>
        </div>
        <div className="rounded-[14px] border border-slate-200/70 bg-slate-50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Abandonos</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{formatDashboardNumber(row.abandonments)}</p>
        </div>
      </div>
    </article>
  );
}

function CampaignMobileCard({
  row,
}: {
  row: {
    campaign: string;
    source: string;
    medium: string;
    sessions: number;
    addToCart: number;
    checkoutStarted: number;
    purchases: number;
    conversionRate: number;
    billingTotal: number;
  };
}) {
  return (
    <article className="rounded-[20px] border border-slate-200/70 bg-white px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-950">{row.campaign}</p>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {row.source} {row.medium !== "\u2014" ? ` \u00b7 ${row.medium}` : ""}
          </p>
        </div>
        <div className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          {formatDashboardPercent(row.conversionRate)}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-[14px] border border-slate-200/70 bg-slate-50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Sesiones</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{formatDashboardNumber(row.sessions)}</p>
        </div>
        <div className="rounded-[14px] border border-slate-200/70 bg-slate-50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Add to cart</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{formatDashboardNumber(row.addToCart)}</p>
        </div>
        <div className="rounded-[14px] border border-slate-200/70 bg-slate-50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Checkout</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{formatDashboardNumber(row.checkoutStarted)}</p>
        </div>
        <div className="rounded-[14px] border border-slate-200/70 bg-slate-50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Compras</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{formatDashboardNumber(row.purchases)}</p>
        </div>
        <div className="rounded-[14px] border border-slate-200/70 bg-slate-50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Facturacion</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{formatCurrencyShort(row.billingTotal)}</p>
        </div>
      </div>
    </article>
  );
}

function LandingPageMobileCard({
  row,
}: {
  row: {
    landingPage: string;
    sessions: number;
    addToCart: number;
    purchases: number;
    conversionRate: number;
    billingTotal: number;
  };
}) {
  return (
    <article className="rounded-[20px] border border-slate-200/70 bg-white px-4 py-4">
      <p className="break-all text-sm font-semibold text-slate-950">{row.landingPage}</p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-[14px] border border-slate-200/70 bg-slate-50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Sesiones</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{formatDashboardNumber(row.sessions)}</p>
        </div>
        <div className="rounded-[14px] border border-slate-200/70 bg-slate-50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Add to cart</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{formatDashboardNumber(row.addToCart)}</p>
        </div>
        <div className="rounded-[14px] border border-slate-200/70 bg-slate-50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Compras</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{formatDashboardNumber(row.purchases)}</p>
        </div>
        <div className="rounded-[14px] border border-slate-200/70 bg-slate-50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Conversion</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{formatDashboardPercent(row.conversionRate)}</p>
        </div>
        <div className="col-span-2 rounded-[14px] border border-slate-200/70 bg-slate-50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Facturacion</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{formatCurrencyShort(row.billingTotal)}</p>
        </div>
      </div>
    </article>
  );
}

function ReferrerMobileCard({
  row,
}: {
  row: {
    referrer: string;
    sessions: number;
    purchases: number;
    billingTotal: number;
  };
}) {
  return (
    <article className="rounded-[20px] border border-slate-200/70 bg-white px-4 py-4">
      <p className="break-all text-sm font-semibold text-slate-950">{row.referrer}</p>
      <div className="mt-3 grid grid-cols-3 gap-3">
        <div className="rounded-[14px] border border-slate-200/70 bg-slate-50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Sesiones</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{formatDashboardNumber(row.sessions)}</p>
        </div>
        <div className="rounded-[14px] border border-slate-200/70 bg-slate-50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Compras</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{formatDashboardNumber(row.purchases)}</p>
        </div>
        <div className="rounded-[14px] border border-slate-200/70 bg-slate-50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Facturacion</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{formatCurrencyShort(row.billingTotal)}</p>
        </div>
      </div>
    </article>
  );
}

export default async function AdminDashboardAcquisitionPage({
  searchParams,
}: AdminDashboardAcquisitionPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const normalizedPeriod = normalizeDashboardPeriodValue(
    Array.isArray(resolvedSearchParams.period) ? resolvedSearchParams.period[0] : resolvedSearchParams.period,
  );
  const query = normalizeAcquisitionQuery({
    ...resolvedSearchParams,
    period: normalizedPeriod,
  });
  const metrics = await getAcquisitionAnalyticsPageData(query);
  const lastUpdated = formatDashboardDateTime(new Date());

  const sourceSessionsChart = [...metrics.sources]
    .sort((left, right) => right.sessions - left.sessions || right.billingTotal - left.billingTotal || left.source.localeCompare(right.source))
    .slice(0, 8)
    .map((row) => ({
      id: `${row.source}::${row.medium}`,
      label: row.source,
      subtitle: row.medium !== "\u2014" ? row.medium : undefined,
      value: row.sessions,
    }));

  const sourceRevenueChart = [...metrics.sources]
    .sort((left, right) => right.billingTotal - left.billingTotal || right.sessions - left.sessions || left.source.localeCompare(right.source))
    .slice(0, 8)
    .map((row) => ({
      id: `${row.source}::${row.medium}`,
      label: row.source,
      subtitle: row.medium !== "\u2014" ? row.medium : undefined,
      value: row.billingTotal,
    }));

  const sourceConversionCandidates = metrics.sources.filter((row) => row.sessions >= metrics.sampleSizeRule.minSessionsForConversionRank);
  const sourceConversionChartSource = sourceConversionCandidates.length > 0 ? sourceConversionCandidates : metrics.sources;
  const sourceConversionChart = [...sourceConversionChartSource]
    .sort((left, right) => right.conversionRate - left.conversionRate || right.sessions - left.sessions || left.source.localeCompare(right.source))
    .slice(0, 8)
    .map((row) => ({
      id: `${row.source}::${row.medium}`,
      label: row.source,
      subtitle: row.sessions >= metrics.sampleSizeRule.minSessionsForConversionRank ? row.medium : `Muestra: ${formatDashboardNumber(row.sessions)} sesiones`,
      value: row.conversionRate,
    }));

  const campaignChart = [...metrics.campaigns]
    .sort((left, right) => right.billingTotal - left.billingTotal || right.sessions - left.sessions || left.campaign.localeCompare(right.campaign))
    .slice(0, 8)
    .map((row) => ({
      id: `${row.campaign}::${row.source}::${row.medium}`,
      label: row.campaign,
      subtitle: `${row.source}${row.medium !== "\u2014" ? ` \u00b7 ${row.medium}` : ""}`,
      value: row.billingTotal,
    }));

  const currentFilters: AcquisitionFilters = {
    period: query.period,
    sort: query.sort,
  };

  const hasSourceRows = metrics.sources.length > 0;
  const hasCampaignRows = metrics.campaigns.length > 0;
  const hasLandingRows = metrics.landingPages.length > 0;
  const hasReferrerRows = metrics.referrers.length > 0;

  return (
    <DashboardShell
      title="Adquisicion"
      subtitle={`Fuentes, campanas y rendimiento del trafico. Cohorte por AnalyticsSession.startedAt. Periodo activo: ${DASHBOARD_PERIODS[query.period].label}.`}
      lastUpdated={lastUpdated}
    >
      <section className="grid gap-3 min-[420px]:grid-cols-2 xl:grid-cols-4 sm:gap-4">
        <KpiCard
          title="Sesiones"
          value={formatDashboardNumber(metrics.summary.sessions)}
          description="Sesiones iniciadas dentro de la cohorte."
          tone="neutral"
        />
        <KpiCard
          title="Visitantes"
          value={formatDashboardNumber(metrics.summary.uniqueVisitors)}
          description="visitorId unicos en esas sesiones."
          tone="accent"
        />
        <KpiCard
          title="Compras"
          value={formatDashboardNumber(metrics.summary.purchases)}
          description="Compras reales atribuidas a la sesion."
          tone="success"
        />
        <KpiCard
          title="Facturacion"
          value={formatDashboardPrice(metrics.summary.billingTotal)}
          description="Order.total atribuido por sesion."
          tone="warning"
        />
      </section>

      <section className="grid gap-3 min-[420px]:grid-cols-2 xl:grid-cols-4 sm:gap-4">
        <CompactMetric label="Add to cart" value={formatDashboardNumber(metrics.summary.addToCartSessions)} />
        <CompactMetric label="Checkout iniciado" value={formatDashboardNumber(metrics.summary.checkoutStartedSessions)} />
        <CompactMetric label="Conversion" value={formatDashboardPercent(metrics.summary.conversionRate)} />
        <CompactMetric label="Ticket promedio" value={formatDashboardPrice(metrics.summary.averageTicket)} />
      </section>

      <ChartCard title="Lecturas rapidas" description="Fuentes lideres del periodo con regla de muestra minima para conversion.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <HighlightTile
            label={metrics.highlights.traffic?.label ?? "Fuente con mas trafico"}
            value={metrics.highlights.traffic?.value ?? "Sin datos"}
            subtitle={metrics.highlights.traffic?.subtitle ?? "No hay sesiones suficientes."}
          />
          <HighlightTile
            label={metrics.highlights.purchases?.label ?? "Fuente con mas compras"}
            value={metrics.highlights.purchases?.value ?? "Sin datos"}
            subtitle={metrics.highlights.purchases?.subtitle ?? "No hay compras suficientes."}
            tone="success"
          />
          <HighlightTile
            label={metrics.highlights.conversion?.label ?? "Mejor conversion"}
            value={metrics.highlights.conversion?.value ?? "Sin datos"}
            subtitle={metrics.highlights.conversion?.subtitle ?? `Minimo ${metrics.sampleSizeRule.minSessionsForConversionRank} sesiones.`}
            tone="accent"
          />
          <HighlightTile
            label={metrics.highlights.revenue?.label ?? "Mayor facturacion"}
            value={metrics.highlights.revenue?.value ?? "Sin datos"}
            subtitle={metrics.highlights.revenue?.subtitle ?? "No hay facturacion suficiente."}
            tone="warning"
          />
        </div>

        <div className="mt-4 rounded-[18px] border border-slate-200/70 bg-slate-50 px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Definiciones</p>
          <div className="mt-3 grid gap-3 text-sm leading-6 text-slate-600">
            <p>{metrics.notes.attributionModel}</p>
            <p>{metrics.notes.conversionDefinition}</p>
            <p>{metrics.notes.abandonmentDefinition}</p>
            <p>{metrics.notes.limitation}</p>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Regla de muestra minima para conversion: {formatDashboardNumber(metrics.sampleSizeRule.minSessionsForConversionRank)} sesiones.
            </p>
          </div>
        </div>
      </ChartCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard
          title="Sesiones por fuente"
          description="Comparacion de fuentes de trafico por sesiones de la cohorte."
          className="min-w-0"
        >
          <AcquisitionHorizontalBarChart
            data={sourceSessionsChart}
            metricLabel="Sesiones"
            metricFormat="number"
            emptyTitle="No hay datos suficientes para este periodo."
            emptyDescription="Cuando existan sesiones, este grafico mostrara las fuentes principales."
          />
        </ChartCard>

        <ChartCard
          title="Facturacion por fuente"
          description="Ingresos atribuidos por session attribution."
          className="min-w-0"
        >
          <AcquisitionHorizontalBarChart
            data={sourceRevenueChart}
            metricLabel="Facturacion"
            metricFormat="currency"
            emptyTitle="No hay datos suficientes para este periodo."
            emptyDescription="Cuando existan compras, este grafico mostrara las fuentes que mas facturan."
          />
        </ChartCard>

        <ChartCard
          title="Conversion por fuente"
          description="Conversion de sesiones con compra sobre sesiones totales. Se priorizan fuentes con al menos 10 sesiones."
          className="min-w-0"
        >
          <AcquisitionHorizontalBarChart
            data={sourceConversionChart}
            metricLabel="Conversion"
            metricFormat="percentage"
            emptyTitle="No hay datos suficientes para este periodo."
            emptyDescription="Cuando existan fuentes con muestra suficiente, este grafico mostrara la conversion."
          />
        </ChartCard>

        <ChartCard
          title="Top campanas"
          description="Campanas con mayor facturacion atribuida."
          className="min-w-0"
        >
          <AcquisitionHorizontalBarChart
            data={campaignChart}
            metricLabel="Facturacion"
            metricFormat="currency"
            emptyTitle="No hay campanas para este periodo."
            emptyDescription="Cuando existan UTMs de campana, este grafico las mostrara aqui."
          />
        </ChartCard>
      </div>

      <ChartCard
        title="Tabla principal de fuentes"
        description="Orden por facturacion, sesiones, compras, conversion o abandonos. La conversion respeta muestra minima."
        className="min-w-0"
      >
        <div className="flex flex-wrap gap-2">
          {acquisitionSortOptions.map((option) => {
            const active = query.sort === option.value;

            return (
                <Link
                  key={option.value}
                  href={buildAcquisitionHref(currentFilters, { sort: option.value })}
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

        <div className="mt-4">
          {hasSourceRows ? (
            <>
              <div className="hidden max-w-full overflow-hidden rounded-[20px] border border-slate-200/70 md:block">
                <div className="max-w-full overflow-x-auto">
                  <table className="min-w-[1480px] w-full border-collapse text-sm">
                    <thead className="bg-slate-50 text-left">
                      <tr>
                        <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Fuente</th>
                        <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Medium</th>
                        <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Sesiones</th>
                        <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Visitantes</th>
                        <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Add to cart</th>
                        <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Checkout</th>
                        <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Ordenes</th>
                        <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Compras</th>
                        <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Conversion</th>
                        <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Facturacion</th>
                        <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Ticket</th>
                        <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Abandonos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.sources.map((row) => (
                        <tr key={`${row.source}::${row.medium}`} className="border-t border-slate-200/70 align-top">
                          <td className="px-4 py-4">
                            <p className="font-medium text-slate-950">{row.source}</p>
                          </td>
                          <td className="px-4 py-4 text-slate-600">{row.medium}</td>
                          <td className="px-4 py-4 text-slate-700">{formatDashboardNumber(row.sessions)}</td>
                          <td className="px-4 py-4 text-slate-700">{formatDashboardNumber(row.visitors)}</td>
                          <td className="px-4 py-4 text-slate-700">{formatDashboardNumber(row.addToCart)}</td>
                          <td className="px-4 py-4 text-slate-700">{formatDashboardNumber(row.checkoutStarted)}</td>
                          <td className="px-4 py-4 text-slate-700">{formatDashboardNumber(row.orders)}</td>
                          <td className="px-4 py-4 text-slate-700">{formatDashboardNumber(row.purchases)}</td>
                          <td className="px-4 py-4 text-slate-700">{formatDashboardPercent(row.conversionRate)}</td>
                          <td className="px-4 py-4 text-slate-700">{formatCurrencyShort(row.billingTotal)}</td>
                          <td className="px-4 py-4 text-slate-700">{formatCurrencyShort(row.averageTicket)}</td>
                          <td className="px-4 py-4 text-slate-700">{formatDashboardNumber(row.abandonments)}</td>
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
            <EmptyState
              title="No hay datos suficientes para este periodo."
              description="Cuando existan sesiones atribuidas, la tabla principal mostrara fuentes, medium y rendimiento."
            />
          )}
        </div>
      </ChartCard>

      <ChartCard
        title="Campanas"
        description="Comparacion de utmCampaign sin mezclar valores nulos bajo una campana inventada."
        className="min-w-0"
      >
        {hasCampaignRows ? (
          <>
            <div className="hidden max-w-full overflow-hidden rounded-[20px] border border-slate-200/70 md:block">
              <div className="max-w-full overflow-x-auto">
                <table className="min-w-[1120px] w-full border-collapse text-sm">
                  <thead className="bg-slate-50 text-left">
                    <tr>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Campana</th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Fuente</th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Sesiones</th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Add to cart</th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Checkout</th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Compras</th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Conversion</th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Facturacion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.campaigns.map((row) => (
                      <tr key={`${row.campaign}::${row.source}::${row.medium}`} className="border-t border-slate-200/70 align-top">
                        <td className="px-4 py-4">
                          <p className="font-medium text-slate-950">{row.campaign}</p>
                          <p className="mt-1 text-xs text-slate-500">{row.medium !== "\u2014" ? row.medium : "Sin medium"}</p>
                        </td>
                        <td className="px-4 py-4 text-slate-600">{row.source}</td>
                        <td className="px-4 py-4 text-slate-700">{formatDashboardNumber(row.sessions)}</td>
                        <td className="px-4 py-4 text-slate-700">{formatDashboardNumber(row.addToCart)}</td>
                        <td className="px-4 py-4 text-slate-700">{formatDashboardNumber(row.checkoutStarted)}</td>
                        <td className="px-4 py-4 text-slate-700">{formatDashboardNumber(row.purchases)}</td>
                        <td className="px-4 py-4 text-slate-700">{formatDashboardPercent(row.conversionRate)}</td>
                        <td className="px-4 py-4 text-slate-700">{formatCurrencyShort(row.billingTotal)}</td>
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
          <EmptyState
            title="No hay campanas para este periodo."
            description="Si las sesiones no incluyen utmCampaign, esta tabla quedara vacia y no inventa un agrupamiento falso."
          />
        )}
      </ChartCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Landing pages" description="URL normalizada por pathname cuando es same-origin." className="min-w-0">
          {hasLandingRows ? (
            <>
              <div className="hidden max-w-full overflow-hidden rounded-[20px] border border-slate-200/70 md:block">
                <div className="max-w-full overflow-x-auto">
                  <table className="min-w-[980px] w-full border-collapse text-sm">
                    <thead className="bg-slate-50 text-left">
                      <tr>
                        <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Landing page</th>
                        <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Sesiones</th>
                        <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Add to cart</th>
                        <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Compras</th>
                        <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Conversion</th>
                        <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Facturacion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.landingPages.map((row) => (
                        <tr key={row.landingPage} className="border-t border-slate-200/70 align-top">
                          <td className="px-4 py-4">
                            <p className="break-all font-medium text-slate-950">{row.landingPage}</p>
                          </td>
                          <td className="px-4 py-4 text-slate-700">{formatDashboardNumber(row.sessions)}</td>
                          <td className="px-4 py-4 text-slate-700">{formatDashboardNumber(row.addToCart)}</td>
                          <td className="px-4 py-4 text-slate-700">{formatDashboardNumber(row.purchases)}</td>
                          <td className="px-4 py-4 text-slate-700">{formatDashboardPercent(row.conversionRate)}</td>
                          <td className="px-4 py-4 text-slate-700">{formatCurrencyShort(row.billingTotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid gap-3 md:hidden">
                {metrics.landingPages.map((row) => (
                  <LandingPageMobileCard key={row.landingPage} row={row} />
                ))}
              </div>
            </>
          ) : (
            <EmptyState
              title="No hay landing pages para este periodo."
              description="Cuando existan sesiones con landingPage, la tabla se llenara automaticamente."
            />
          )}
        </ChartCard>

        <ChartCard title="Referencias" description="Hostnames principales del referrer, sin URL completa." className="min-w-0">
          {hasReferrerRows ? (
            <>
              <div className="hidden max-w-full overflow-hidden rounded-[20px] border border-slate-200/70 md:block">
                <div className="max-w-full overflow-x-auto">
                  <table className="min-w-[760px] w-full border-collapse text-sm">
                    <thead className="bg-slate-50 text-left">
                      <tr>
                        <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Referrer</th>
                        <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Sesiones</th>
                        <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Compras</th>
                        <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Facturacion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.referrers.map((row) => (
                        <tr key={row.referrer} className="border-t border-slate-200/70 align-top">
                          <td className="px-4 py-4">
                            <p className="break-all font-medium text-slate-950">{row.referrer}</p>
                          </td>
                          <td className="px-4 py-4 text-slate-700">{formatDashboardNumber(row.sessions)}</td>
                          <td className="px-4 py-4 text-slate-700">{formatDashboardNumber(row.purchases)}</td>
                          <td className="px-4 py-4 text-slate-700">{formatCurrencyShort(row.billingTotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid gap-3 md:hidden">
                {metrics.referrers.map((row) => (
                  <ReferrerMobileCard key={row.referrer} row={row} />
                ))}
              </div>
            </>
          ) : (
            <EmptyState title="No hay referencias para este periodo." description="Si no existe referrer externo o directo, la tabla quedara vacia." />
          )}
        </ChartCard>
      </div>
    </DashboardShell>
  );
}
