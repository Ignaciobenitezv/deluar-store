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
  title: "Productos | Administración de DOTCOM",
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
      <section className="grid gap-3 min-[420px]:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <KpiCard title="Total productos" value={formatDashboardNumber(data.summary.total)} tone="accent" />
        <KpiCard title="Visibles" value={formatDashboardNumber(data.summary.visible)} tone="success" />
        <KpiCard title="Sin stock" value={formatDashboardNumber(data.summary.outOfStock)} tone="warning" />
        <KpiCard title="En oferta" value={formatDashboardNumber(data.summary.onOffer)} tone="danger" />
      </section>

      <AdminProductsToolbar filters={data.filters} categoryTree={data.categories} filteredTotal={data.filteredTotal} />

      <section className="overflow-hidden rounded-[28px] border border-[#e8ddd0] bg-white shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
        <div className={cn(dashboardUi.cardHeader, "border-b border-[#e7e2d8] bg-[#f4f7fb]")}>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold tracking-[-0.02em] text-slate-900">Catálogo</h2>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 text-xs text-slate-500">
            <span className={dashboardUi.labelPill}>{formatDashboardNumber(data.filteredTotal)} encontrados</span>
            <span className={dashboardUi.labelPill}>
              Página {data.page} de {data.totalPages}
            </span>
            <span className={dashboardUi.labelPill}>{DEFAULT_ADMIN_PRODUCTS_PAGE_SIZE} por página</span>
            {activeFilters ? <span className={dashboardUi.labelPill}>Filtros activos</span> : null}
          </div>
        </div>

        {data.items.length > 0 ? (
          <>
            <div className="grid gap-3 px-4 py-4 sm:grid-cols-2 sm:px-5 lg:hidden">
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
          <div className="border-t border-slate-200/60 px-4 py-5 sm:px-5 sm:py-6">
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

        <div className="flex flex-col gap-3 border-t border-slate-200/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-xs text-slate-500">
            {data.filteredTotal > 0
              ? `Mostrando ${formatDashboardNumber((data.page - 1) * data.pageSize + 1)}-${formatDashboardNumber(
                  Math.min(data.page * data.pageSize, data.filteredTotal),
                )} de ${formatDashboardNumber(data.filteredTotal)} productos`
              : "Sin resultados para esta combinación de filtros."}
          </p>

          <div className="flex items-center gap-2">
            <Link
              href={buildAdminProductsHref(data.filters, { page: Math.max(1, data.page - 1) })}
              aria-disabled={isFirstPage}
              className={cn(
                "rounded-full border px-3 py-2 text-xs font-semibold transition",
                isFirstPage
                  ? "pointer-events-none border-slate-200 bg-slate-100 text-slate-400"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
              )}
            >
              Anterior
            </Link>
            <Link
              href={buildAdminProductsHref(data.filters, { page: Math.min(data.totalPages, data.page + 1) })}
              aria-disabled={isLastPage}
              className={cn(
                "rounded-full border px-3 py-2 text-xs font-semibold transition",
                isLastPage
                  ? "pointer-events-none border-slate-200 bg-slate-100 text-slate-400"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
              )}
            >
              Siguiente
            </Link>
          </div>
        </div>
      </section>
    </AdminProductsShell>
  );
}
