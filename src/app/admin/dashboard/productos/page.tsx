import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ChartCard } from "@/features/admin/dashboard/components/chart-card";
import { DashboardSubpageShell } from "@/features/admin/dashboard/components/dashboard-subpage-shell";
import { EmptyState } from "@/features/admin/dashboard/components/empty-state";
import { KpiCard } from "@/features/admin/dashboard/components/kpi-card";
import { ProductAnalyticsBarChart } from "@/features/admin/dashboard/components/charts/product-analytics-bar-chart";
import {
  DASHBOARD_PERIODS,
  normalizeDashboardPeriodValue,
} from "@/features/admin/dashboard/server/dashboard-service";
import {
  formatDashboardDateTime,
  formatDashboardNumber,
  formatDashboardPercent,
  formatDashboardPrice,
} from "@/features/admin/dashboard/lib/dashboard-formatters";
import { cn } from "@/lib/utils";
import {
  PRODUCT_ANALYTICS_PAGE_SIZES,
  PRODUCT_ANALYTICS_SORT_OPTIONS,
  getProductAnalyticsPageData,
  normalizeProductAnalyticsQuery,
  type ProductAnalyticsFilters,
  type ProductAnalyticsRow,
  type ProductAnalyticsSortKey,
  type ProductOpportunityKey,
} from "@/features/admin/analytics/server/product-analytics-service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Análisis de productos | DELUAR",
};

type AdminDashboardProductsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getVisiblePages(page: number, pageCount: number) {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const pages = new Set<number>([1, pageCount, page - 1, page, page + 1]);
  return [...pages].filter((v) => v >= 1 && v <= pageCount).sort((a, b) => a - b);
}

function getRateLabel(rate: number | null) {
  return rate === null ? "—" : formatDashboardPercent(rate * 100);
}

function getOpportunityLabel(tag: ProductOpportunityKey) {
  switch (tag) {
    case "many_views_low_cart": return "Muchas vistas, poco carrito";
    case "high_cart_low_purchase": return "Mucho carrito, poca compra";
    case "many_abandons": return "Muchos abandonos";
    case "good_conversion": return "Buena conversión";
    default: return tag;
  }
}

function getOpportunityBadgeClass(tag: ProductOpportunityKey) {
  switch (tag) {
    case "many_views_low_cart": return "border-amber-200 bg-amber-50 text-amber-800";
    case "high_cart_low_purchase": return "border-sky-200 bg-sky-50 text-sky-800";
    case "many_abandons": return "border-rose-200 bg-rose-50 text-rose-800";
    case "good_conversion": return "border-emerald-200 bg-emerald-50 text-emerald-800";
    default: return "border-[#e8e5e1] bg-white text-slate-600";
  }
}

function buildHref(current: ProductAnalyticsFilters, overrides: Partial<ProductAnalyticsFilters> = {}) {
  const next = { ...current, ...overrides };
  const params = new URLSearchParams();
  params.set("period", next.period);
  if (next.sort !== "revenue") params.set("sort", next.sort);
  if (next.page > 1) params.set("page", String(next.page));
  if (next.pageSize !== 25) params.set("pageSize", String(next.pageSize));
  const query = params.toString();
  return query ? `/admin/dashboard/productos?${query}` : "/admin/dashboard/productos";
}

function OpportunityBadges({ tags }: { tags: ProductOpportunityKey[] }) {
  if (tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag) => (
        <span key={tag} className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold", getOpportunityBadgeClass(tag))}>
          {getOpportunityLabel(tag)}
        </span>
      ))}
    </div>
  );
}

function ProductCell({ product }: { product: ProductAnalyticsRow }) {
  const initial = product.productName.trim().charAt(0).toUpperCase() || "P";
  return (
    <div className="flex items-start gap-3">
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-[8px] border border-[#e8e5e1] bg-slate-100">
        {product.imageUrl ? (
          <Image src={product.imageUrl} alt={product.productName} fill sizes="40px" className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[12px] font-semibold text-slate-500">{initial}</div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-slate-900">{product.productName}</p>
        <p className="mt-0.5 truncate text-[11px] text-slate-400">{product.productSlug}</p>
        <div className="mt-1"><OpportunityBadges tags={product.opportunityTags} /></div>
      </div>
    </div>
  );
}

function PaginationLink({ href, children, active = false, disabled = false }: { href: string; children: React.ReactNode; active?: boolean; disabled?: boolean }) {
  const cls = cn(
    "inline-flex h-9 min-w-9 items-center justify-center rounded-full border px-3 text-[13px] font-semibold transition",
    active ? "border-slate-900 bg-slate-900 text-white" : "border-[#e8e5e1] bg-white text-slate-700 hover:bg-slate-50",
    disabled && "pointer-events-none opacity-40",
  );
  if (disabled) return <span className={cls}>{children}</span>;
  return <Link href={href} className={cls} aria-current={active ? "page" : undefined}>{children}</Link>;
}

function IconViews() {
  return (
    <svg viewBox="0 0 22 22" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.5 11C3.5 6 7 3.5 11 3.5S18.5 6 20.5 11c-2 5-5.5 7.5-9.5 7.5S3.5 16 1.5 11Z" />
      <circle cx="11" cy="11" r="3" />
    </svg>
  );
}
function IconCart() {
  return (
    <svg viewBox="0 0 22 22" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3h2l1.5 9h9.5l1.5-6H7" /><circle cx="9" cy="19" r="1.5" /><circle cx="17" cy="19" r="1.5" />
    </svg>
  );
}
function IconUnits() {
  return (
    <svg viewBox="0 0 22 22" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 3.5L3.5 7.5v7L11 18.5l7.5-4v-7L11 3.5Z" /><path d="M11 3.5v15M3.5 7.5l7.5 4 7.5-4" />
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

export default async function AdminDashboardProductsPage({ searchParams }: AdminDashboardProductsPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const parsedPeriod = normalizeDashboardPeriodValue(
    Array.isArray(resolvedSearchParams.period) ? resolvedSearchParams.period[0] : resolvedSearchParams.period,
  );
  const query = normalizeProductAnalyticsQuery({ ...resolvedSearchParams, period: parsedPeriod });
  const data = await getProductAnalyticsPageData(query);
  const lastUpdated = formatDashboardDateTime(new Date());
  const periodLabel = DASHBOARD_PERIODS[query.period].label;

  return (
    <DashboardSubpageShell
      sectionLabel="Productos"
      title="Análisis de productos"
      subtitle={`Vista completa de analytics de producto. Período activo: ${periodLabel}.`}
      lastUpdated={lastUpdated}
    >
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard
          title="Vistas de producto"
          value={formatDashboardNumber(data.totals.views)}
          description="Eventos PRODUCT_VIEWED del período."
          icon={<IconViews />}
          tone="accent"
        />
        <KpiCard
          title="Add to carts"
          value={formatDashboardNumber(data.totals.addToCart)}
          description="Eventos ADD_TO_CART del período."
          icon={<IconCart />}
          tone="warning"
        />
        <KpiCard
          title="Unidades vendidas"
          value={formatDashboardNumber(data.totals.unitsSold)}
          description="Unidades sobre órdenes pagadas."
          icon={<IconUnits />}
          tone="success"
        />
        <KpiCard
          title="Facturación"
          value={formatDashboardPrice(data.totals.revenue)}
          description="Ingresos sobre órdenes pagadas."
          icon={<IconRevenue />}
          tone="neutral"
        />
      </div>

      {/* Filter / sort controls */}
      <ChartCard title="Filtros y orden" description="Reutilizá el selector de período y configurá orden y tamaño de página.">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-1.5">
            {PRODUCT_ANALYTICS_SORT_OPTIONS.map((option) => {
              const active = data.sortKey === option.value;
              return (
                <Link
                  key={option.value}
                  href={buildHref(data.filters, { sort: option.value as ProductAnalyticsSortKey, page: 1 })}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-[11px] font-semibold transition",
                    active
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-[#e8e5e1] bg-white text-slate-600 hover:bg-slate-50",
                  )}
                >
                  {option.label}
                </Link>
              );
            })}
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            {PRODUCT_ANALYTICS_PAGE_SIZES.map((size) => {
              const active = data.pageSize === size;
              return (
                <Link
                  key={size}
                  href={buildHref(data.filters, { pageSize: size, page: 1 })}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-[11px] font-semibold transition",
                    active
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-[#e8e5e1] bg-white text-slate-600 hover:bg-slate-50",
                  )}
                >
                  {size}
                </Link>
              );
            })}
            <span className="text-[12px] text-slate-400">por página</span>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-3">
          {[
            { label: "Productos con actividad", value: formatDashboardNumber(data.totals.products) },
            { label: "Vistas → carrito", value: getRateLabel(data.totals.viewToCartRate) },
            { label: "Carrito → compra", value: getRateLabel(data.totals.cartToPurchaseRate) },
          ].map((m) => (
            <div key={m.label} className="flex items-center gap-2">
              <span className="text-[12px] text-slate-400">{m.label}</span>
              <span className="text-[13px] font-semibold text-slate-800">{m.value}</span>
            </div>
          ))}
        </div>
      </ChartCard>

      {/* Charts 2x2 */}
      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Productos más vendidos" description={`Top 10 por compras reales — ${periodLabel}.`} className="min-w-0">
          <ProductAnalyticsBarChart data={data.charts.topSold} metricLabel="Compras" color="#9d7d62" />
        </ChartCard>
        <ChartCard title="Productos mayor facturación" description={`Top 10 por revenue — ${periodLabel}.`} className="min-w-0">
          <ProductAnalyticsBarChart data={data.charts.topAdded} metricLabel="Add to cart" color="#314158" />
        </ChartCard>
        <ChartCard title="Productos más vistos" description={`Top 10 por PRODUCT_VIEWED — ${periodLabel}.`} className="min-w-0">
          <ProductAnalyticsBarChart data={data.charts.topViewed} metricLabel="Vistas" color="#7fa3c4" />
        </ChartCard>
        <ChartCard title="Productos más agregados al carrito" description={`Top 10 por ADD_TO_CART — ${periodLabel}.`} className="min-w-0">
          <ProductAnalyticsBarChart data={data.charts.topAbandoned} metricLabel="Abandonos" color="#e07b5e" />
        </ChartCard>
      </div>

      {/* Opportunities 2x2 */}
      <div className="grid gap-4 xl:grid-cols-2">
        {[
          {
            title: "Oportunidad A — Muchas vistas, poco carrito",
            description: "Top 25% por vistas y por debajo de la mediana en view → cart.",
            items: data.opportunities.manyViewsLowCart.map((p) => ({
              id: p.productId, name: p.productName, slug: p.productSlug,
              main: formatDashboardNumber(p.views), sub: `View → Cart ${getRateLabel(p.viewToCartRate)}`,
              maxVal: data.opportunities.manyViewsLowCart[0]?.views ?? 1, val: p.views,
            })),
            emptyMsg: "No hay productos con oportunidad A en este período.",
          },
          {
            title: "Oportunidad B — Mucho carrito, poca compra",
            description: "Top 25% por add-to-cart y por debajo de la mediana en cart → compra.",
            items: data.opportunities.highCartLowPurchase.map((p) => ({
              id: p.productId, name: p.productName, slug: p.productSlug,
              main: formatDashboardNumber(p.addToCart), sub: `Cart → Compra ${getRateLabel(p.cartToPurchaseRate)}`,
              maxVal: data.opportunities.highCartLowPurchase[0]?.addToCart ?? 1, val: p.addToCart,
            })),
            emptyMsg: "No hay productos con oportunidad B en este período.",
          },
          {
            title: "Oportunidad C — Muchos abandonos",
            description: "Top 25% por abandonos y al menos 1 abandono.",
            items: data.opportunities.manyAbandons.map((p) => ({
              id: p.productId, name: p.productName, slug: p.productSlug,
              main: formatDashboardNumber(p.abandonedCarts), sub: `${formatDashboardNumber(p.abandonedUnits)} unidades`,
              maxVal: data.opportunities.manyAbandons[0]?.abandonedCarts ?? 1, val: p.abandonedCarts,
            })),
            emptyMsg: "No hay productos con nivel claro de abandono.",
          },
          {
            title: "Oportunidad D — Buena conversión",
            description: "Top 25% por cart → compra y al menos 1 compra.",
            items: data.opportunities.goodConversion.map((p) => ({
              id: p.productId, name: p.productName, slug: p.productSlug,
              main: getRateLabel(p.cartToPurchaseRate), sub: formatDashboardPrice(p.revenue),
              maxVal: 100, val: (p.cartToPurchaseRate ?? 0) * 100,
            })),
            emptyMsg: "No hay productos con conversión destacada.",
          },
        ].map((opp) => (
          <ChartCard key={opp.title} title={opp.title} description={opp.description} className="min-w-0">
            {opp.items.length > 0 ? (
              <div>
                {opp.items.map((item) => (
                  <div key={item.id} className="border-b border-slate-100 py-3 last:border-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-slate-800">{item.name}</p>
                        <p className="mt-0.5 truncate text-[11px] text-slate-400">{item.sub}</p>
                      </div>
                      <p className="shrink-0 text-[13px] font-semibold text-slate-900">{item.main}</p>
                    </div>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-[#c4b5a5]" style={{ width: `${Math.max(6, (item.val / item.maxVal) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title={opp.emptyMsg} description="" />
            )}
          </ChartCard>
        ))}
      </div>

      {/* Product table */}
      <ChartCard
        title="Tabla de detalle de productos"
        description={`Comparación por producto — ${periodLabel}. Orden: ${data.sortKey}.`}
        className="min-w-0"
      >
        {data.products.length > 0 ? (
          <>
            {/* Desktop */}
            <div className="hidden overflow-hidden rounded-[10px] border border-[#e8e5e1] md:block">
              <div className="overflow-x-auto">
                <table className="min-w-[1500px] w-full border-collapse">
                  <thead className="bg-slate-50 text-left">
                    <tr>
                      {["Producto", "Vistas", "Al carrito", "Removidos", "Compras", "Unidades", "View → Cart", "Cart → Compra", "Abandonos", "Revenue"].map((h) => (
                        <th key={h} className="px-4 py-3 text-[11px] font-semibold text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.products.map((product) => (
                      <tr key={product.productId} className="border-t border-[#e8e5e1] align-top">
                        <td className="px-4 py-3"><ProductCell product={product} /></td>
                        <td className="px-4 py-3 text-[13px] text-slate-600">{formatDashboardNumber(product.views)}</td>
                        <td className="px-4 py-3 text-[13px] text-slate-600">{formatDashboardNumber(product.addToCart)}</td>
                        <td className="px-4 py-3 text-[13px] text-slate-600">{formatDashboardNumber(product.removals)}</td>
                        <td className="px-4 py-3 text-[13px] text-slate-600">{formatDashboardNumber(product.purchases)}</td>
                        <td className="px-4 py-3 text-[13px] text-slate-600">{formatDashboardNumber(product.unitsSold)}</td>
                        <td className="px-4 py-3 text-[13px] text-slate-600">{getRateLabel(product.viewToCartRate)}</td>
                        <td className="px-4 py-3 text-[13px] text-slate-600">{getRateLabel(product.cartToPurchaseRate)}</td>
                        <td className="px-4 py-3 text-[13px] text-slate-600">{formatDashboardNumber(product.abandonedCarts)}</td>
                        <td className="px-4 py-3 text-[13px] font-semibold text-slate-950">{formatDashboardPrice(product.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile */}
            <div className="grid gap-3 md:hidden">
              {data.products.map((product) => (
                <article key={product.productId} className="rounded-[10px] border border-[#e8e5e1] bg-white px-4 py-4">
                  <ProductCell product={product} />
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {[
                      ["Vistas", formatDashboardNumber(product.views)],
                      ["Al carrito", formatDashboardNumber(product.addToCart)],
                      ["Compras", formatDashboardNumber(product.purchases)],
                      ["Unidades", formatDashboardNumber(product.unitsSold)],
                      ["View → Cart", getRateLabel(product.viewToCartRate)],
                      ["Cart → Compra", getRateLabel(product.cartToPurchaseRate)],
                      ["Abandonos", formatDashboardNumber(product.abandonedCarts)],
                      ["Revenue", formatDashboardPrice(product.revenue)],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-[8px] border border-slate-100 bg-slate-50 px-3 py-2">
                        <p className="text-[10px] font-semibold text-slate-400">{label}</p>
                        <p className="mt-0.5 text-[12px] font-semibold text-slate-900">{value}</p>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>

            {data.pageCount > 1 ? (
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <p className="text-[12px] text-slate-400">
                  Mostrando {formatDashboardNumber((data.page - 1) * data.pageSize + 1)}–{formatDashboardNumber(Math.min(data.page * data.pageSize, data.totals.products))} de {formatDashboardNumber(data.totals.products)}
                </p>
                <div className="flex flex-wrap items-center gap-1.5">
                  <PaginationLink href={buildHref(data.filters, { page: Math.max(1, data.page - 1) })} disabled={data.page <= 1}>Anterior</PaginationLink>
                  {getVisiblePages(data.page, data.pageCount).map((page) => (
                    <PaginationLink key={page} href={buildHref(data.filters, { page })} active={page === data.page}>{page}</PaginationLink>
                  ))}
                  <PaginationLink href={buildHref(data.filters, { page: Math.min(data.pageCount, data.page + 1) })} disabled={data.page >= data.pageCount}>Siguiente</PaginationLink>
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <EmptyState title="Sin actividad para este período." description="No se registraron productos con actividad en el filtro actual." />
        )}
      </ChartCard>
    </DashboardSubpageShell>
  );
}
