import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminSession } from "@/features/admin/auth";
import { EmptyState } from "@/features/admin/dashboard/components/empty-state";
import { KpiCard } from "@/features/admin/dashboard/components/kpi-card";
import { formatDashboardDateTime, formatDashboardNumber } from "@/features/admin/dashboard/lib/dashboard-formatters";
import { dashboardUi } from "@/features/admin/dashboard/lib/dashboard-ui";
import { AdminProductRowView } from "@/features/admin/products/components/admin-product-row-view";
import { AdminProductsShell } from "@/features/admin/products/components/admin-products-shell";
import { AdminProductsToolbar } from "@/features/admin/products/components/admin-products-toolbar";
import { DEFAULT_ADMIN_PRODUCTS_PAGE_SIZE, getAdminProductsPageData } from "@/features/admin/products/server/admin-products-service";
import { buildAdminProductsHref, hasActiveAdminProductsFilters, parseAdminProductsFilters } from "@/features/admin/products/lib/product-filters";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Productos | AdministraciÃ³n de DOTCOM",
};

type AdminProductsPageProps = {
  searchParams?: Promise<{
    q?: string;
    status?: string;
    stock?: string;
    offer?: string;
    newIn?: string;
    variants?: string;
    image?: string;
    category?: string;
    subcategory?: string;
    page?: string;
  }>;
};

export default async function AdminProductsPage({ searchParams }: AdminProductsPageProps) {
  await requireAdminSession();

  const resolvedSearchParams = await searchParams;
  const filters = parseAdminProductsFilters({
    q: resolvedSearchParams?.q,
    status: resolvedSearchParams?.status,
    stock: resolvedSearchParams?.stock,
    offer: resolvedSearchParams?.offer,
    newIn: resolvedSearchParams?.newIn,
    variants: resolvedSearchParams?.variants,
    image: resolvedSearchParams?.image,
    category: resolvedSearchParams?.category,
    subcategory: resolvedSearchParams?.subcategory,
    page: resolvedSearchParams?.page,
  });
  const data = await getAdminProductsPageData(filters);
  const lastUpdated = formatDashboardDateTime(new Date());
  const activeFilters = hasActiveAdminProductsFilters(data.filters);
  const isFirstPage = data.page <= 1;
  const isLastPage = data.page >= data.totalPages;

  return (
    <AdminProductsShell lastUpdated={lastUpdated}>
      <section className="grid grid-cols-2 gap-1.5 sm:gap-3 xl:grid-cols-4">
        <KpiCard title="Total productos" value={formatDashboardNumber(data.summary.total)} tone="accent" />
        <KpiCard title="Visibles" value={formatDashboardNumber(data.summary.visible)} tone="success" />
        <KpiCard title="Sin stock" value={formatDashboardNumber(data.summary.outOfStock)} tone="warning" />
        <KpiCard title="En oferta" value={formatDashboardNumber(data.summary.onOffer)} tone="danger" />
      </section>

      <AdminProductsToolbar filters={data.filters} categoryTree={data.categories} />

      <section className="mt-3 border-t border-slate-200/70 pt-3 bg-transparent lg:mt-0 lg:overflow-hidden lg:rounded-[28px] lg:border lg:border-[#e8ddd0] lg:bg-white lg:pt-0 lg:shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
        <div
          className={cn(
            "border-b border-slate-200/70 px-1.5 pb-3 pt-0 sm:px-2 sm:pb-3 sm:pt-1.5 lg:border-b lg:border-[#e7e2d8] lg:bg-[#f4f7fb] lg:px-4 lg:py-4",
            dashboardUi.cardHeader,
          )}
        >
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 lg:text-sm lg:normal-case lg:tracking-[-0.02em] lg:text-slate-900">
              Catálogo
            </h2>
            <p className="text-[11px] text-slate-500 lg:hidden">
              {formatDashboardNumber(data.filteredTotal)} productos
            </p>
          </div>

          <div className="hidden flex-wrap items-center gap-2 text-[11px] text-slate-500 lg:justify-end lg:flex">
            <span className={dashboardUi.labelPill}>{formatDashboardNumber(data.filteredTotal)} encontrados</span>
            <span className={dashboardUi.labelPill}>
              Página {data.page} de {data.totalPages}
            </span>
            <span className={`${dashboardUi.labelPill} hidden sm:inline-flex`}>{DEFAULT_ADMIN_PRODUCTS_PAGE_SIZE} por página</span>
            {activeFilters ? <span className={dashboardUi.labelPill}>Filtros activos</span> : null}
          </div>
        </div>

        {data.items.length > 0 ? (
          <>
            <div className="divide-y divide-slate-200/80 px-1.5 pt-3 sm:grid sm:grid-cols-2 sm:gap-3 sm:divide-y-0 sm:px-2 lg:hidden">
              {data.items.map((item) => (
                <AdminProductRowView key={item.id} product={item} variant="mobile" />
              ))}
            </div>

            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-[1560px] w-full table-fixed border-collapse text-sm">
                <thead className="bg-[#f4f7fb] text-left">
                  <tr>
                    <th className="w-[30.5%] px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5f6c80]">Producto</th>
                    <th className="w-[12%] px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5f6c80]">Categoría</th>
                    <th className="w-[11%] px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5f6c80]">Precio</th>
                    <th className="w-[13.5%] px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5f6c80]">Stock</th>
                    <th className="w-[11%] px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5f6c80]">Estado</th>
                    <th className="w-[9.5%] px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5f6c80]">Variantes</th>
                    <th className="w-[10.5%] px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5f6c80]">Actualizado</th>
                    <th className="w-[15.5rem] px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5f6c80]">Acción</th>
                  </tr>
                </thead>

                <tbody>
                  {data.items.map((item) => (
                    <AdminProductRowView key={item.id} product={item} variant="desktop" />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="px-1.5 py-4 sm:px-2 sm:py-5 lg:px-4 lg:py-5">
            <EmptyState
              title="No encontramos productos con estos filtros."
              description="Probá limpiando la búsqueda o ajustando los filtros activos."
              action={
                <Link
                  href="/admin/productos"
                  className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Limpiar filtros
                </Link>
              }
            />
          </div>
        )}

        <div className="mt-3 border-t border-slate-200/70 px-1.5 pt-3 pb-3 sm:mt-0 sm:border-t-0 sm:px-2 lg:px-4">
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 sm:flex sm:items-center sm:justify-between sm:gap-3">
            <Link
              href={buildAdminProductsHref(data.filters, { page: Math.max(1, data.page - 1) })}
              aria-disabled={isFirstPage}
              className={cn(
                "inline-flex h-9 items-center justify-center rounded-lg border px-2.5 text-xs font-semibold transition sm:rounded-full sm:px-3",
                isFirstPage
                  ? "pointer-events-none border-slate-200 bg-slate-100 text-slate-400"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
              )}
            >
              Anterior
            </Link>

                        <p className="min-w-0 whitespace-nowrap text-center text-[11px] leading-4 text-slate-500 sm:flex-1 sm:px-3">
              {data.filteredTotal > 0
                ? `${formatDashboardNumber((data.page - 1) * data.pageSize + 1)}-${formatDashboardNumber(
                    Math.min(data.page * data.pageSize, data.filteredTotal),
                  )} de ${formatDashboardNumber(data.filteredTotal)} | Página ${data.page} de ${data.totalPages}`
                : "Sin resultados para esta combinación de filtros."}
            </p>

            <Link
              href={buildAdminProductsHref(data.filters, { page: Math.min(data.totalPages, data.page + 1) })}
              aria-disabled={isLastPage}
              className={cn(
                "inline-flex h-9 items-center justify-center rounded-lg border px-2.5 text-xs font-semibold transition sm:rounded-full sm:px-3",
                isLastPage
                  ? "pointer-events-none border-slate-200 bg-slate-100 text-slate-400"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
              )}
            >
              Siguiente
            </Link>
          </div>
        </div>      </section>
    </AdminProductsShell>
  );
}
