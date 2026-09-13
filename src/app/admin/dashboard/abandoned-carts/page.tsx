import type { Metadata } from "next";
import { DateRangeFilter } from "@/features/admin/dashboard/components/date-range-filter";
import {
  AbandonedEmpty,
  AbandonedKpi,
  AbandonedModule,
  IconCart,
  IconCheckout,
  IconTicket,
  IconValue,
} from "@/features/admin/dashboard/components/abandoned/abandoned-modules";
import {
  AbandonedEvolution,
  StageDonut,
} from "@/features/admin/dashboard/components/abandoned/abandoned-charts";
import {
  AbandonedCartsTable,
  AbandonedProductsTable,
  SourceBars,
} from "@/features/admin/dashboard/components/abandoned/abandoned-tables";
import {
  DASHBOARD_PERIODS,
  normalizeDashboardPeriodValue,
} from "@/features/admin/dashboard/server/dashboard-service";
import {
  formatDashboardNumber,
  formatDashboardPrice,
} from "@/features/admin/dashboard/lib/dashboard-formatters";
import {
  formatAbandonedCartDateTime,
  getAbandonedCartsPageData,
  normalizeAbandonedCartsQuery,
} from "@/features/admin/analytics/server/abandoned-carts-service";
import { getProductAnalyticsPageData } from "@/features/admin/analytics/server/product-analytics-service";
import { buildAbandonedPreview } from "@/features/admin/dashboard/components/abandoned/preview-data";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Carritos abandonados | DELUAR",
};

const ARGENTINA_TIME_ZONE = "America/Argentina/Buenos_Aires";

type AdminDashboardAbandonedCartsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
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

const FIELD =
  "w-full rounded-[6px] border border-[#e2e8f0] bg-white px-3 py-[7px] text-[13px] text-slate-900 outline-none transition-colors hover:border-[#cbd5e1] focus:border-[#4f52c9] focus:ring-2 focus:ring-[#4f52c9]/15";
const FIELD_LABEL = "mb-1.5 block text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-500";

export default async function AdminDashboardAbandonedCartsPage({
  searchParams,
}: AdminDashboardAbandonedCartsPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const parsedPeriod = normalizeDashboardPeriodValue(
    Array.isArray(resolvedSearchParams.period)
      ? resolvedSearchParams.period[0]
      : resolvedSearchParams.period,
  );
  const query = normalizeAbandonedCartsQuery({ ...resolvedSearchParams, period: parsedPeriod });

  const [data, productData] = await Promise.all([
    getAbandonedCartsPageData(query),
    getProductAnalyticsPageData({ period: query.period, sort: "abandonments", page: 1, pageSize: 10 }),
  ]);

  const periodLabel = DASHBOARD_PERIODS[query.period].label;
  const lastUpdated = formatGeneratedAt(new Date());

  /**
   * Development-only look at the populated layout. It never reaches production
   * and never touches the database: the rows below are invented and the page
   * says so on screen.
   */
  const previewRequested =
    process.env.NODE_ENV !== "production" &&
    (Array.isArray(resolvedSearchParams.preview)
      ? resolvedSearchParams.preview[0]
      : resolvedSearchParams.preview) === "1";
  const preview = previewRequested ? buildAbandonedPreview(data.daily) : null;

  const totals = preview?.totals ?? data.totals;
  const daily = preview?.daily ?? data.daily;
  const sources = preview?.sources ?? data.sources;

  const stageOptions = [
    { value: "all", label: "Todos" },
    { value: "CART_ABANDONED", label: "Carrito abandonado" },
    { value: "CHECKOUT_ABANDONED", label: "Checkout abandonado" },
  ];
  const sourceOptions = [
    { value: "all", label: "Todas" },
    ...data.sourceOptions.map((value) => ({ value, label: value })),
  ];
  const campaignOptions = [
    { value: "all", label: "Todas" },
    ...data.campaignOptions.map((value) => ({ value, label: value })),
  ];

  // Daily ticket comes from the two daily figures the service already returns.
  const ticketSeries = daily.map((day) => {
    const count = day.carts + day.checkouts;
    return count > 0 ? day.value / count : 0;
  });

  const abandonedProducts =
    preview?.products ??
    productData.products
      .filter((row) => row.abandonedCarts > 0)
      .slice(0, 5)
      .map((row) => ({
        productId: row.productId,
        productName: row.productName,
        imageUrl: row.imageUrl,
        abandonedCarts: row.abandonedCarts,
      }));

  const cartRows = preview?.carts ?? data.carts.map((cart) => ({
    cartId: cart.cartId,
    abandonedAtLabel: formatAbandonedCartDateTime(cart.abandonedAt),
    customerLabel: `${cart.visitorId.slice(0, 8)}…`,
    productSummary: cart.productSummary,
    subtotal: cart.subtotal,
    status: cart.status,
    stageLabel: cart.stageLabel,
    sourceLabel: cart.sourceLabel,
    campaignLabel: cart.campaignLabel,
  }));

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
              Carritos abandonados
            </li>
          </ol>
        </nav>
        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden text-[12px] tabular-nums text-slate-400 lg:block">
            {lastUpdated}
          </span>
          <DateRangeFilter topBar />
        </div>
      </header>

      <div className="flex-1 px-6 pb-12 pt-6 lg:px-8">
        <div className="w-full min-w-0">
          <h1 className="text-[2.1rem] font-semibold leading-none tracking-[-0.04em] text-slate-950">
            Carritos abandonados
          </h1>
          <p className="mt-3 text-[13.5px] text-slate-500">
            Usuarios que agregaron productos al carrito pero no finalizaron la compra ·{" "}
            {periodLabel}
          </p>

          {preview ? (
            <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[10px] border border-[#f5d0a9] bg-[#fdf6ec] px-4 py-3">
              <span className="rounded-full bg-[#b45309] px-2.5 py-[3px] text-[11px] font-semibold uppercase tracking-[0.08em] text-white">
                Datos de demostración
              </span>
              <span className="text-[12.5px] text-[#8a5a12]">
                Nada de esto es real ni está guardado. Quitá <code>?preview=1</code> de la URL
                para volver a los datos del período.
              </span>
            </div>
          ) : null}

          {/* ── Row 1 · four KPIs ───────────────────────────────────────────── */}
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <AbandonedKpi
              icon={<IconCart />}
              tone="friction"
              label="Carritos abandonados"
              value={formatDashboardNumber(totals.cartAbandonedCount)}
              context={`De ${formatDashboardNumber(totals.totalCount)} abandonos del período`}
              series={daily.map((day) => day.carts)}
            />
            <AbandonedKpi
              icon={<IconCheckout />}
              tone="friction"
              label="Checkouts abandonados"
              value={formatDashboardNumber(totals.checkoutAbandonedCount)}
              context="Llegaron al checkout y no compraron"
              series={daily.map((day) => day.checkouts)}
            />
            <AbandonedKpi
              icon={<IconValue />}
              tone="info"
              label="Valor total abandonado"
              value={formatDashboardPrice(totals.totalValue)}
              context={`${formatDashboardNumber(totals.totalUnits)} unidades sin comprar`}
              series={daily.map((day) => day.value)}
            />
            <AbandonedKpi
              icon={<IconTicket />}
              tone="neutral"
              label="Ticket promedio"
              value={formatDashboardPrice(totals.averageTicket)}
              context={`Tiempo medio hasta el abandono: ${totals.averageTimeLabel}`}
              series={ticketSeries}
            />
          </div>

          {/* ── Row 2 · evolution 59% / stage 39% ───────────────────────────── */}
          <div className="mt-3 grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-[1.5fr_1fr]">
            <AbandonedModule
              title="Evolución de carritos abandonados"
              note="Cantidad de carritos por día."
            >
              <AbandonedEvolution data={daily} height={230} />
            </AbandonedModule>

            <AbandonedModule
              title="Carritos por etapa"
              note="Última etapa alcanzada antes de abandonar."
            >
              <StageDonut
                cartCount={totals.cartAbandonedCount}
                checkoutCount={totals.checkoutAbandonedCount}
              />
            </AbandonedModule>
          </div>

          {/* ── Row 3 · sources 43% / products 55% ──────────────────────────── */}
          <div className="mt-3 grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-[1fr_1.28fr]">
            <AbandonedModule
              title="Fuentes de tráfico"
              note="De dónde provienen los carritos abandonados."
            >
              <SourceBars rows={sources.slice(0, 6)} />
            </AbandonedModule>

            <AbandonedModule
              title="Productos más abandonados"
              note="Productos más agregados al carrito pero no comprados."
              action={{ href: "/admin/dashboard/productos", label: "Ver todos" }}
            >
              <AbandonedProductsTable rows={abandonedProducts} total={totals.totalCount} />
            </AbandonedModule>
          </div>

          {/* ── Row 4 · filters, compact and secondary ──────────────────────── */}
          <AbandonedModule
            title="Filtros"
            note="Filtrá por etapa, fuente, campaña o búsqueda libre."
            className="mt-3"
          >
            <form method="get" className="px-5 pb-5">
              <input type="hidden" name="period" value={query.period} />
              <input type="hidden" name="page" value="1" />

              <div className="flex flex-wrap items-end gap-3">
                <label className="min-w-0 flex-1 basis-[150px]">
                  <span className={FIELD_LABEL}>Etapa</span>
                  <select name="stage" defaultValue={query.stage} className={FIELD}>
                    {stageOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="min-w-0 flex-1 basis-[150px]">
                  <span className={FIELD_LABEL}>Fuente</span>
                  <select name="source" defaultValue={query.source} className={FIELD}>
                    {sourceOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="min-w-0 flex-1 basis-[150px]">
                  <span className={FIELD_LABEL}>Campaña</span>
                  <select name="campaign" defaultValue={query.campaign} className={FIELD}>
                    {campaignOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="min-w-0 flex-[1.4] basis-[190px]">
                  <span className={FIELD_LABEL}>Búsqueda</span>
                  <input
                    type="search"
                    name="q"
                    defaultValue={query.q}
                    placeholder="ID, sesión o producto…"
                    className={cn(FIELD, "placeholder:text-slate-400")}
                  />
                </label>

                <div className="flex shrink-0 items-center gap-2">
                  <a
                    href={`/admin/dashboard/abandoned-carts?period=${query.period}`}
                    className="rounded-[6px] border border-[#e2e8f0] bg-white px-3.5 py-[7px] text-[13px] font-medium text-slate-700 transition-colors hover:border-[#cbd5e1] hover:text-slate-900"
                  >
                    Limpiar
                  </a>
                  <button
                    type="submit"
                    className="rounded-[6px] bg-[#4f52c9] px-4 py-[7px] text-[13px] font-medium text-white transition-colors hover:bg-[#4348b4]"
                  >
                    Aplicar
                  </button>
                </div>

                <label className="min-w-0 shrink-0 basis-[128px]">
                  <span className={FIELD_LABEL}>Por página</span>
                  <select name="pageSize" defaultValue={String(query.pageSize)} className={FIELD}>
                    {["25", "50", "100"].map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </form>
          </AbandonedModule>

          {/* ── Row 5 · the list ────────────────────────────────────────────── */}
          <AbandonedModule
            title="Lista de carritos abandonados"
            note="Ordenado por fecha de abandono descendente."
            control={
              <span className="shrink-0 text-[12px] tabular-nums text-slate-500">
                {formatDashboardNumber(totals.totalCount)}{" "}
                {totals.totalCount === 1 ? "resultado" : "resultados"}
                {(preview?.pageCount ?? data.pageCount) > 1
                  ? ` · página ${preview?.page ?? data.page} de ${preview?.pageCount ?? data.pageCount}`
                  : ""}
              </span>
            }
            className="mt-3"
          >
            <AbandonedCartsTable rows={cartRows} />
            {totals.totalCount === 0 ? (
              <AbandonedEmpty message={`Ningún carrito quedó sin finalizar entre los ${periodLabel.toLowerCase()}. La ausencia de abandonos también es una lectura del período.`} />
            ) : null}
          </AbandonedModule>
        </div>
      </div>
    </main>
  );
}
