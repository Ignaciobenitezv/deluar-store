import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ChartCard } from "@/features/admin/dashboard/components/chart-card";
import { DashboardShell } from "@/features/admin/dashboard/components/dashboard-shell";
import { EmptyState } from "@/features/admin/dashboard/components/empty-state";
import { KpiCard } from "@/features/admin/dashboard/components/kpi-card";
import { RankingCard } from "@/features/admin/dashboard/components/ranking-card";
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
  title: "Analisis de productos | Panel de comercio de DOTCOM",
};

type AdminDashboardProductsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getVisiblePages(page: number, pageCount: number) {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, pageCount, page - 1, page, page + 1]);
  return [...pages].filter((value) => value >= 1 && value <= pageCount).sort((left, right) => left - right);
}

function getRateLabel(rate: number | null) {
  return rate === null ? "" : formatDashboardPercent(rate * 100);
}

function getOpportunityLabel(tag: ProductOpportunityKey) {
  switch (tag) {
    case "many_views_low_cart":
      return "Muchas vistas y poco carrito";
    case "high_cart_low_purchase":
      return "Mucho carrito y poca compra";
    case "many_abandons":
      return "Muchos abandonos";
    case "good_conversion":
      return "Buena conversión";
    default:
      return tag;
  }
}

function getOpportunityTone(tag: ProductOpportunityKey) {
  switch (tag) {
    case "many_views_low_cart":
      return "warning";
    case "high_cart_low_purchase":
      return "accent";
    case "many_abandons":
      return "danger";
    case "good_conversion":
      return "success";
    default:
      return "neutral";
  }
}

function getOpportunityBadgeClass(tag: ProductOpportunityKey) {
  switch (tag) {
    case "many_views_low_cart":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "high_cart_low_purchase":
      return "border-sky-200 bg-sky-50 text-sky-900";
    case "many_abandons":
      return "border-rose-200 bg-rose-50 text-rose-900";
    case "good_conversion":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    default:
      return "border-slate-200 bg-white text-slate-700";
  }
}

function buildProductsHref(current: ProductAnalyticsFilters, overrides: Partial<ProductAnalyticsFilters> = {}) {
  const next = { ...current, ...overrides };
  const params = new URLSearchParams();

  params.set("period", next.period);

  if (next.sort !== "revenue") {
    params.set("sort", next.sort);
  }

  if (next.page > 1) {
    params.set("page", String(next.page));
  }

  if (next.pageSize !== 25) {
    params.set("pageSize", String(next.pageSize));
  }

  const query = params.toString();
  return query ? `/admin/dashboard/productos?${query}` : "/admin/dashboard/productos";
}

function ProductOpportunityBadges({ tags }: { tags: ProductOpportunityKey[] }) {
  if (tags.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <span
          key={tag}
          className={cn(
            "inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]",
            getOpportunityBadgeClass(tag),
          )}
        >
          {getOpportunityLabel(tag)}
        </span>
      ))}
    </div>
  );
}

function ProductVariantDetails({ product }: { product: ProductAnalyticsRow }) {
  if (product.variants.length === 0) {
    return null;
  }

  const visibleVariants = product.variants.slice(0, 3);

  return (
    <details className="mt-3 rounded-[16px] border border-dashed border-slate-200/70 bg-slate-50 px-3 py-2.5">
      <summary className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        Variantes ({product.variants.length})
      </summary>
      <div className="mt-3 space-y-2">
        {visibleVariants.map((variant) => (
          <div key={`${product.productId}:${variant.variantId ?? "default"}`} className="rounded-[14px] border border-slate-200/60 bg-white px-3 py-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">{variant.variantLabel}</p>
                {variant.sku ? <p className="mt-0.5 text-xs text-slate-500">{variant.sku}</p> : null}
              </div>
              <div className="shrink-0 text-right text-[11px] leading-5 text-slate-500">
                <p>{formatDashboardNumber(variant.views)} vistas</p>
                <p>{formatDashboardNumber(variant.addToCart)} al carrito</p>
                <p>{formatDashboardNumber(variant.unitsSold)} uds.</p>
                <p>{formatDashboardNumber(variant.purchases)} compras</p>
                <p>{formatDashboardNumber(variant.abandonedCarts)} abandonos</p>
              </div>
            </div>
          </div>
        ))}

        {product.variants.length > visibleVariants.length ? (
          <p className="px-1 text-xs text-slate-500">+{product.variants.length - visibleVariants.length} variantes mas</p>
        ) : null}
      </div>
    </details>
  );
}

function ProductCell({ product }: { product: ProductAnalyticsRow }) {
  const fallbackInitial = product.productName.trim().charAt(0).toUpperCase() || "P";

  return (
    <div className="min-w-0">
      <div className="flex items-start gap-3">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[14px] border border-slate-200/70 bg-slate-100">
          {product.imageUrl ? (
            <Image src={product.imageUrl} alt={product.productName} fill sizes="48px" className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-slate-500">
              {fallbackInitial}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-medium text-slate-900">{product.productName}</p>
            {product.opportunityTags.length > 0 ? (
              <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-900">
                Oportunidad
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-500">{product.productSlug}</p>
          <div className="mt-2">
            <ProductOpportunityBadges tags={product.opportunityTags} />
          </div>
          <ProductVariantDetails product={product} />
        </div>
      </div>
    </div>
  );
}

function MetricCell({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[14px] border border-slate-200/70 bg-white px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function ProductMobileCard({ product }: { product: ProductAnalyticsRow }) {
  return (
    <article className="rounded-[20px] border border-slate-200/70 bg-white px-4 py-4">
      <ProductCell product={product} />

      <div className="mt-4 grid grid-cols-2 gap-3">
        <MetricCell label="Vistas" value={formatDashboardNumber(product.views)} />
        <MetricCell label="Al carrito" value={formatDashboardNumber(product.addToCart)} />
        <MetricCell label="Removidos" value={formatDashboardNumber(product.removals)} />
        <MetricCell label="Compras" value={formatDashboardNumber(product.purchases)} />
        <MetricCell label="Unidades" value={formatDashboardNumber(product.unitsSold)} />
        <MetricCell label="View → Cart" value={getRateLabel(product.viewToCartRate)} />
        <MetricCell label="Cart → Compra" value={getRateLabel(product.cartToPurchaseRate)} />
        <MetricCell label="Abandonos" value={formatDashboardNumber(product.abandonedCarts)} />
        <MetricCell label="Revenue" value={formatDashboardPrice(product.revenue)} />
      </div>
    </article>
  );
}

function PaginationLink({
  href,
  children,
  active = false,
  disabled = false,
}: {
  href: string;
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
}) {
  const className = cn(
    "inline-flex h-9 min-w-9 items-center justify-center rounded-full border px-3 text-sm font-semibold transition",
    active
      ? "border-[#314158] bg-[#314158] text-white shadow-[0_10px_22px_rgba(49,65,88,0.16)]"
      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
    disabled ? "pointer-events-none opacity-40" : undefined,
  );

  if (disabled) {
    return <span className={className}>{children}</span>;
  }

  return (
    <Link href={href} className={className} aria-current={active ? "page" : undefined}>
      {children}
    </Link>
  );
}

export default async function AdminDashboardProductsPage({ searchParams }: AdminDashboardProductsPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const parsedPeriod = normalizeDashboardPeriodValue(
    Array.isArray(resolvedSearchParams.period) ? resolvedSearchParams.period[0] : resolvedSearchParams.period,
  );
  const query = normalizeProductAnalyticsQuery({
    ...resolvedSearchParams,
    period: parsedPeriod,
  });
  const data = await getProductAnalyticsPageData(query);
  const lastUpdated = formatDashboardDateTime(new Date());
  const summarySubtitle = `Vista completa de analytics de producto. Periodo activo: ${DASHBOARD_PERIODS[query.period].label}.`;

  return (
    <DashboardShell title="Productos" subtitle={summarySubtitle} lastUpdated={lastUpdated}>
      <section className="grid gap-3 min-[420px]:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-4 sm:gap-4">
        <KpiCard
          title="Vistas de producto"
          value={formatDashboardNumber(data.totals.views)}
          description="Cantidad de PRODUCT_VIEWED del periodo."
          tone="accent"
        />
        <KpiCard
          title="Add to carts"
          value={formatDashboardNumber(data.totals.addToCart)}
          description="Cantidad de ADD_TO_CART del periodo."
          tone="warning"
        />
        <KpiCard
          title="Unidades vendidas"
          value={formatDashboardNumber(data.totals.unitsSold)}
          description="SUM(quantity) sobre compras reales."
          tone="success"
        />
        <KpiCard
          title="Facturación"
          value={formatDashboardPrice(data.totals.revenue)}
          description="SUM(quantity × unitPrice) sobre órdenes pagadas."
          tone="neutral"
        />
      </section>

      <ChartCard
        title="Filtros y lectura"
        description="Reutiliza el selector de periodo y agrega orden, paginado y tamaño de página."
        className="min-w-0"
      >
        <div className="space-y-4">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
            <div className="rounded-[20px] border border-slate-200/70 bg-slate-50 p-3 sm:p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Orden</p>
                  <p className="mt-1 text-sm text-slate-500">Default: revenue desc. Si no hay revenue, cae a vistas desc.</p>
                </div>
                <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {formatDashboardNumber(data.totals.products)} productos con actividad
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-1 rounded-[16px] border border-slate-200 bg-slate-100 p-1 sm:grid-cols-3 xl:grid-cols-5">
                {PRODUCT_ANALYTICS_SORT_OPTIONS.map((option) => {
                  const active = data.sortKey === option.value;

                  return (
                    <Link
                      key={option.value}
                      href={buildProductsHref(data.filters, { sort: option.value as ProductAnalyticsSortKey, page: 1 })}
                      className={cn(
                        "rounded-[12px] px-2.5 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] transition sm:px-3 sm:text-[11px] sm:tracking-[0.18em]",
                        active
                          ? "bg-white text-slate-950 shadow-[0_8px_18px_rgba(15,23,42,0.08)]"
                          : "text-slate-500 hover:text-slate-900",
                      )}
                    >
                      {option.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[20px] border border-slate-200/70 bg-slate-50 p-3 sm:p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Tamaño de página</p>
              <div className="mt-3 grid grid-cols-3 gap-1 rounded-[16px] border border-slate-200 bg-slate-100 p-1">
                {PRODUCT_ANALYTICS_PAGE_SIZES.map((size) => {
                  const active = data.pageSize === size;

                  return (
                    <Link
                      key={size}
                      href={buildProductsHref(data.filters, { pageSize: size, page: 1 })}
                      className={cn(
                        "rounded-[12px] px-2.5 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] transition",
                        active
                          ? "bg-white text-slate-950 shadow-[0_8px_18px_rgba(15,23,42,0.08)]"
                          : "text-slate-500 hover:text-slate-900",
                      )}
                    >
                      {size}
                    </Link>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-slate-500">Los datos de comportamiento se registran desde la activación de Analytics.</p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-4">
            <div className="rounded-[16px] border border-slate-200/70 bg-white px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Periodo</p>
              <p className="mt-1 text-sm font-semibold text-slate-950">{DASHBOARD_PERIODS[query.period].label}</p>
            </div>
            <div className="rounded-[16px] border border-slate-200/70 bg-white px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Vistas → carrito</p>
              <p className="mt-1 text-sm font-semibold text-slate-950">{getRateLabel(data.totals.viewToCartRate)}</p>
            </div>
            <div className="rounded-[16px] border border-slate-200/70 bg-white px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Carrito → compra</p>
              <p className="mt-1 text-sm font-semibold text-slate-950">{getRateLabel(data.totals.cartToPurchaseRate)}</p>
            </div>
            <div className="rounded-[16px] border border-slate-200/70 bg-white px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Ultima actualizacion</p>
              <p className="mt-1 text-sm font-semibold text-slate-950">{lastUpdated}</p>
            </div>
          </div>
        </div>
      </ChartCard>

      <div className="grid gap-4 2xl:grid-cols-2">
        <ChartCard title="Top productos más vistos" description="Top 10 por PRODUCT_VIEWED del periodo." className="min-w-0">
          <ProductAnalyticsBarChart data={data.charts.topViewed} metricLabel="Vistas" color="#1d4ed8" />
        </ChartCard>

        <ChartCard title="Top productos más agregados al carrito" description="Top 10 por ADD_TO_CART del periodo." className="min-w-0">
          <ProductAnalyticsBarChart data={data.charts.topAdded} metricLabel="Add to cart" color="#0f766e" />
        </ChartCard>

        <ChartCard title="Top productos más vendidos" description="Top 10 por compras reales y unidades vendidas." className="min-w-0">
          <ProductAnalyticsBarChart data={data.charts.topSold} metricLabel="Compras" color="#2563eb" />
        </ChartCard>

        <ChartCard title="Top productos más abandonados" description="Top 10 por carritos con abandono." className="min-w-0">
          <ProductAnalyticsBarChart data={data.charts.topAbandoned} metricLabel="Abandonos" color="#e11d48" />
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <RankingCard
          title="Oportunidad A"
          description="Muchas vistas + poco add-to-cart. Regla: top 25% por vistas y por debajo de la mediana en view -> cart."
          items={data.opportunities.manyViewsLowCart.map((product) => ({
            id: product.productId,
            title: product.productName,
            subtitle: product.productSlug,
            value: product.views,
            secondaryValue: `View -> Cart ${getRateLabel(product.viewToCartRate)}`,
            tone: getOpportunityTone("many_views_low_cart"),
          }))}
          emptyState={<EmptyState title="Sin oportunidad A" description="No hay productos que cumplan la regla en este periodo." />}
        />

        <RankingCard
          title="Oportunidad B"
          description="Mucho add-to-cart + pocas compras. Regla: top 25% por add-to-cart y por debajo de la mediana en cart -> compra."
          items={data.opportunities.highCartLowPurchase.map((product) => ({
            id: product.productId,
            title: product.productName,
            subtitle: product.productSlug,
            value: product.addToCart,
            secondaryValue: `Cart -> Compra ${getRateLabel(product.cartToPurchaseRate)}`,
            tone: getOpportunityTone("high_cart_low_purchase"),
          }))}
          emptyState={<EmptyState title="Sin oportunidad B" description="No hay productos que cumplan la regla en este periodo." />}
        />

        <RankingCard
          title="Oportunidad C"
          description="Muchos abandonos. Regla: top 25% por abandonos y al menos 1 abandono."
          items={data.opportunities.manyAbandons.map((product) => ({
            id: product.productId,
            title: product.productName,
            subtitle: product.productSlug,
            value: product.abandonedCarts,
            secondaryValue: `${formatDashboardNumber(product.abandonedUnits)} unidades abandonadas`,
            tone: getOpportunityTone("many_abandons"),
          }))}
          emptyState={<EmptyState title="Sin oportunidad C" description="No hay productos con un nivel claro de abandono." />}
        />

        <RankingCard
          title="Oportunidad D"
          description="Buena conversión. Regla: top 25% por cart -> compra y al menos 1 compra."
          items={data.opportunities.goodConversion.map((product) => ({
            id: product.productId,
            title: product.productName,
            subtitle: product.productSlug,
            value: (product.cartToPurchaseRate ?? 0) * 100,
            secondaryValue: `${formatDashboardPrice(product.revenue)} facturados`,
            tone: getOpportunityTone("good_conversion"),
          }))}
          valueFormatter={formatDashboardPercent}
          emptyState={<EmptyState title="Sin oportunidad D" description="No hay productos con una conversión destacada." />}
        />
      </div>

      <ChartCard
        title="Tabla comparativa"
        description="Comparación server-side por producto. Orden actual: revenue, views, add-to-cart, compras o abandonos."
        className="min-w-0"
        emptyState={
          data.products.length === 0 ? (
            <EmptyState title="Sin actividad para este periodo." description="No se registraron productos con actividad en el filtro actual." />
          ) : undefined
        }
      >
        {data.products.length > 0 ? (
          <>
            <div className="hidden max-w-full overflow-hidden rounded-[20px] border border-slate-200/70 md:block">
              <div className="max-w-full overflow-x-auto">
                <table className="min-w-[1520px] w-full border-collapse text-sm">
                  <thead className="bg-slate-50 text-left">
                    <tr>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Producto</th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Vistas</th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Al carrito</th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Removidos</th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Compras</th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Unidades</th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">View → Cart</th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Cart → Compra</th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Abandonos</th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.products.map((product) => (
                      <tr key={product.productId} className="border-t border-slate-200/70 align-top">
                        <td className="px-4 py-4">
                          <ProductCell product={product} />
                        </td>
                        <td className="px-4 py-4 text-slate-700">{formatDashboardNumber(product.views)}</td>
                        <td className="px-4 py-4 text-slate-700">{formatDashboardNumber(product.addToCart)}</td>
                        <td className="px-4 py-4 text-slate-700">{formatDashboardNumber(product.removals)}</td>
                        <td className="px-4 py-4 text-slate-700">{formatDashboardNumber(product.purchases)}</td>
                        <td className="px-4 py-4 text-slate-700">{formatDashboardNumber(product.unitsSold)}</td>
                        <td className="px-4 py-4 text-slate-700">{getRateLabel(product.viewToCartRate)}</td>
                        <td className="px-4 py-4 text-slate-700">{getRateLabel(product.cartToPurchaseRate)}</td>
                        <td className="px-4 py-4 text-slate-700">{formatDashboardNumber(product.abandonedCarts)}</td>
                        <td className="px-4 py-4 font-semibold text-slate-950">{formatDashboardPrice(product.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid gap-3 md:hidden">
              {data.products.map((product) => (
                <ProductMobileCard key={product.productId} product={product} />
              ))}
            </div>

            {data.pageCount > 1 ? (
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-500">
                  Mostrando {formatDashboardNumber((data.page - 1) * data.pageSize + 1)}-
                  {formatDashboardNumber(Math.min(data.page * data.pageSize, data.totals.products))} de{" "}
                  {formatDashboardNumber(data.totals.products)}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <PaginationLink
                    href={buildProductsHref(data.filters, { page: Math.max(1, data.page - 1) })}
                    disabled={data.page <= 1}
                  >
                    Anterior
                  </PaginationLink>
                  {getVisiblePages(data.page, data.pageCount).map((page) => (
                    <PaginationLink
                      key={page}
                      href={buildProductsHref(data.filters, { page })}
                      active={page === data.page}
                    >
                      {page}
                    </PaginationLink>
                  ))}
                  <PaginationLink
                    href={buildProductsHref(data.filters, { page: Math.min(data.pageCount, data.page + 1) })}
                    disabled={data.page >= data.pageCount}
                  >
                    Siguiente
                  </PaginationLink>
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </ChartCard>
    </DashboardShell>
  );
}
