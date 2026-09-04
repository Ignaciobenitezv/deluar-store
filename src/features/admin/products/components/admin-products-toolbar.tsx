"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminProductCategoryNode, AdminProductsFilters } from "../types";
import {
  buildAdminProductsHref,
  extractSubcategories,
  getAdminProductsActiveFilterCount,
  hasActiveAdminProductsFilters,
  type AdminProductsCategoryNode,
} from "../lib/product-filters";
import { dashboardUi } from "@/features/admin/dashboard/lib/dashboard-ui";
import { cn } from "@/lib/utils";

type AdminProductsToolbarProps = {
  filters: AdminProductsFilters;
  categoryTree: AdminProductsCategoryNode[];
};

function flattenCategorySubtrees(
  nodes: AdminProductCategoryNode[],
  depth = 0,
): { id: string; label: string; slug: string }[] {
  return nodes.flatMap((node) => [
    {
      id: node._id,
      label: `${"- ".repeat(depth)}${node.title}`,
      slug: node.slug.current,
    },
    ...flattenCategorySubtrees(node.subcategories ?? [], depth + 1),
  ]);
}

function flattenCategoryOptions(nodes: AdminProductCategoryNode[]): { id: string; label: string; slug: string }[] {
  return nodes.map((node) => ({
    id: node._id,
    label: node.title,
    slug: node.slug.current,
  }));
}

export function AdminProductsToolbar({ filters, categoryTree }: AdminProductsToolbarProps) {
  const router = useRouter();
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const activeFilterCount = getAdminProductsActiveFilterCount(filters);
  const hasActiveFilters = hasActiveAdminProductsFilters(filters);
  const categoryOptions = useMemo(() => flattenCategoryOptions(categoryTree), [categoryTree]);
  const selectedCategoryNode = categoryTree.find((node) => node.slug.current === filters.category);
  const subcategoryOptions = useMemo(
    () => flattenCategorySubtrees(extractSubcategories(categoryTree, filters.category)),
    [categoryTree, filters.category],
  );

  const pushFilters = (overrides: Partial<AdminProductsFilters>) => {
    router.push(buildAdminProductsHref(filters, { ...overrides, page: overrides.page ?? 1 }));
  };

  const clearFilters = () => {
    router.push("/admin/productos");
  };

  const onSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextQ = String(formData.get("q") ?? "").trim();

    router.push(buildAdminProductsHref(filters, { q: nextQ, page: 1 }));
  };

  return (
    <section className="bg-transparent px-1.5 py-1.5 sm:px-2 sm:py-2 lg:rounded-[26px] lg:border lg:border-slate-200/70 lg:bg-white lg:px-5 lg:py-5 lg:shadow-[0_8px_18px_rgba(15,23,42,0.028)]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600 lg:px-3 lg:py-1 lg:text-[11px]">
              {hasActiveFilters ? `${activeFilterCount} filtros` : "Busqueda y filtros"}
            </span>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-700 transition hover:bg-slate-50 lg:px-3 lg:text-[11px]"
              >
                Limpiar
              </button>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowMoreFilters((value) => !value)}
          aria-expanded={showMoreFilters}
          className={cn(
            "inline-flex items-center justify-center rounded-lg border px-3 py-1.5 text-xs font-semibold transition sm:rounded-full lg:px-4",
            showMoreFilters ? dashboardUi.softAction : "border-[#d7e0ea] bg-[#eef3f8] text-[#334155] hover:bg-[#e4ebf3] sm:border-slate-200 sm:bg-white sm:text-slate-700 sm:hover:bg-slate-50",
          )}
        >
          Filtros
        </button>
      </div>

      <div className="mt-3 border-t border-slate-200/70 pt-3">
        <form onSubmit={onSearchSubmit} className="space-y-2">
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <label className="block">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Buscar</span>
            <input
              name="q"
              defaultValue={filters.q}
              placeholder="Nombre o slug"
              className="h-10 w-full rounded-[14px] border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
            />
          </label>

          <button
            type="submit"
            className={cn(
              "h-10 rounded-[14px] px-4 text-sm font-semibold sm:self-end",
              dashboardUi.primaryAction,
            )}
          >
            Buscar
          </button>
          </div>

          {showMoreFilters ? (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Estado</span>
              <select
                value={filters.status}
                onChange={(event) => pushFilters({ status: event.target.value as AdminProductsFilters["status"] })}
                className="h-10 w-full rounded-[14px] border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              >
                <option value="all">Todos</option>
                <option value="visible">Visible</option>
                <option value="hidden">Oculto</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Stock</span>
              <select
                value={filters.stock}
                onChange={(event) => pushFilters({ stock: event.target.value as AdminProductsFilters["stock"] })}
                className="h-10 w-full rounded-[14px] border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              >
                <option value="all">Todos</option>
                <option value="with">Con stock</option>
                <option value="without">Sin stock</option>
                <option value="low">Stock bajo</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Oferta</span>
              <select
                value={filters.offer}
                onChange={(event) => pushFilters({ offer: event.target.value as AdminProductsFilters["offer"] })}
                className="h-10 w-full rounded-[14px] border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              >
                <option value="all">Todos</option>
                <option value="on">En oferta</option>
                <option value="off">Sin oferta</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Lo nuevo</span>
              <select
                value={filters.newIn}
                onChange={(event) => pushFilters({ newIn: event.target.value as AdminProductsFilters["newIn"] })}
                className="h-10 w-full rounded-[14px] border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              >
                <option value="all">Todos</option>
                <option value="on">En Lo nuevo</option>
                <option value="off">Fuera de Lo nuevo</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Variantes</span>
              <select
                value={filters.variants}
                onChange={(event) => pushFilters({ variants: event.target.value as AdminProductsFilters["variants"] })}
                className="h-10 w-full rounded-[14px] border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              >
                <option value="all">Todos</option>
                <option value="with">Con variantes</option>
                <option value="without">Sin variantes</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Imagen</span>
              <select
                value={filters.image}
                onChange={(event) => pushFilters({ image: event.target.value as AdminProductsFilters["image"] })}
                className="h-10 w-full rounded-[14px] border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              >
                <option value="all">Todos</option>
                <option value="with">Con imagen</option>
                <option value="without">Sin imagen</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Categoría</span>
              <select
                value={filters.category}
                onChange={(event) => pushFilters({ category: event.target.value, subcategory: "" })}
                className="h-10 w-full rounded-[14px] border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              >
                <option value="">Todas</option>
                {categoryOptions.map((option) => (
                  <option key={option.id} value={option.slug}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Subcategoría</span>
              <select
                value={filters.subcategory}
                onChange={(event) => pushFilters({ subcategory: event.target.value })}
                disabled={!selectedCategoryNode}
                className="h-10 w-full rounded-[14px] border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 disabled:bg-slate-50 disabled:text-slate-400"
              >
                <option value="">Todas</option>
                {subcategoryOptions.map((option) => (
                  <option key={option.id} value={option.slug}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            </div>
          ) : null}
        </form>
      </div>
    </section>
  );
}
