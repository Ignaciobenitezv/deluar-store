import type { Metadata } from "next";
import Link from "next/link";
import { LedgerControls } from "@/features/admin/dashboard/components/ledger/ledger-controls";
import { LedgerHighlightProvider } from "@/features/admin/dashboard/components/ledger/ledger-highlight";
import { LedgerPagination } from "@/features/admin/dashboard/components/ledger/ledger-pagination";
import {
  LedgerModule,
  SoldProductsTable,
} from "@/features/admin/dashboard/components/ledger/ledger-breakdowns";
import { MetricBand } from "@/features/admin/dashboard/components/ledger/metric-band";
import {
  OrderStatusDonut,
  OrderStatusEmpty,
} from "@/features/admin/dashboard/components/ledger/order-status-donut";
import { SeriesChartModule } from "@/features/admin/dashboard/components/ledger/series-chart";
import { SalesLedger } from "@/features/admin/dashboard/components/ledger/sales-ledger";
import {
  ledgerRadius,
  ledgerUi,
} from "@/features/admin/dashboard/components/ledger/ledger-ui";
import styles from "@/features/admin/dashboard/components/ledger/ledger.module.css";
import {
  DASHBOARD_PERIODS,
  getDashboardMetrics,
  normalizeDashboardPeriodValue,
} from "@/features/admin/dashboard/server/dashboard-service";
import {
  formatDashboardNumber,
  formatDashboardPrice,
} from "@/features/admin/dashboard/lib/dashboard-formatters";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ventas | DELUAR",
};

const LEDGER_PAGE_SIZE = 25;
const ARGENTINA_TIME_ZONE = "America/Argentina/Buenos_Aires";

type AdminDashboardSalesPageProps = {
  searchParams?: Promise<{ period?: string; compare?: string; page?: string }>;
};

function formatRangeDay(date: Date, withYear: boolean) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: ARGENTINA_TIME_ZONE,
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
  }).format(date);
}

function formatGeneratedAt(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: ARGENTINA_TIME_ZONE,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function formatLongDay(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
  }).format(new Date(`${value}T12:00:00Z`));
}

function parsePage(value: string | undefined, totalPages: number) {
  const parsed = Number.parseInt(value ?? "1", 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return Math.min(parsed, Math.max(totalPages, 1));
}

export default async function AdminDashboardSalesPage({
  searchParams,
}: AdminDashboardSalesPageProps) {
  const resolvedSearchParams = await searchParams;
  const period = normalizeDashboardPeriodValue(resolvedSearchParams?.period);
  const compareEnabled = resolvedSearchParams?.compare !== "0";
  const metrics = await getDashboardMetrics(period);

  const periodLabel = DASHBOARD_PERIODS[period].label;
  const rangeLabel = `${formatRangeDay(metrics.dateRange.start, false)} – ${formatRangeDay(
    metrics.dateRange.end,
    true,
  )}`;

  const entries = metrics.ledger.orders;
  const totalEntries = entries.length;
  const totalPages = Math.max(Math.ceil(totalEntries / LEDGER_PAGE_SIZE), 1);
  const page = parsePage(resolvedSearchParams?.page, totalPages);
  const rangeStart = (page - 1) * LEDGER_PAGE_SIZE;
  const pageEntries = entries.slice(rangeStart, rangeStart + LEDGER_PAGE_SIZE);

  const paidInPeriod = entries.filter(
    (entry) => entry.state === "paid" || entry.state === "fulfilled",
  ).length;

  const daily = metrics.sales.daily;
  const daysWithSales = daily.filter((day) => day.revenue > 0).length;

  const chartData = daily.map((day) => ({
    date: day.date,
    label: day.label,
    longLabel: formatLongDay(day.date),
    revenue: day.revenue,
    paidOrders: day.paidOrders,
    unitsSold: day.unitsSold,
  }));

  /**
   * The order states are a partition: every order in the period lands in
   * exactly one bucket, using the same state the ledger prints per row.
   */
  const statusSlices = (
    ["fulfilled", "paid", "pending", "created", "failed", "cancelled"] as const
  ).map((state) => ({
    state,
    value: entries.filter((entry) => entry.state === state).length,
  }));

  const buildHref = (nextPage: number) => {
    const params = new URLSearchParams();
    params.set("period", period);
    if (!compareEnabled) {
      params.set("compare", "0");
    }
    if (nextPage > 1) {
      params.set("page", String(nextPage));
    }
    return `/admin/dashboard/ventas?${params.toString()}`;
  };

  const metricItems = [
    {
      label: "Facturación",
      value: formatDashboardPrice(metrics.summary.billingTotal),
      description: "Solo órdenes pagadas o aprobadas.",
      delta: metrics.comparison.billingTotal,
      previousFormatted: formatDashboardPrice(metrics.comparison.billingTotal.previous),
      series: daily.map((day) => day.revenue),
    },
    {
      label: "Pedidos pagados",
      value: formatDashboardNumber(metrics.summary.paidOrders),
      description: "Órdenes incluidas en la facturación.",
      delta: metrics.comparison.paidOrders,
      previousFormatted: formatDashboardNumber(metrics.comparison.paidOrders.previous),
      series: daily.map((day) => day.paidOrders),
    },
    {
      label: "Ticket promedio",
      value: formatDashboardPrice(metrics.summary.averageTicket),
      description: "Promedio sobre órdenes pagadas.",
      delta: metrics.comparison.averageTicket,
      previousFormatted: formatDashboardPrice(metrics.comparison.averageTicket.previous),
      // Daily ticket is only defined on days that actually closed an order.
      series: daily.map((day) => (day.paidOrders > 0 ? day.revenue / day.paidOrders : 0)),
    },
    {
      label: "Unidades vendidas",
      value: formatDashboardNumber(metrics.summary.unitsSold),
      description: "Unidades ligadas a órdenes pagadas.",
      delta: metrics.comparison.unitsSold,
      previousFormatted: formatDashboardNumber(metrics.comparison.unitsSold.previous),
      series: daily.map((day) => day.unitsSold),
    },
    {
      label: "Días con venta",
      value: `${formatDashboardNumber(daysWithSales)} de ${formatDashboardNumber(daily.length)}`,
      description: `Sobre ${formatDashboardNumber(daily.length)} días del período.`,
      delta: metrics.comparison.daysWithSales,
      previousFormatted: formatDashboardNumber(metrics.comparison.daysWithSales.previous),
      // No magnitude exists for this one: each day is simply sold or not.
      marks: daily.map((day) => day.revenue > 0),
    },
  ];

  return (
    <div className={cn(styles.root, "min-h-screen bg-background")}>
      <div className="w-full min-w-0 px-6 pb-12 pt-6">
        <nav aria-label="Ubicación" className="mb-5">
          <ol className="flex items-center gap-2 text-[13px]">
            <li>
              <Link href="/admin/dashboard" className={cn("text-[13px] text-text-secondary", ledgerUi.link)}>
                Estadísticas
              </Link>
            </li>
            <li aria-hidden className="text-text-secondary">
              /
            </li>
            <li className="font-medium text-text-primary" aria-current="page">
              Ventas
            </li>
          </ol>
        </nav>

        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div className="min-w-0">
            <h1 className="text-[2.25rem] font-semibold leading-none tracking-[-0.04em] text-text-primary">
              Ventas
            </h1>
            <p className="mt-3 text-[13.5px] tabular-nums text-text-secondary">
              {rangeLabel} · {periodLabel}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <p className="hidden items-center gap-2 text-[12.5px] tabular-nums text-text-secondary lg:flex">
              <span aria-hidden className="h-[6px] w-[6px] rounded-full bg-[#1f9d55]" />
              Actualizado {formatGeneratedAt(metrics.generatedAt)}
            </p>
            <LedgerControls compareEnabled={compareEnabled} />
          </div>
        </div>

        <LedgerHighlightProvider>
          <div
            className={cn(
              "mt-6 overflow-hidden",
              ledgerRadius.module,
              ledgerUi.module,
            )}
          >
            <MetricBand
              items={metricItems}
              compareEnabled={compareEnabled}
              comparisonAvailable={metrics.comparison.available}
            />
          </div>

          <div className="mt-5 grid min-w-0 gap-5 xl:grid-cols-[2.15fr_1fr]">
            <SeriesChartModule
              title="Facturación diaria"
              data={chartData}
              defaultSeries="revenue"
              height={300}
              linkHighlight
            />

            <LedgerModule
              title="Estado de las órdenes"
              note="Reparto de todo lo creado en el período."
            >
              {totalEntries > 0 ? (
                <OrderStatusDonut slices={statusSlices} />
              ) : (
                <OrderStatusEmpty />
              )}
            </LedgerModule>
          </div>

          <LedgerModule
            title="Libro de órdenes"
            note="Todas las órdenes creadas en el período, de la más reciente a la más antigua."
            action={{ href: "/admin/orders", label: "Ver todas", solid: true }}
            className="mt-5"
          >
            <p className="-mt-1 px-6 pb-4 text-[13px] tabular-nums text-text-secondary">
              <span className="font-semibold text-text-primary">
                {formatDashboardNumber(totalEntries)}
              </span>{" "}
              {totalEntries === 1 ? "orden" : "órdenes"}
              <span aria-hidden className="mx-2 text-text-secondary">
                ·
              </span>
              <span className="font-semibold text-text-primary">
                {formatDashboardNumber(paidInPeriod)}
              </span>{" "}
              {paidInPeriod === 1 ? "pagada" : "pagadas"}
            </p>

            {totalEntries > 0 ? (
              <>
                <SalesLedger entries={pageEntries} />
                <LedgerPagination
                  page={page}
                  totalPages={totalPages}
                  rangeStart={rangeStart + 1}
                  rangeEnd={rangeStart + pageEntries.length}
                  totalEntries={totalEntries}
                  buildHref={buildHref}
                />
              </>
            ) : (
              <div className="border-t border-border px-6 py-14 text-center">
                <p className="text-[15px] font-semibold text-text-primary">
                  No se creó ninguna orden entre el {rangeLabel}
                </p>
                <p className={cn(ledgerUi.note, "mx-auto mt-1.5 max-w-[46ch]")}>
                  El libro registra cada orden por su fecha de creación, esté pagada o no.
                </p>
                {period !== "90d" ? (
                  <p className="mt-4">
                    <Link
                      href="/admin/dashboard/ventas?period=90d"
                      className={cn("text-[13px] font-medium", ledgerUi.link)}
                    >
                      Ver los últimos 90 días
                    </Link>
                  </p>
                ) : null}
              </div>
            )}
          </LedgerModule>

          <div className="mt-5 grid min-w-0 gap-5 xl:grid-cols-[1.15fr_1fr]">
            <LedgerModule
              title="Productos vendidos"
              note="Por facturación en órdenes pagadas del período."
              action={{ href: "/admin/dashboard/productos", label: "Ver productos" }}
            >
              <SoldProductsTable products={metrics.products.topRevenue.slice(0, 8)} />
            </LedgerModule>

            <SeriesChartModule
              title="Evolución de unidades vendidas"
              note="Unidades incluidas en órdenes pagadas, por día."
              data={chartData}
              defaultSeries="unitsSold"
              height={280}
            />
          </div>
        </LedgerHighlightProvider>
      </div>
    </div>
  );
}
