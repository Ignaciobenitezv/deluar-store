import type { Metadata } from "next";
import { requireAdminSession } from "@/features/admin/auth";
import { EmptyState } from "@/features/admin/dashboard/components/empty-state";
import { formatDashboardNumber } from "@/features/admin/dashboard/lib/dashboard-formatters";
import { dashboardUi } from "@/features/admin/dashboard/lib/dashboard-ui";
import { AdminProductsShell } from "@/features/admin/products/components/admin-products-shell";
import { AdminPagination } from "@/features/admin/components/admin-pagination";
import { AdminInventoryToolbar } from "@/features/admin/inventory/components/admin-inventory-toolbar";
import { AdminInventoryRow } from "@/features/admin/inventory/components/admin-inventory-row";
import { AdminInventoryPendingBar } from "@/features/admin/inventory/components/admin-inventory-pending-bar";
import { AdminInventoryLeaveGuard } from "@/features/admin/inventory/components/admin-inventory-leave-guard";
import { getAdminInventoryPageData } from "@/features/admin/inventory/server/admin-inventory-service";
import { buildAdminInventoryHref, hasActiveAdminInventoryFilters, parseAdminInventoryFilters } from "@/features/admin/inventory/lib/inventory-filters";
import { cn } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Inventario | Administración de DELUAR",
};

type AdminInventoryPageProps = {
  searchParams?: Promise<{
    q?: string;
    category?: string;
    subcategory?: string;
    stock?: string;
    page?: string;
  }>;
};

export default async function AdminInventoryPage({ searchParams }: AdminInventoryPageProps) {
  await requireAdminSession();

  const resolvedSearchParams = await searchParams;
  const filters = parseAdminInventoryFilters({
    q: resolvedSearchParams?.q,
    category: resolvedSearchParams?.category,
    subcategory: resolvedSearchParams?.subcategory,
    stock: resolvedSearchParams?.stock,
    page: resolvedSearchParams?.page,
  });

  const data = await getAdminInventoryPageData(filters);
  const activeFilters = hasActiveAdminInventoryFilters(data.filters);

  return (
    <AdminProductsShell>
      <div className="grid gap-1">
        <h1 className="text-[1.25rem] font-semibold tracking-[-0.015em] text-text-primary sm:text-[1.5rem]">
          Inventario
        </h1>
        <p className="text-[12.5px] text-text-secondary">
          Ajustá stock rápido, para varios productos a la vez, sin entrar a cada uno.
        </p>
      </div>

      <AdminInventoryToolbar filters={data.filters} categoryTree={data.categories} />

      <section className="mt-3 border-t border-border pt-3 lg:mt-0 lg:overflow-hidden lg:rounded-2xl lg:border lg:border-border lg:bg-surface lg:pt-0">
        <div className={cn("border-b border-border px-1.5 pb-3 pt-0 sm:px-2 sm:pb-3 sm:pt-1.5 lg:bg-surface-elevated lg:px-4 lg:py-3.5", dashboardUi.cardHeader)}>
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary lg:text-[13px] lg:normal-case lg:tracking-[-0.01em] lg:text-text-primary">
              Stock
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
            {activeFilters ? <span className={dashboardUi.labelPill}>Filtros activos</span> : null}
          </div>
        </div>

        {data.items.length > 0 ? (
          <>
            <div className="divide-y divide-border px-1.5 pt-1 sm:px-2 lg:hidden">
              {data.items.map((item) => (
                <AdminInventoryRow key={item.id} item={item} variant="mobile" />
              ))}
            </div>

            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-[760px] w-full table-fixed border-collapse text-sm">
                <thead className="bg-surface-elevated text-left">
                  <tr>
                    <th className="w-[36%] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Producto</th>
                    <th className="w-[19%] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Categoría</th>
                    <th className="w-[13%] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Precio</th>
                    <th className="w-[32%] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item) => (
                    <AdminInventoryRow key={item.id} item={item} variant="desktop" />
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
                  href="/admin/productos/inventario"
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
              ? `${formatDashboardNumber(data.filteredTotal)} productos | Página ${data.page} de ${data.totalPages}`
              : "Sin resultados para esta combinación de filtros."}
          </p>

          <AdminPagination
            page={data.page}
            totalPages={data.totalPages}
            buildHref={(page) => buildAdminInventoryHref(data.filters, { page })}
            className="justify-center sm:justify-end"
          />
        </div>
      </section>

      <AdminInventoryPendingBar />
      <AdminInventoryLeaveGuard />
    </AdminProductsShell>
  );
}
