"use client";

import type { FormEvent } from "react";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ADMIN_PRODUCTS_NO_CATEGORY_VALUE, extractSubcategories } from "@/features/admin/products/lib/product-filters";
import type { AdminProductCategoryNode } from "@/features/admin/products/types";
import { cn } from "@/lib/utils";
import {
  buildAdminInventoryHref,
  getAdminInventoryActiveFilterCount,
  hasActiveAdminInventoryFilters,
  type AdminInventoryFilters,
} from "../lib/inventory-filters";

type AdminInventoryToolbarProps = {
  filters: AdminInventoryFilters;
  categoryTree: AdminProductCategoryNode[];
};

const selectClass =
  "h-9 w-full rounded-xl border border-border bg-surface px-3 text-[13px] text-text-primary outline-none transition-colors focus:border-primary/40 disabled:bg-surface-elevated disabled:text-text-secondary";
const selectLabelClass = "mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-text-secondary";

function flattenCategorySubtrees(nodes: AdminProductCategoryNode[], depth = 0): { id: string; label: string; slug: string }[] {
  return nodes.flatMap((node) => [
    { id: node._id, label: `${"- ".repeat(depth)}${node.title}`, slug: node.slug.current },
    ...flattenCategorySubtrees(node.subcategories ?? [], depth + 1),
  ]);
}

export function AdminInventoryToolbar({ filters, categoryTree }: AdminInventoryToolbarProps) {
  const router = useRouter();
  const activeFilterCount = getAdminInventoryActiveFilterCount(filters);
  const hasActiveFilters = hasActiveAdminInventoryFilters(filters);
  const categoryOptions = useMemo(
    () => categoryTree.map((node) => ({ id: node._id, label: node.title, slug: node.slug.current })),
    [categoryTree],
  );
  const selectedCategoryNode = categoryTree.find((node) => node.slug.current === filters.category);
  const subcategoryOptions = useMemo(
    () => flattenCategorySubtrees(extractSubcategories(categoryTree, filters.category)),
    [categoryTree, filters.category],
  );

  const pushFilters = (overrides: Partial<AdminInventoryFilters>) => {
    router.push(buildAdminInventoryHref(filters, { ...overrides, page: 1 }));
  };

  const clearFilters = () => router.push("/admin/productos/inventario");

  const onSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextQ = String(formData.get("q") ?? "").trim();
    router.push(buildAdminInventoryHref(filters, { q: nextQ, page: 1 }));
  };

  return (
    <section className="rounded-2xl border border-border bg-surface px-3 py-3 sm:px-4 sm:py-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center rounded-md border border-border bg-surface-elevated px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-secondary">
          {hasActiveFilters ? `${activeFilterCount} filtros` : "Búsqueda y filtros"}
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

      <div className="mt-3 border-t border-border pt-3">
        <form onSubmit={onSearchSubmit} className="space-y-3">
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

          <div className="grid gap-2 sm:grid-cols-3">
            <label className="block">
              <span className={selectLabelClass}>Categoría</span>
              <select
                value={filters.category}
                onChange={(event) => pushFilters({ category: event.target.value, subcategory: "" })}
                className={selectClass}
              >
                <option value="">Todas</option>
                <option value={ADMIN_PRODUCTS_NO_CATEGORY_VALUE}>Sin categoría</option>
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

            <label className="block">
              <span className={selectLabelClass}>Stock</span>
              <select
                value={filters.stock}
                onChange={(event) => pushFilters({ stock: event.target.value as AdminInventoryFilters["stock"] })}
                className={cn(selectClass)}
              >
                <option value="all">Todos</option>
                <option value="with">Con stock</option>
                <option value="without">Sin stock</option>
                <option value="low">Stock bajo</option>
              </select>
            </label>
          </div>
        </form>
      </div>
    </section>
  );
}
