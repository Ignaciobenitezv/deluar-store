import type { Metadata } from "next";
import { DateRangeFilter } from "@/features/admin/dashboard/components/date-range-filter";
import {
  OverviewEmpty,
  OverviewKpi,
  OverviewModule,
  overviewCategorical,
} from "@/features/admin/dashboard/components/overview/overview-ui";
import { BusinessChart } from "@/features/admin/dashboard/components/overview/business-chart";
import {
  AcquisitionTable,
  ProductsTable,
} from "@/features/admin/dashboard/components/overview/overview-tables";
import { ArgentinaMap } from "@/features/admin/dashboard/components/overview/argentina-map";
import {
  OrderStatusDonut,
  OrderStatusEmpty,
  type StatusPalette,
} from "@/features/admin/dashboard/components/ledger/order-status-donut";
import { normalizeDashboardPeriodValue } from "@/features/admin/dashboard/server/dashboard-service";
import type { DashboardDelta } from "@/features/admin/dashboard/server/dashboard-service";
import {
  formatDashboardDateTime,
  formatDashboardNumber,
  formatDashboardPercent,
  formatDashboardPrice,
} from "@/features/admin/dashboard/lib/dashboard-formatters";
import { getExecutiveSummaryPageData } from "@/features/admin/dashboard/server/executive-summary-service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Resumen | DELUAR",
};

type AdminDashboardPageProps = {
  searchParams?: Promise<{ period?: string }>;
};

/** A delta only becomes a percentage when the previous window is real and non-zero. */
function toKpiDelta(delta: DashboardDelta, previousFormatted: string) {
  if (delta.direction === "unmeasurable" || delta.direction === "flat") {
    return null;
  }

  if (delta.changePercent === null) {
    return null;
  }

  return {
    changePercent: delta.changePercent,
    rising: delta.direction === "up",
    previousFormatted,
  };
}

export default async function AdminDashboardPage({ searchParams }: AdminDashboardPageProps) {
  const resolvedSearchParams = await searchParams;
  const period = normalizeDashboardPeriodValue(resolvedSearchParams?.period);
  const summary = await getExecutiveSummaryPageData(period);

  const { dashboard, conversion, acquisition } = summary;
  const daily = dashboard.sales.daily;
  const lastUpdated = formatDashboardDateTime(dashboard.generatedAt);

  const chartData = daily.map((day) => ({
    date: day.date,
    label: day.label,
    revenue: day.revenue,
    paidOrders: day.paidOrders,
    previousLabel: day.previousLabel,
    previousRevenue: day.previousRevenue,
    previousPaidOrders: day.previousPaidOrders,
  }));

  const previousBillingTotal = daily.reduce((sum, day) => sum + day.previousRevenue, 0);

  // Conversion has no comparison window in the service, so its card carries the
  // period's own daily rate and no delta rather than a manufactured one.
  const conversionSeries = conversion.timeline.map((point) =>
    point.sessions > 0 ? (point.purchases / point.sessions) * 100 : 0,
  );

  const statusSlices = (
    ["fulfilled", "paid", "pending", "created", "failed", "cancelled"] as const
  ).map((state) => ({
    state,
    value: dashboard.ledger.orders.filter((entry) => entry.state === state).length,
  }));

  /**
 * Order states keep their meaning rather than joining the analytics blue:
 * paid is green, pending amber, failed and cancelled red, created neutral.
 */
  const STATUS_PALETTE: StatusPalette = {
    fulfilled: { label: "Entregadas", color: "#14804b" },
    paid: { label: "Pagadas", color: "#1f9d55" },
    pending: { label: "Pendientes de pago", color: "#b45309" },
    created: { label: "Creadas", color: "#94a3b8" },
    failed: { label: "Fallidas", color: "#c0392f" },
    cancelled: { label: "Canceladas", color: "#8c4a44" },
  };

  const provinces = dashboard.location.provinces.slice(0, 5);
  const sources = acquisition.sources.slice(0, 5);
  const products = dashboard.products.topRevenue.slice(0, 6);

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center gap-5 border-b border-border bg-background px-6 lg:px-8">
        <nav aria-label="Ubicación" className="min-w-0 flex-1">
          <ol className="flex items-center gap-2 text-[12.5px]">
            <li className="font-medium text-text-secondary">Estadísticas</li>
            <li aria-hidden className="text-text-secondary">
              /
            </li>
            <li className="font-semibold text-text-primary" aria-current="page">
              Resumen
            </li>
          </ol>
        </nav>
        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden text-[12px] tabular-nums text-text-secondary lg:block">
            {lastUpdated}
          </span>
          <DateRangeFilter topBar />
        </div>
      </header>

      <div className="flex-1 px-6 pb-10 pt-6 lg:px-8">
        <div className="w-full min-w-0">
          <h1 className="text-[1.375rem] font-semibold leading-none tracking-[-0.015em] text-text-primary sm:text-[1.625rem]">
            Análisis del negocio
          </h1>

          {/* ── Row 1 · four equal KPIs, each with its own daily series ─────── */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <OverviewKpi
              label="Pedidos pagados"
              color={overviewCategorical[0]}
              value={formatDashboardNumber(dashboard.summary.paidOrders)}
              series={daily.map((day) => day.paidOrders)}
              delta={toKpiDelta(
                dashboard.comparison.paidOrders,
                formatDashboardNumber(dashboard.comparison.paidOrders.previous),
              )}
              note="Sin período comparable"
            />
            <OverviewKpi
              label="Facturación"
              color={overviewCategorical[1]}
              value={formatDashboardPrice(dashboard.summary.billingTotal)}
              series={daily.map((day) => day.revenue)}
              delta={toKpiDelta(
                dashboard.comparison.billingTotal,
                formatDashboardPrice(dashboard.comparison.billingTotal.previous),
              )}
              note="Sin período comparable"
            />
            <OverviewKpi
              label="Ticket promedio"
              color={overviewCategorical[2]}
              value={formatDashboardPrice(dashboard.summary.averageTicket)}
              series={daily.map((day) =>
                day.paidOrders > 0 ? day.revenue / day.paidOrders : 0,
              )}
              delta={toKpiDelta(
                dashboard.comparison.averageTicket,
                formatDashboardPrice(dashboard.comparison.averageTicket.previous),
              )}
              note="Sin período comparable"
            />
            <OverviewKpi
              label="Conversión"
              color={overviewCategorical[3]}
              value={formatDashboardPercent(conversion.summary.conversionRate)}
              series={conversionSeries}
              delta={null}
              note={`Sobre ${formatDashboardNumber(conversion.summary.sessions)} sesiones del período`}
            />
          </div>

          {/* ── Row 2 · 50 / 50 ─────────────────────────────────────────────── */}
          <div className="mt-4 grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
            <OverviewModule
              title="Evolución del negocio"
              note="Facturación y pedidos del período contra el anterior."
            >
              <BusinessChart
                data={chartData}
                currentTotal={formatDashboardPrice(dashboard.summary.billingTotal)}
                previousTotal={formatDashboardPrice(previousBillingTotal)}
                comparisonAvailable={dashboard.comparison.available}
                height={260}
              />
            </OverviewModule>

            <OverviewModule
              title="Adquisición"
              note="Fuentes de tráfico del período."
              action={{ href: "/admin/dashboard/adquisicion", label: "Ver fuentes" }}
              bodyClassName="flex flex-col justify-start"
            >
              {sources.length > 0 ? (
                <AcquisitionTable
                  rows={sources.map((row) => ({
                    source: row.source,
                    sessions: row.sessions,
                    productViews: row.productViews,
                    billingTotal: row.billingTotal,
                    trend: row.trend,
                  }))}
                />
              ) : (
                <OverviewEmpty message="Sin sesiones registradas en el período." />
              )}
            </OverviewModule>
          </div>

          {/* ── Row 3 · three equal columns ─────────────────────────────────── */}
          <div className="mt-4 grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
            <OverviewModule
              title="Productos"
              note="Por facturación en órdenes pagadas."
              action={{ href: "/admin/dashboard/productos", label: "Ver productos" }}
            >
              {products.length > 0 ? (
                <ProductsTable rows={products} />
              ) : (
                <OverviewEmpty message="Ninguna orden pagada del período incluye productos." />
              )}
            </OverviewModule>

            <OverviewModule
              title="Ubicación"
              note="Provincias con más facturación."
              action={{ href: "/admin/dashboard/ubicacion", label: "Ver ubicación" }}
            >
              {provinces.length > 0 ? (
                <ArgentinaMap rows={provinces} />
              ) : (
                <OverviewEmpty message="Sin envíos con provincia registrada en el período." />
              )}
            </OverviewModule>

            <OverviewModule
              title="Estado de las órdenes"
              note="Reparto de todo lo creado en el período."
            >
              {dashboard.ledger.orders.length > 0 ? (
                <OrderStatusDonut slices={statusSlices} palette={STATUS_PALETTE} tone="cool" />
              ) : (
                <OrderStatusEmpty />
              )}
            </OverviewModule>
          </div>
        </div>
      </div>
    </main>
  );
}
