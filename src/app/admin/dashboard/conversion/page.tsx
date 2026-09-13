import type { Metadata } from "next";
import { DateRangeFilter } from "@/features/admin/dashboard/components/date-range-filter";
import {
  OverviewEmpty,
  OverviewModule,
} from "@/features/admin/dashboard/components/overview/overview-ui";
import { ConversionKpi } from "@/features/admin/dashboard/components/conversion/conversion-kpi";
import {
  IconAlert,
  IconCart,
  IconCheckout,
  IconClock,
  IconDoc,
  IconMoney,
  IconRate,
  IconSessions,
  IconTrend,
  IconVisitors,
} from "@/features/admin/dashboard/components/conversion/conversion-icons";
import { ConversionFunnel } from "@/features/admin/dashboard/components/conversion/conversion-funnel";
import { ConversionTimeline } from "@/features/admin/dashboard/components/conversion/conversion-timeline";
import {
  SourceConversionTable,
  ViewedProductsTable,
} from "@/features/admin/dashboard/components/conversion/conversion-tables";
import {
  ConversionEmpty,
  StatGroup,
  StatHighlights,
} from "@/features/admin/dashboard/components/conversion/stat-group";
import {
  formatDashboardNumber,
  formatDashboardPercent,
  formatDashboardPrice,
} from "@/features/admin/dashboard/lib/dashboard-formatters";
import {
  DASHBOARD_PERIODS,
  normalizeDashboardPeriodValue,
} from "@/features/admin/dashboard/server/dashboard-service";
import { getConversionAnalyticsMetrics } from "@/features/admin/analytics/server/conversion-analytics-service";
import { getAcquisitionAnalyticsPageData } from "@/features/admin/analytics/server/acquisition-analytics-service";
import { getProductAnalyticsPageData } from "@/features/admin/analytics/server/product-analytics-service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Conversión | DELUAR",
};

const ARGENTINA_TIME_ZONE = "America/Argentina/Buenos_Aires";

type AdminDashboardConversionPageProps = {
  searchParams?: Promise<{ period?: string }>;
};

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

export default async function AdminDashboardConversionPage({
  searchParams,
}: AdminDashboardConversionPageProps) {
  const resolvedSearchParams = await searchParams;
  const period = normalizeDashboardPeriodValue(resolvedSearchParams?.period);

  const [metrics, acquisition, products] = await Promise.all([
    getConversionAnalyticsMetrics(period),
    getAcquisitionAnalyticsPageData({ period, sort: "sessions" }),
    getProductAnalyticsPageData({ period, sort: "views", page: 1, pageSize: 10 }),
  ]);

  const periodLabel = DASHBOARD_PERIODS[period].label;
  const lastUpdated = formatGeneratedAt(new Date());

  // Conversion has no previous-period window in the service, so the cards carry
  // their own daily series and no delta rather than a manufactured one.
  const sessionSeries = metrics.timeline.map((point) => point.sessions);
  const purchaseSeries = metrics.timeline.map((point) => point.purchases);
  const conversionSeries = metrics.timeline.map((point) =>
    point.sessions > 0 ? (point.purchases / point.sessions) * 100 : 0,
  );

  // The reference shows the dashed panel whenever nothing was abandoned; the
  // value readings only exist when there is something to value.
  const noAbandonments =
    metrics.abandonment.cart.count === 0 && metrics.abandonment.checkout.count === 0;

  const viewedProducts = products.products.filter((row) => row.views > 0).slice(0, 5);
  const sources = acquisition.sources.slice(0, 5);

  return (
    <main className="flex min-h-screen flex-col bg-[#f1f5f9]">
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-5 border-b border-slate-200/70 bg-white px-6 lg:px-8">
        <nav aria-label="Ubicación" className="min-w-0 flex-1">
          <ol className="flex items-center gap-2 text-[13px]">
            <li className="font-medium text-slate-400">Estadísticas</li>
            <li aria-hidden className="text-slate-300">
              /
            </li>
            <li className="font-semibold text-slate-900" aria-current="page">
              Conversión
            </li>
          </ol>
        </nav>
        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden items-center gap-2 text-[12px] tabular-nums text-slate-400 lg:flex">
            <span aria-hidden className="h-[6px] w-[6px] rounded-full bg-[#1f9d55]" />
            Actualizado {lastUpdated}
          </span>
          <DateRangeFilter topBar />
        </div>
      </header>

      <div className="flex-1 px-6 pb-12 pt-6 lg:px-8">
        <div className="w-full min-w-0">
          <h1 className="text-[2.1rem] font-semibold leading-none tracking-[-0.04em] text-slate-950">
            Conversión
          </h1>
          <p className="mt-3 text-[13.5px] text-slate-500">
            Rendimiento del funnel, abandonos y pagos · {periodLabel}
          </p>

          {/* ── Row 1 · four readings of the period ─────────────────────────── */}
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ConversionKpi
              icon={<IconSessions />}
              accent
              label="Sesiones"
              value={formatDashboardNumber(metrics.summary.sessions)}
              description="Sesiones iniciadas en el período"
            />
            <ConversionKpi
              icon={<IconVisitors />}
              label="Visitantes únicos"
              value={formatDashboardNumber(metrics.summary.uniqueVisitors)}
              // The timeline counts sessions, not visitors: this one has no
              // daily series to draw, so it does not pretend to have one.
              description="Usuarios distintos en esas sesiones"
            />
            <ConversionKpi
              icon={<IconCart />}
              label="Compras"
              value={formatDashboardNumber(metrics.summary.purchases)}
              description="Compras completadas en el período"
            />
            <ConversionKpi
              icon={<IconRate />}
              label="Tasa de conversión"
              value={formatDashboardPercent(metrics.summary.conversionRate)}
              description="Sesiones que terminaron en compra"
            />
          </div>

          {/* ── Row 2 · funnel leads, diagnostics stack beside it ───────────── */}
          <div className="mt-3 grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-[1.13fr_1fr]">
            <OverviewModule
              title="Funnel principal"
              note="Sesiones que avanzan y convierten en cada etapa del proceso."
            >
              <ConversionFunnel stages={metrics.funnel} />
            </OverviewModule>

            <div className="flex min-w-0 flex-col gap-3">
              <OverviewModule
                title="Actividad y abandonos"
                note="Usuarios que no completaron la compra."
                bodyClassName="flex flex-col"
              >
                <StatGroup
                  className="grid-cols-3"
                  stats={[
                    {
                      label: "Carritos abandonados",
                      icon: <IconCart />,
                      value: formatDashboardNumber(metrics.abandonment.cart.count),
                    },
                    {
                      label: "Checkouts abandonados",
                      icon: <IconDoc />,
                      value: formatDashboardNumber(metrics.abandonment.checkout.count),
                    },
                    {
                      label: "Pagos fallidos",
                      icon: <IconAlert />,
                      value: formatDashboardNumber(metrics.payment.failedOrders),
                    },
                  ]}
                />
                {noAbandonments ? (
                  <div>
                    <ConversionEmpty
                      title="Sin actividad reciente"
                      description="Se mostrará cuando haya carritos o checkouts abandonados."
                    />
                  </div>
                ) : (
                  <StatGroup
                    className="grid-cols-2"
                    stats={[
                      {
                        label: "Valor en carritos abandonados",
                      icon: <IconCart />,
                        value: formatDashboardPrice(metrics.abandonment.cart.value),
                      },
                      {
                        label: "Valor en checkouts abandonados",
                      icon: <IconDoc />,
                        value: formatDashboardPrice(metrics.abandonment.checkout.value),
                      },
                    ]}
                  />
                )}
              </OverviewModule>

              <OverviewModule
                title="Conversión de pago"
                note="Desde la orden creada hasta la compra confirmada."
                bodyClassName="flex flex-col"
              >
                <StatGroup
                  className="grid-cols-2 sm:grid-cols-4"
                  stats={[
                    {
                      label: "Checkouts",
                      icon: <IconCheckout />,
                      value: formatDashboardNumber(metrics.activity.checkoutStartedSessions),
                    },
                    {
                      label: "Pagos iniciados",
                      icon: <IconCart />,
                      value: formatDashboardNumber(metrics.payment.ordersCreated),
                    },
                    {
                      label: "Pagos exitosos",
                      icon: <IconClock />,
                      value: formatDashboardNumber(metrics.payment.purchasesCompleted),
                    },
                    {
                      label: "Pagos fallidos",
                      icon: <IconAlert />,
                      value: formatDashboardNumber(metrics.payment.failedOrders),
                    },
                  ]}
                />
                <StatHighlights
                  items={[
                    {
                      label: "Facturación",
                      value: formatDashboardPrice(metrics.payment.billingTotal),
                      icon: <IconMoney />,
                      tone: "positive" as const,
                    },
                    {
                      label: "Orden → pago",
                      value: formatDashboardPercent(metrics.payment.completionRate),
                      icon: <IconTrend />,
                      tone: "info" as const,
                    },
                  ]}
                />
              </OverviewModule>
            </div>
          </div>

          {/* ── Row 3 · the journey over time, full width ───────────────────── */}
          <OverviewModule
            title="Conversión en el tiempo"
            note={`Evolución diaria de sesiones, carrito, checkout y compras · ${periodLabel}.`}
            className="mt-3"
          >
            <ConversionTimeline data={metrics.timeline} height={300} />
          </OverviewModule>

          {/* ── Row 4 · where traffic comes from, what it looks at ──────────── */}
          <div className="mt-3 grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-2">
            <OverviewModule
              title="Fuentes de tráfico y conversión"
              note="Rendimiento por fuente de adquisición."
              action={{ href: "/admin/dashboard/adquisicion", label: "Ver todas" }}
            >
              {sources.length > 0 ? (
                <SourceConversionTable
                  rows={sources.map((row) => ({
                    source: row.source,
                    sessions: row.sessions,
                    addToCart: row.addToCart,
                    checkoutStarted: row.checkoutStarted,
                    purchases: row.purchases,
                    conversionRate: row.conversionRate,
                  }))}
                />
              ) : (
                <OverviewEmpty message="Sin sesiones registradas en el período." />
              )}
            </OverviewModule>

            <OverviewModule
              title="Productos más vistos"
              note="Productos que más interés generaron desde la entrada."
              action={{ href: "/admin/dashboard/productos", label: "Ver productos" }}
            >
              <ViewedProductsTable
                rows={viewedProducts.map((row) => ({
                  productId: row.productId,
                  productName: row.productName,
                  imageUrl: row.imageUrl,
                  views: row.views,
                  addToCart: row.addToCart,
                  viewToCartRate: row.viewToCartRate,
                }))}
              />
            </OverviewModule>
          </div>
        </div>
      </div>
    </main>
  );
}
