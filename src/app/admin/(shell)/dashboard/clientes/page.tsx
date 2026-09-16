import type { Metadata } from "next";
import { DateRangeFilter } from "@/features/admin/dashboard/components/date-range-filter";
import {
  CustomerKpi,
  CustomerModule,
  IconBuyers,
  IconNew,
  IconRate,
  IconReturning,
} from "@/features/admin/dashboard/components/customers/customer-modules";
import {
  CustomerEvolution,
  SegmentLegend,
} from "@/features/admin/dashboard/components/customers/customer-charts";
import { SegmentDonut } from "@/features/admin/dashboard/components/customers/customer-donut";
import {
  CustomerListTable,
  ShareBars,
  TopCustomersTable,
} from "@/features/admin/dashboard/components/customers/customer-tables";
import {
  DASHBOARD_PERIODS,
  getDashboardMetrics,
  normalizeDashboardPeriodValue,
} from "@/features/admin/dashboard/server/dashboard-service";
import {
  getCustomerAnalyticsPageData,
  normalizeCustomerAnalyticsQuery,
} from "@/features/admin/analytics/server/customer-analytics-service";
import {
  formatDashboardNumber,
  formatDashboardPercent,
  formatDashboardPrice,
} from "@/features/admin/dashboard/lib/dashboard-formatters";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Clientes | DELUAR",
};

const ARGENTINA_TIME_ZONE = "America/Argentina/Buenos_Aires";

type AdminDashboardCustomersPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value) ?? "";
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

function formatPurchaseDate(value: string) {
  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("es-AR", {
    timeZone: ARGENTINA_TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

const FIELD =
  "w-full rounded-[6px] border border-[#e2e8f0] bg-surface px-3 py-[8px] text-[13px] text-text-primary outline-none transition-colors hover:border-[#cbd5e1] focus:border-[#3b7ff5] focus:ring-2 focus:ring-[#3b7ff5]/15";
const FIELD_LABEL =
  "mb-1.5 block text-[10.5px] font-semibold uppercase tracking-[0.12em] text-text-secondary";

export default async function AdminDashboardCustomersPage({
  searchParams,
}: AdminDashboardCustomersPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const period = normalizeDashboardPeriodValue(readParam(resolvedSearchParams.period));
  const segmentFilter = readParam(resolvedSearchParams.segment) || "all";

  const query = normalizeCustomerAnalyticsQuery(resolvedSearchParams);
  const [metrics, dashboard] = await Promise.all([
    getCustomerAnalyticsPageData(query),
    getDashboardMetrics(period),
  ]);

  const periodLabel = DASHBOARD_PERIODS[period].label;
  const lastUpdated = formatGeneratedAt(new Date());
  const { summary, split, evolution, frequency, cohorts, topCustomers } = metrics;

  /** Segment filtering happens over the rows already fetched. */
  const listRows = metrics.table.rows.filter((row) =>
    segmentFilter === "all" ? true : row.status === segmentFilter,
  );

  const provinces = dashboard.location.provinces.slice(0, 5);
  const provinceOrders = dashboard.location.provinces.reduce(
    (sum, province) => sum + province.orders,
    0,
  );

  const locationRows = provinces.map((province) => ({
    key: province.province,
    label: province.province,
    value: province.orders,
    share: provinceOrders > 0 ? (province.orders / provinceOrders) * 100 : 0,
  }));

  const frequencyRows = frequency.map((bucket) => ({
    key: bucket.label,
    label: bucket.label,
    value: bucket.customers,
    share: bucket.share,
  }));

  const cohortRows = cohorts.slice(0, 5).map((cohort) => ({
    key: cohort.cohort,
    label: cohort.cohort,
    value: cohort.secondPurchase,
    share: cohort.secondPurchaseRate,
  }));

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
              Clientes
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

      <div className="flex-1 px-6 pb-12 pt-6 lg:px-8">
        <div className="w-full min-w-0">
          <h1 className="text-[2.1rem] font-semibold leading-none tracking-[-0.04em] text-text-primary">
            Clientes
          </h1>
          <p className="mt-3 text-[13.5px] text-text-secondary">
            Conocé a tus clientes, su comportamiento y su valor · {periodLabel}
          </p>

          {/* ── Row 1 · four KPIs ───────────────────────────────────────────── */}
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <CustomerKpi
              icon={<IconBuyers />}
              tone="primary"
              label="Compradores únicos"
              value={formatDashboardNumber(summary.uniqueBuyers)}
              series={evolution.map((point) => point.newCustomers + point.recurrentCustomers)}
              note={`${formatDashboardNumber(summary.orders)} pedidos en el período`}
            />
            <CustomerKpi
              icon={<IconNew />}
              tone="primary"
              label="Clientes nuevos"
              value={formatDashboardNumber(summary.newCustomers)}
              series={evolution.map((point) => point.newCustomers)}
              note={`${formatDashboardPercent(split.newCustomerShare)} de los compradores`}
            />
            <CustomerKpi
              icon={<IconReturning />}
              tone="secondary"
              label="Clientes recurrentes"
              value={formatDashboardNumber(summary.recurrentCustomers)}
              series={evolution.map((point) => point.recurrentCustomers)}
              note={`${formatDashboardPercent(split.recurrentCustomerShare)} de los compradores`}
            />
            <CustomerKpi
              icon={<IconRate />}
              tone="secondary"
              label="Tasa de recompra"
              value={formatDashboardPercent(summary.repurchaseRate)}
              series={[]}
              note={`${formatDashboardNumber(summary.ordersPerCustomer)} pedidos por cliente`}
            />
          </div>

          {/* ── Row 2 · evolution 62% / split 38% ───────────────────────────── */}
          <div className="mt-3 grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-[1.62fr_1fr]">
            <CustomerModule
              title="Evolución de nuevos y recurrentes"
              note="Cantidad de clientes por día."
              legend={<SegmentLegend />}
            >
              <CustomerEvolution data={evolution} height={240} />
            </CustomerModule>

            <CustomerModule title="Nuevos vs. recurrentes" note="Distribución de clientes.">
              <SegmentDonut
                newValue={split.newCustomers}
                recurrentValue={split.recurrentCustomers}
                centerValue={formatDashboardNumber(summary.uniqueBuyers)}
                centerLabel="clientes"
                formatValue={formatDashboardNumber}
              />
            </CustomerModule>
          </div>

          {/* ── Row 3 · ranking 50 / frequency 50 ───────────────────────────── */}
          <div className="mt-3 grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-2">
            <CustomerModule
              title="Clientes con mayor facturación"
              note="Ranking de clientes por total facturado."
              action={{ href: "/admin/customers", label: "Ver todos" }}
            >
              <TopCustomersTable rows={topCustomers.slice(0, 5)} />
            </CustomerModule>

            <CustomerModule
              title="Clientes por frecuencia de compra"
              note="Cantidad de pedidos por cliente."
            >
              <ShareBars
                rows={frequencyRows}
                emptyMessage="Sin compradores en el período."
                labelWidth={84}
              />
            </CustomerModule>
          </div>

          {/* ── Row 4 · three equal columns ─────────────────────────────────── */}
          <div className="mt-3 grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
            <CustomerModule
              title="Ubicación de clientes"
              note="Principales provincias por cantidad de pedidos."
            >
              <ShareBars
                rows={locationRows}
                emptyMessage="Sin provincias registradas en los envíos del período."
                labelWidth={104}
              />
            </CustomerModule>

            <CustomerModule
              title="Recompra por cohorte"
              note="Clientes que volvieron a comprar, por mes de alta."
            >
              <ShareBars
                rows={cohortRows}
                emptyMessage="Todavía no hay cohortes con historia suficiente."
                labelWidth={84}
              />
            </CustomerModule>

            <CustomerModule
              title="Reparto de facturación"
              note="Cuánto aporta cada segmento."
            >
              <SegmentDonut
                newValue={split.newRevenue}
                recurrentValue={split.recurrentRevenue}
                centerValue={formatDashboardPrice(summary.revenue)}
                centerLabel="facturado"
                formatValue={formatDashboardPrice}
              />
            </CustomerModule>
          </div>

          {/* ── Row 5 · filters ─────────────────────────────────────────────── */}
          <CustomerModule
            title="Filtros"
            note="Filtrá por segmento o búsqueda."
            className="mt-3"
          >
            <form method="get" className="px-5 pb-5">
              <input type="hidden" name="period" value={period} />

              <div className="flex flex-wrap items-end gap-3">
                <label className="min-w-0 flex-1 basis-[200px]">
                  <span className={FIELD_LABEL}>Segmento</span>
                  <select name="segment" defaultValue={segmentFilter} className={FIELD}>
                    <option value="all">Todos</option>
                    <option value="Nuevo">Nuevo</option>
                    <option value="Recurrente">Recurrente</option>
                  </select>
                </label>

                <label className="min-w-0 flex-[2] basis-[260px]">
                  <span className={FIELD_LABEL}>Búsqueda</span>
                  <input
                    type="search"
                    name="q"
                    defaultValue={query.q}
                    placeholder="Nombre o email…"
                    className={cn(FIELD, "placeholder:text-text-secondary")}
                  />
                </label>

                <div className="flex shrink-0 items-center gap-2">
                  <a
                    href={`/admin/dashboard/clientes?period=${period}`}
                    className="rounded-[6px] border border-[#e2e8f0] bg-surface px-4 py-[8px] text-[13px] font-medium text-text-primary transition-colors hover:border-[#cbd5e1] hover:text-text-primary"
                  >
                    Limpiar
                  </a>
                  <button
                    type="submit"
                    className="rounded-[6px] bg-[#3b7ff5] px-5 py-[8px] text-[13px] font-medium text-white transition-colors hover:bg-[#2f6de0]"
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            </form>
          </CustomerModule>

          {/* ── Row 6 · the list ────────────────────────────────────────────── */}
          <CustomerModule
            title="Listado de clientes"
            note="Información de tus clientes en el período seleccionado."
            legend={
              <span className="shrink-0 text-[12px] tabular-nums text-text-secondary">
                {formatDashboardNumber(listRows.length)}{" "}
                {listRows.length === 1 ? "cliente" : "clientes"}
                {metrics.table.pageCount > 1
                  ? ` · página ${metrics.table.page} de ${metrics.table.pageCount}`
                  : ""}
              </span>
            }
            className="mt-3"
          >
            <CustomerListTable
              rows={listRows.map((row) => ({
                key: row.key,
                displayName: row.displayName,
                email: row.email,
                periodOrders: row.periodOrders,
                periodUnits: row.periodUnits,
                periodRevenue: row.periodRevenue,
                lastPurchaseLabel: formatPurchaseDate(row.lastPurchaseAt),
                status: row.status,
              }))}
            />
          </CustomerModule>
        </div>
      </div>
    </main>
  );
}
