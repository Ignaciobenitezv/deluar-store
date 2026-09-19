import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminSession } from "@/features/admin/auth";
import { EmptyState } from "@/features/admin/dashboard/components/empty-state";
import { KpiCard } from "@/features/admin/dashboard/components/kpi-card";
import { formatDashboardDateTime, formatDashboardNumber } from "@/features/admin/dashboard/lib/dashboard-formatters";
import { dashboardUi } from "@/features/admin/dashboard/lib/dashboard-ui";
import { AdminPagination } from "@/features/admin/components/admin-pagination";
import { AdminProductRowView } from "@/features/admin/products/components/admin-product-row-view";
import { AdminProductsShell } from "@/features/admin/products/components/admin-products-shell";
import { AdminProductsToolbar } from "@/features/admin/products/components/admin-products-toolbar";
import { DEFAULT_ADMIN_PRODUCTS_PAGE_SIZE, getAdminProductsPageData } from "@/features/admin/products/server/admin-products-service";
import { buildAdminProductsHref, hasActiveAdminProductsFilters, parseAdminProductsFilters } from "@/features/admin/products/lib/product-filters";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Productos | Administración de DELUAR",
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

  // One conceptual action (→ /admin/productos/nuevo), rendered once per
  // breakpoint: full-width beside the "Productos" heading on mobile (below),
  // top-right beside the module nav on desktop (via `primaryAction` — see
  // AdminProductsShell, which hides that slot below `sm`).
  const createProductAction = (
    <Link
      href="/admin/productos/nuevo"
      className={cn(
        "inline-flex w-full items-center justify-center gap-1.5 rounded-full border px-4 py-2.5 text-sm font-semibold sm:w-auto sm:py-2",
        dashboardUi.primaryAction,
      )}
    >
      <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
        <path d="M10 4.5v11M4.5 10h11" />
      </svg>
      Crear producto
    </Link>
  );

  return (
    <AdminProductsShell lastUpdated={lastUpdated} primaryAction={createProductAction}>
      <div className="grid gap-1">
        <h1 className="text-[1.25rem] font-semibold tracking-[-0.015em] text-text-primary sm:text-[1.5rem]">
          Productos
        </h1>
        <p className="text-[12.5px] text-text-secondary">Listado operativo del catálogo.</p>
      </div>

      <div className="sm:hidden">{createProductAction}</div>

      <section className="grid grid-cols-2 gap-1.5 sm:gap-3 xl:grid-cols-4">
        <KpiCard title="Total productos" value={formatDashboardNumber(data.summary.total)} tone="accent" />
        <KpiCard title="Visibles en tienda" value={formatDashboardNumber(data.summary.visible)} tone="success" />
        <KpiCard title="Sin stock" value={formatDashboardNumber(data.summary.outOfStock)} tone="warning" />
        <KpiCard title="En oferta" value={formatDashboardNumber(data.summary.onOffer)} tone="danger" />
      </section>

      <AdminProductsToolbar filters={data.filters} categoryTree={data.categories} />

      <section className="mt-3 border-t border-border pt-3 lg:mt-0 lg:overflow-hidden lg:rounded-2xl lg:border lg:border-border lg:bg-surface lg:pt-0">
        <div className={cn("border-b border-border px-1.5 pb-3 pt-0 sm:px-2 sm:pb-3 sm:pt-1.5 lg:bg-surface-elevated lg:px-4 lg:py-3.5", dashboardUi.cardHeader)}>
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary lg:text-[13px] lg:normal-case lg:tracking-[-0.01em] lg:text-text-primary">
              Catálogo
            </h2>
            <p className="text-[11px] text-text-secondary lg:hidden">
              {formatDashboardNumber(data.filteredTotal)} productos
            </p>
          </div>

          <div className="hidden flex-wrap items-center gap-2 text-[11px] text-text-secondary lg:justify-end lg:flex">
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
            <div className="divide-y divide-border px-1.5 pt-3 sm:grid sm:grid-cols-2 sm:gap-3 sm:divide-y-0 sm:px-2 lg:hidden">
              {data.items.map((item) => (
                <AdminProductRowView key={item.id} product={item} variant="mobile" />
              ))}
            </div>

            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-[1560px] w-full table-fixed border-collapse text-sm">
                <thead className="bg-surface-elevated text-left">
                  <tr>
                    <th className="w-[30.5%] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Producto</th>
                    <th className="w-[12%] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Categoría</th>
                    <th className="w-[11%] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Precio</th>
                    <th className="w-[13.5%] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Stock</th>
                    <th className="w-[11%] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Estado</th>
                    <th className="w-[9.5%] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Variantes</th>
                    <th className="w-[10.5%] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Actualizado</th>
                    <th className="w-[15.5rem] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Acción</th>
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
                  className="inline-flex rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-text-primary transition-colors duration-150 hover:bg-surface-elevated"
                >
                  Limpiar filtros
                </Link>
              }
            />
          </div>
        )}

        <div className="mt-3 flex flex-col gap-2 border-t border-border px-1.5 pt-3 pb-3 sm:mt-0 sm:flex-row sm:items-center sm:justify-between sm:border-t-0 sm:px-2 lg:px-4">
          <p className="min-w-0 whitespace-nowrap text-center text-[11px] leading-4 text-text-secondary sm:text-left">
            {data.filteredTotal > 0
              ? `${formatDashboardNumber((data.page - 1) * data.pageSize + 1)}-${formatDashboardNumber(
                  Math.min(data.page * data.pageSize, data.filteredTotal),
                )} de ${formatDashboardNumber(data.filteredTotal)} | Página ${data.page} de ${data.totalPages}`
              : "Sin resultados para esta combinación de filtros."}
          </p>

          <AdminPagination
            page={data.page}
            totalPages={data.totalPages}
            buildHref={(page) => buildAdminProductsHref(data.filters, { page })}
            className="justify-center sm:justify-end"
          />
        </div>
      </section>
    </AdminProductsShell>
  );
}
