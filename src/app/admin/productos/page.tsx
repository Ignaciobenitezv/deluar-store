import Image from "next/image";
import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminSession } from "@/features/admin/auth";
import { EmptyState } from "@/features/admin/dashboard/components/empty-state";
import { KpiCard } from "@/features/admin/dashboard/components/kpi-card";
import { formatDashboardDateTime, formatDashboardNumber, formatDashboardPrice } from "@/features/admin/dashboard/lib/dashboard-formatters";
import { dashboardUi } from "@/features/admin/dashboard/lib/dashboard-ui";
import { buildAdminProductsHref, hasActiveAdminProductsFilters, parseAdminProductsFilters } from "@/features/admin/products/lib/product-filters";
import { AdminProductsShell } from "@/features/admin/products/components/admin-products-shell";
import { AdminProductQuickEditDialog } from "@/features/admin/products/components/admin-product-quick-edit-dialog";
import { AdminProductsToolbar } from "@/features/admin/products/components/admin-products-toolbar";
import { DEFAULT_ADMIN_PRODUCTS_PAGE_SIZE, getAdminProductsPageData } from "@/features/admin/products/server/admin-products-service";
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

function getStockToneClasses(tone: "neutral" | "success" | "warning" | "danger") {
  switch (tone) {
    case "success":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "danger":
      return "border-rose-200 bg-rose-50 text-rose-900";
    case "neutral":
    default:
      return "border-slate-200 bg-white text-slate-700";
  }
}

function splitStockLabel(label: string) {
  const [primary, ...rest] = label.split(" · ");

  return {
    primary: primary ?? label,
    secondary: rest.length > 0 ? rest.join(" · ") : null,
  };
}

function EyeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path strokeLinecap="round" strokeLinejoin="round" d="M1.75 10s2.75-5.5 8.25-5.5S18.25 10 18.25 10s-2.75 5.5-8.25 5.5S1.75 10 1.75 10Z" />
      <circle cx="10" cy="10" r="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

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
        <KpiCard
          title="Total productos"
          value={formatDashboardNumber(data.summary.total)}
          description="Conteo total de documentos publicados en Sanity."
          tone="accent"
        />
        <KpiCard
          title="Visibles"
          value={formatDashboardNumber(data.summary.visible)}
          description="Productos con isActive distinto de false."
          tone="success"
        />
        <KpiCard
          title="Sin stock"
          value={formatDashboardNumber(data.summary.outOfStock)}
          description="Productos con stock en cero o menor."
          tone="warning"
        />
        <KpiCard
          title="En oferta"
          value={formatDashboardNumber(data.summary.onOffer)}
          description="Productos marcados con isOnOffer."
          tone="danger"
        />
      </section>

      <AdminProductsToolbar filters={data.filters} categoryTree={data.categories} filteredTotal={data.filteredTotal} />

      <section className="overflow-hidden rounded-[28px] border border-[#e8ddd0] bg-white shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
        <div className={cn(dashboardUi.cardHeader, "border-b border-[#e7e2d8] bg-[#f4f7fb]")}>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold tracking-[-0.02em] text-slate-900">Catálogo</h2>
            <p className="mt-1 text-[13px] leading-5 text-slate-500 sm:text-sm sm:leading-6">
              Vista read-only de productos con navegación.
            </p>
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
                <article key={item.id} className="rounded-[24px] border border-slate-200/70 bg-white p-4 shadow-[0_8px_18px_rgba(15,23,42,0.028)]">
                  <div className="flex items-start gap-3">
                    <div className="relative h-[4rem] w-[3.5rem] shrink-0 overflow-hidden rounded-[18px] border border-[#e1d7ca] bg-slate-100">
                      {item.imageUrl ? (
                        <Image src={item.imageUrl} alt={item.imageAlt} fill sizes="56px" className="object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-200 to-slate-100 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Sin imagen
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <Link href={`/admin/productos/${item.id}`} className="block text-sm font-semibold leading-5 text-slate-900 transition hover:underline">
                        {item.title}
                      </Link>
                      <p className="mt-1 text-xs text-slate-500">/{item.slug}</p>
                      {item.shortDescription ? (
                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
                          {item.shortDescription}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-[18px] border border-[#e7ddd0] bg-[#fbf8f2] px-3 py-2.5">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Categoría</p>
                      <p className="mt-1 font-medium text-slate-900">{item.categoryLabel}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.subcategoryLabel || "Sin subcategoría"}</p>
                    </div>

                    <div className="rounded-[18px] border border-[#e7ddd0] bg-[#fbf8f2] px-3 py-2.5">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Precio</p>
                      <p className="mt-1 font-medium text-slate-900">{formatDashboardPrice(item.basePrice)}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {typeof item.transferPrice === "number"
                          ? `Transferencia: ${formatDashboardPrice(item.transferPrice)}`
                          : "Sin precio por transferencia"}
                      </p>
                    </div>

                    <div className="rounded-[18px] border border-[#e7ddd0] bg-[#fbf8f2] px-3 py-2.5">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Stock</p>
                      {(() => {
                        const stockParts = splitStockLabel(item.stockLabel);

                        return (
                      <div
                        className={cn(
                          "mt-1 inline-flex w-full max-w-[10rem] flex-col items-start gap-0.5 rounded-[16px] border px-3 py-2.5 text-left text-sm font-medium",
                          getStockToneClasses(item.stockTone),
                        )}
                      >
                        <span className="text-[0.95rem] leading-5">{stockParts.primary}</span>
                        {stockParts.secondary ? (
                          <span className="text-[11px] font-normal leading-4 opacity-75">{stockParts.secondary}</span>
                        ) : null}
                        {item.stockHint ? <span className="text-[11px] font-normal leading-4 opacity-75">{item.stockHint}</span> : null}
                      </div>
                        );
                      })()}
                    </div>

                    <div className="rounded-[18px] border border-[#e7ddd0] bg-[#fbf8f2] px-3 py-2.5">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Estado</p>
                      <div className="mt-1 flex flex-wrap justify-center gap-2">
                        <span
                          className={cn(
                            "inline-flex items-center justify-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
                            item.visible
                              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                              : "border-slate-200 bg-slate-100 text-slate-600",
                          )}
                        >
                          {item.visible ? "Visible" : "Oculto"}
                        </span>

                        {item.isOnOffer ? (
                          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-900">
                            En oferta
                          </span>
                        ) : null}

                        {item.showInNewIn ? (
                          <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-900">
                            Lo nuevo
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="rounded-[18px] border border-[#e7ddd0] bg-[#fbf8f2] px-3 py-2.5">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Variantes</p>
                      <p className="mt-1 font-medium text-slate-900">{item.variantLabel}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {item.hasVariants
                          ? item.variantSource === "colorVariants"
                            ? "Modelo legacy normalizado"
                            : "Variantes activas"
                          : "Modelo simple"}
                      </p>
                    </div>

                    <div className="rounded-[18px] border border-[#e7ddd0] bg-[#fbf8f2] px-3 py-2.5">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Actualizado</p>
                      <p className="mt-1 font-medium text-slate-900">{formatDashboardDateTime(new Date(item.updatedAt))}</p>
                      {typeof item.newInOrder === "number" ? (
                        <p className="mt-1 text-xs text-slate-500">Prioridad Lo nuevo: {item.newInOrder}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                      <Link
                        href={`/admin/productos/${item.id}`}
                        className={cn(
                          "inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full border px-3 py-2 text-xs font-semibold",
                          dashboardUi.softAction,
                        )}
                      >
                      <EyeIcon />
                      Abrir
                    </Link>
                    <div className="flex-1">
                      <AdminProductQuickEditDialog product={item} />
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-[1560px] w-full table-fixed border-collapse text-sm">
                <thead className="bg-[#f4f7fb] text-left">
                  <tr>
                    <th className="w-[32%] px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5f6c80]">Producto</th>
                    <th className="w-[13%] px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5f6c80]">Categoría</th>
                    <th className="w-[12%] px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5f6c80]">Precio</th>
                    <th className="w-[11%] px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5f6c80]">Stock</th>
                    <th className="w-[10%] px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5f6c80]">Estado</th>
                    <th className="w-[10%] px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5f6c80]">Variantes</th>
                    <th className="w-[11%] px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5f6c80]">Actualizado</th>
                    <th className="w-[15.5rem] px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5f6c80]">Acción</th>
                  </tr>
                </thead>

                <tbody>
                  {data.items.map((item) => (
                    <tr key={item.id} className="border-t border-[#ebe3d8] align-top transition hover:bg-[#fbfcfe]">
                      <td className="px-5 py-6">
                        <div className="flex items-start gap-4">
                          <div className="relative h-[4rem] w-[3.5rem] shrink-0 overflow-hidden rounded-[18px] border border-[#e1d7ca] bg-slate-100">
                            {item.imageUrl ? (
                              <Image src={item.imageUrl} alt={item.imageAlt} fill sizes="56px" className="object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-200 to-slate-100 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                Sin imagen
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <Link href={`/admin/productos/${item.id}`} className="block max-w-[28rem] text-[15px] font-semibold leading-6 text-slate-950 transition hover:underline">
                              {item.title}
                            </Link>
                            <p className="mt-1 text-xs text-slate-500">/{item.slug}</p>
                            {item.shortDescription ? (
                              <p className="mt-2 line-clamp-2 max-w-[30rem] text-xs leading-5 text-slate-500">
                                {item.shortDescription}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-6 align-top">
                        <p className="font-medium text-slate-900">{item.categoryLabel}</p>
                        <p className="mt-1 text-xs text-slate-500">{item.subcategoryLabel || "Sin subcategoría"}</p>
                      </td>

                      <td className="px-5 py-6 align-top">
                        <p className="font-semibold text-slate-950">{formatDashboardPrice(item.basePrice)}</p>
                        {typeof item.transferPrice === "number" ? (
                          <p className="mt-1 text-xs text-slate-500">
                            Transferencia: {formatDashboardPrice(item.transferPrice)}
                          </p>
                        ) : (
                          <p className="mt-1 text-xs text-slate-500">Sin precio por transferencia</p>
                        )}
                      </td>

                      <td className="px-5 py-6 align-top">
                        <div
                          className={cn(
                            "inline-flex w-full max-w-[9.75rem] flex-col items-start gap-0.5 rounded-[18px] border px-3.5 py-3 text-left text-sm font-medium",
                            getStockToneClasses(item.stockTone),
                          )}
                        >
                          {(() => {
                            const stockParts = splitStockLabel(item.stockLabel);

                            return (
                              <>
                                <span className="text-[0.95rem] leading-5">{stockParts.primary}</span>
                                {stockParts.secondary ? (
                                  <span className="text-[11px] font-normal leading-4 opacity-75">{stockParts.secondary}</span>
                                ) : null}
                                {item.stockHint ? (
                                  <span className="text-[11px] font-normal leading-4 opacity-75">{item.stockHint}</span>
                                ) : null}
                              </>
                            );
                          })()}
                        </div>
                      </td>

                      <td className="px-5 py-6 align-middle">
                        <div className="flex flex-wrap justify-center gap-2">
                          <span
                            className={cn(
                              "inline-flex items-center justify-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
                              item.visible
                                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                                : "border-slate-200 bg-slate-100 text-slate-600",
                            )}
                          >
                            {item.visible ? "Visible" : "Oculto"}
                          </span>

                          {item.isOnOffer ? (
                            <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-900">
                              En oferta
                            </span>
                          ) : null}

                          {item.showInNewIn ? (
                            <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-900">
                              Lo nuevo
                            </span>
                          ) : null}
                        </div>
                      </td>

                      <td className="px-5 py-6 align-top">
                        <p className="font-medium text-slate-900">{item.variantLabel}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.hasVariants
                            ? item.variantSource === "colorVariants"
                              ? "Modelo legacy normalizado"
                              : "Variantes activas"
                            : "Modelo simple"}
                        </p>
                      </td>

                      <td className="px-5 py-6 align-top">
                        <p className="max-w-[9rem] whitespace-normal font-medium leading-5 text-slate-900">
                          {formatDashboardDateTime(new Date(item.updatedAt))}
                        </p>
                        {typeof item.newInOrder === "number" ? (
                          <p className="mt-1 text-xs text-slate-500">Prioridad Lo nuevo: {item.newInOrder}</p>
                        ) : null}
                      </td>

                      <td className="px-5 py-6 align-middle">
                        <div className="flex min-w-[12rem] flex-col gap-2">
                          <Link
                            href={`/admin/productos/${item.id}`}
                            className={cn(
                              "inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-full border px-4 py-2.5 text-xs font-semibold",
                              dashboardUi.softAction,
                            )}
                          >
                            <EyeIcon />
                            Abrir
                          </Link>
                          <AdminProductQuickEditDialog product={item} />
                        </div>
                      </td>
                    </tr>
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
