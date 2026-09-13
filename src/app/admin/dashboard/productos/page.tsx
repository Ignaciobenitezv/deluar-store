import type { Metadata } from "next";
import { DateRangeFilter } from "@/features/admin/dashboard/components/date-range-filter";
import {
  IconBox,
  IconCart,
  IconStack,
  IconTag,
  ProductKpi,
  ProductModule,
} from "@/features/admin/dashboard/components/products/product-modules";
import {
  CategoryDonut,
  ProductEvolution,
  ProductEvolutionLegend,
} from "@/features/admin/dashboard/components/products/product-charts";
import {
  ProductFunnelBars,
  ProductFunnelLegend,
  ProductRanking,
  StockTable,
} from "@/features/admin/dashboard/components/products/product-tables";
import {
  DASHBOARD_PERIODS,
  getDashboardMetrics,
  normalizeDashboardPeriodValue,
} from "@/features/admin/dashboard/server/dashboard-service";
import type { DashboardDelta } from "@/features/admin/dashboard/server/dashboard-service";
import { getProductAnalyticsPageData } from "@/features/admin/analytics/server/product-analytics-service";
import {
  formatDashboardNumber,
  formatDashboardPrice,
} from "@/features/admin/dashboard/lib/dashboard-formatters";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Análisis de productos | DELUAR",
};

const ARGENTINA_TIME_ZONE = "America/Argentina/Buenos_Aires";

type AdminDashboardProductsPageProps = {
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

/** A delta only becomes a percentage when the previous window is real and non-zero. */
function toKpiDelta(delta: DashboardDelta) {
  if (delta.direction === "unmeasurable" || delta.direction === "flat") {
    return null;
  }

  if (delta.changePercent === null) {
    return null;
  }

  return { changePercent: delta.changePercent, rising: delta.direction === "up" };
}

const FIELD =
  "w-full rounded-[6px] border border-[#e2e8f0] bg-white px-3 py-[8px] text-[13px] text-slate-900 outline-none transition-colors hover:border-[#cbd5e1] focus:border-[#4f52c9] focus:ring-2 focus:ring-[#4f52c9]/15";
const FIELD_LABEL =
  "mb-1.5 block text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-500";

export default async function AdminDashboardProductsPage({
  searchParams,
}: AdminDashboardProductsPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const period = normalizeDashboardPeriodValue(readParam(resolvedSearchParams.period));
  const categoryFilter = readParam(resolvedSearchParams.category) || "all";
  const stockFilter = readParam(resolvedSearchParams.stock) || "all";
  const search = readParam(resolvedSearchParams.q).trim();

  const [metrics, productData] = await Promise.all([
    getDashboardMetrics(period),
    getProductAnalyticsPageData({ period, sort: "revenue", page: 1, pageSize: 100 }),
  ]);

  const periodLabel = DASHBOARD_PERIODS[period].label;
  const lastUpdated = formatGeneratedAt(new Date());
  const { catalog, categoryRevenue } = metrics.products;

  const catalogBySlug = new Map(catalog.map((item) => [item.productSlug, item]));
  const categories = [...new Set(catalog.map((item) => item.category))].sort((left, right) =>
    left.localeCompare(right),
  );

  const normalizedSearch = search.toLowerCase();

  /** Filtering happens over the data already fetched: no extra query per filter. */
  const matchesFilters = (slug: string, name: string) => {
    const entry = catalogBySlug.get(slug);

    if (categoryFilter !== "all" && entry?.category !== categoryFilter) {
      return false;
    }

    if (stockFilter !== "all" && entry?.stockStatus !== stockFilter) {
      return false;
    }

    if (normalizedSearch && !name.toLowerCase().includes(normalizedSearch)) {
      return false;
    }

    return true;
  };

  const rows = productData.products.filter((row) =>
    matchesFilters(row.productSlug, row.productName),
  );

  const unitsTotal = rows.reduce((sum, row) => sum + row.unitsSold, 0);
  const revenueTotal = rows.reduce((sum, row) => sum + row.revenue, 0);

  const topUnits = [...rows]
    .filter((row) => row.unitsSold > 0)
    .sort((left, right) => right.unitsSold - left.unitsSold)
    .slice(0, 5)
    .map((row) => ({
      productId: row.productId,
      productName: row.productName,
      imageUrl: row.imageUrl,
      value: row.unitsSold,
      share: unitsTotal > 0 ? (row.unitsSold / unitsTotal) * 100 : 0,
    }));

  const topRevenue = [...rows]
    .filter((row) => row.revenue > 0)
    .sort((left, right) => right.revenue - left.revenue)
    .slice(0, 5)
    .map((row) => ({
      productId: row.productId,
      productName: row.productName,
      imageUrl: row.imageUrl,
      value: row.revenue,
      share: revenueTotal > 0 ? (row.revenue / revenueTotal) * 100 : 0,
    }));

  const stockRows = catalog
    .filter((item) => item.stockStatus !== "in_stock")
    .filter((item) => matchesFilters(item.productSlug, item.productName))
    .sort((left, right) => left.stock - right.stock || left.productName.localeCompare(right.productName))
    .slice(0, 5)
    .map((item) => ({
      productId: item.productId,
      productName: item.productName,
      stock: item.stock,
      status: item.stockStatus as "low_stock" | "out_of_stock",
    }));

  const funnelRows = [...rows]
    .filter((row) => row.views > 0)
    .sort((left, right) => right.views - left.views)
    .slice(0, 5)
    .map((row) => ({
      productId: row.productId,
      productName: row.productName,
      views: row.views,
      addToCart: row.addToCart,
      purchases: row.purchases,
    }));

  const visibleCategoryRevenue =
    categoryFilter === "all"
      ? categoryRevenue.slice(0, 6)
      : categoryRevenue.filter((item) => item.category === categoryFilter);

  const chartData = metrics.sales.daily.map((day) => ({
    date: day.date,
    label: day.label,
    unitsSold: day.unitsSold,
    revenue: day.revenue,
  }));

  const productsSold = rows.filter((row) => row.purchases > 0).length;
  const lowStockCount = catalog.filter((item) => item.stockStatus === "low_stock").length;

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
              Análisis de productos
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
            Análisis de productos
          </h1>
          <p className="mt-3 text-[13.5px] text-slate-500">
            Rendimiento de productos, categorías y stock · {periodLabel}
          </p>

          {/* ── Row 1 · four KPIs ───────────────────────────────────────────── */}
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ProductKpi
              icon={<IconBox />}
              tone="info"
              label="Productos vendidos"
              value={formatDashboardNumber(productsSold)}
              series={[]}
              note={`De ${formatDashboardNumber(catalog.length)} productos del catálogo`}
            />
            <ProductKpi
              icon={<IconTag />}
              tone="info"
              label="Facturación por productos"
              value={formatDashboardPrice(metrics.summary.billingTotal)}
              series={metrics.sales.daily.map((day) => day.revenue)}
              delta={toKpiDelta(metrics.comparison.billingTotal)}
              note="Sin período comparable"
            />
            <ProductKpi
              icon={<IconCart />}
              tone="positive"
              label="Unidades vendidas"
              value={formatDashboardNumber(metrics.summary.unitsSold)}
              series={metrics.sales.daily.map((day) => day.unitsSold)}
              delta={toKpiDelta(metrics.comparison.unitsSold)}
              note="Sin período comparable"
            />
            <ProductKpi
              icon={<IconStack />}
              tone="warning"
              label="Productos con stock bajo"
              value={formatDashboardNumber(lowStockCount)}
              series={[]}
              note={`${formatDashboardNumber(metrics.summary.outOfStockProducts)} sin stock`}
            />
          </div>

          {/* ── Row 2 · evolution 60% / categories 39% ──────────────────────── */}
          <div className="mt-3 grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-[1.55fr_1fr]">
            <ProductModule
              title="Evolución de productos vendidos"
              note="Unidades vendidas por día."
              legend={<ProductEvolutionLegend />}
            >
              <ProductEvolution data={chartData} height={250} />
            </ProductModule>

            <ProductModule title="Ventas por categoría" note="Participación en la facturación.">
              <CategoryDonut
                slices={visibleCategoryRevenue}
                totalLabel={formatDashboardPrice(metrics.summary.billingTotal)}
              />
            </ProductModule>
          </div>

          {/* ── Row 3 · two rankings 50 / 50 ────────────────────────────────── */}
          <div className="mt-3 grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-2">
            <ProductModule
              title="Productos más vendidos"
              note="Por unidades vendidas."
              action={{ href: "/admin/productos", label: "Ver todos" }}
            >
              <ProductRanking
                rows={topUnits}
                valueHeader="Unidades"
                emptyMessage="Ningún producto registró unidades vendidas en el período."
              />
            </ProductModule>

            <ProductModule
              title="Productos por facturación"
              note="Productos que más ingresos generan."
              action={{ href: "/admin/productos", label: "Ver todos" }}
            >
              <ProductRanking
                rows={topRevenue}
                valueHeader="Facturación"
                money
                emptyMessage="Ningún producto generó facturación en el período."
              />
            </ProductModule>
          </div>

          {/* ── Row 4 · stock 50 / journey 50 ───────────────────────────────── */}
          <div className="mt-3 grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-2">
            <ProductModule
              title="Stock bajo y sin stock"
              note="Productos que requieren atención."
              action={{ href: "/admin/productos", label: "Ver todos" }}
            >
              <StockTable rows={stockRows} />
            </ProductModule>

            <ProductModule
              title="Recorrido por producto"
              note="De la visita a la compra, por producto."
              legend={<ProductFunnelLegend />}
            >
              <ProductFunnelBars rows={funnelRows} />
            </ProductModule>
          </div>

          {/* ── Row 5 · filters, full width ─────────────────────────────────── */}
          <ProductModule
            title="Filtros"
            note="Filtrá por categoría, stock o búsqueda de producto."
            className="mt-3"
          >
            <form method="get" className="px-5 pb-5">
              <input type="hidden" name="period" value={period} />

              <div className="flex flex-wrap items-end gap-3">
                <label className="min-w-0 flex-1 basis-[180px]">
                  <span className={FIELD_LABEL}>Categoría</span>
                  <select name="category" defaultValue={categoryFilter} className={FIELD}>
                    <option value="all">Todas</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="min-w-0 flex-1 basis-[180px]">
                  <span className={FIELD_LABEL}>Estado de stock</span>
                  <select name="stock" defaultValue={stockFilter} className={FIELD}>
                    <option value="all">Todos</option>
                    <option value="in_stock">Con stock</option>
                    <option value="low_stock">Stock bajo</option>
                    <option value="out_of_stock">Sin stock</option>
                  </select>
                </label>

                <label className="min-w-0 flex-[2] basis-[240px]">
                  <span className={FIELD_LABEL}>Búsqueda</span>
                  <input
                    type="search"
                    name="q"
                    defaultValue={search}
                    placeholder="Nombre de producto…"
                    className={cn(FIELD, "placeholder:text-slate-400")}
                  />
                </label>

                <div className="flex shrink-0 items-center gap-2">
                  <a
                    href={`/admin/dashboard/productos?period=${period}`}
                    className="rounded-[6px] border border-[#e2e8f0] bg-white px-4 py-[8px] text-[13px] font-medium text-slate-700 transition-colors hover:border-[#cbd5e1] hover:text-slate-900"
                  >
                    Limpiar
                  </a>
                  <button
                    type="submit"
                    className="rounded-[6px] bg-[#4f52c9] px-5 py-[8px] text-[13px] font-medium text-white transition-colors hover:bg-[#4348b4]"
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            </form>
          </ProductModule>
        </div>
      </div>
    </main>
  );
}
