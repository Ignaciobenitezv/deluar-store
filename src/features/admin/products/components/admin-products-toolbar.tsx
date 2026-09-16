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
import { cn } from "@/lib/utils";

type AdminProductsToolbarProps = {
  filters: AdminProductsFilters;
  categoryTree: AdminProductsCategoryNode[];
};

const selectClass =
  "h-9 w-full rounded-xl border border-border bg-surface px-3 text-[13px] text-text-primary outline-none transition-colors focus:border-primary/40 disabled:bg-surface-elevated disabled:text-text-secondary";
const selectLabelClass = "mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-text-secondary";

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
    <section className="rounded-2xl border border-border bg-surface px-3 py-3 sm:px-4 sm:py-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-md border border-border bg-surface-elevated px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-secondary">
              {hasActiveFilters ? `${activeFilterCount} filtros` : "Busqueda y filtros"}
            </span>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center rounded-md border border-border bg-surface px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-primary transition-colors duration-150 hover:bg-surface-elevated"
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
            "inline-flex h-8 items-center justify-center rounded-xl border px-3 text-[12.5px] font-medium transition-colors duration-150",
            showMoreFilters
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-surface text-text-primary hover:bg-surface-elevated",
          )}
        >
          Filtros
        </button>
      </div>

      <div className="mt-3 border-t border-border pt-3">
        <form onSubmit={onSearchSubmit} className="space-y-2">
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <label className="block">
              <span className={selectLabelClass}>Buscar</span>
              <input
                name="q"
                defaultValue={filters.q}
                placeholder="Nombre o slug"
                className="h-9 w-full rounded-xl border border-border bg-surface px-3 text-[13px] text-text-primary outline-none transition-colors placeholder:text-text-secondary focus:border-primary/40"
              />
            </label>

            <button
              type="submit"
              className="h-9 rounded-xl border border-primary bg-primary px-4 text-[13px] font-medium text-primary-foreground transition-colors duration-150 hover:brightness-105 sm:self-end"
            >
              Buscar
            </button>
          </div>

          {showMoreFilters ? (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              <label className="block">
                <span className={selectLabelClass}>Estado</span>
                <select
                  value={filters.status}
                  onChange={(event) => pushFilters({ status: event.target.value as AdminProductsFilters["status"] })}
                  className={selectClass}
                >
                  <option value="all">Todos</option>
                  <option value="visible">Visible</option>
                  <option value="hidden">Oculto</option>
                </select>
              </label>

              <label className="block">
                <span className={selectLabelClass}>Stock</span>
                <select
                  value={filters.stock}
                  onChange={(event) => pushFilters({ stock: event.target.value as AdminProductsFilters["stock"] })}
                  className={selectClass}
                >
                  <option value="all">Todos</option>
                  <option value="with">Con stock</option>
                  <option value="without">Sin stock</option>
                  <option value="low">Stock bajo</option>
                </select>
              </label>

              <label className="block">
                <span className={selectLabelClass}>Oferta</span>
                <select
                  value={filters.offer}
                  onChange={(event) => pushFilters({ offer: event.target.value as AdminProductsFilters["offer"] })}
                  className={selectClass}
                >
                  <option value="all">Todos</option>
                  <option value="on">En oferta</option>
                  <option value="off">Sin oferta</option>
                </select>
              </label>

              <label className="block">
                <span className={selectLabelClass}>Lo nuevo</span>
                <select
                  value={filters.newIn}
                  onChange={(event) => pushFilters({ newIn: event.target.value as AdminProductsFilters["newIn"] })}
                  className={selectClass}
                >
                  <option value="all">Todos</option>
                  <option value="on">En Lo nuevo</option>
                  <option value="off">Fuera de Lo nuevo</option>
                </select>
              </label>

              <label className="block">
                <span className={selectLabelClass}>Variantes</span>
                <select
                  value={filters.variants}
                  onChange={(event) => pushFilters({ variants: event.target.value as AdminProductsFilters["variants"] })}
                  className={selectClass}
                >
                  <option value="all">Todos</option>
                  <option value="with">Con variantes</option>
                  <option value="without">Sin variantes</option>
                </select>
              </label>

              <label className="block">
                <span className={selectLabelClass}>Imagen</span>
                <select
                  value={filters.image}
                  onChange={(event) => pushFilters({ image: event.target.value as AdminProductsFilters["image"] })}
                  className={selectClass}
                >
                  <option value="all">Todos</option>
                  <option value="with">Con imagen</option>
                  <option value="without">Sin imagen</option>
                </select>
              </label>

              <label className="block">
                <span className={selectLabelClass}>Categoría</span>
                <select
                  value={filters.category}
                  onChange={(event) => pushFilters({ category: event.target.value, subcategory: "" })}
                  className={selectClass}
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
                <span className={selectLabelClass}>Subcategoría</span>
                <select
                  value={filters.subcategory}
                  onChange={(event) => pushFilters({ subcategory: event.target.value })}
                  disabled={!selectedCategoryNode}
                  className={selectClass}
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
