import {
  ADMIN_PRODUCTS_NO_CATEGORY_VALUE,
  buildAdminProductsSearchTerms,
  buildAdminProductsStockClause,
  type AdminProductsStockFilter,
} from "@/features/admin/products/lib/product-filters";

/**
 * Inventario's own, deliberately smaller filter set — a subset of
 * AdminProductsFilters (no status/offer/newIn/variants/image, none of which
 * are relevant to a stock tool). Reuses the exact same search/stock clause
 * builders Productos already uses, so "con stock/sin stock/stock bajo" never
 * becomes a second, competing definition.
 */
export type AdminInventoryFilters = {
  q: string;
  category: string;
  subcategory: string;
  stock: AdminProductsStockFilter;
  page: number;
};

export const ADMIN_INVENTORY_DEFAULT_FILTERS: AdminInventoryFilters = {
  q: "",
  category: "",
  subcategory: "",
  stock: "all",
  page: 1,
};

function normalizeQueryText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeStock(value: string | undefined): AdminProductsStockFilter {
  return value === "with" || value === "without" || value === "low" ? value : "all";
}

function normalizePage(value: string | undefined) {
  const parsed = Number.parseInt(value ?? "", 10);
  return !Number.isFinite(parsed) || parsed < 1 ? 1 : parsed;
}

export function parseAdminInventoryFilters(input: {
  q?: string;
  category?: string;
  subcategory?: string;
  stock?: string;
  page?: string;
}): AdminInventoryFilters {
  return {
    q: normalizeQueryText(input.q ?? ""),
    category: normalizeQueryText(input.category ?? ""),
    subcategory: normalizeQueryText(input.subcategory ?? ""),
    stock: normalizeStock(input.stock),
    page: normalizePage(input.page),
  };
}

export function getAdminInventoryActiveFilterCount(filters: AdminInventoryFilters) {
  let count = 0;
  if (filters.q) count += 1;
  if (filters.category) count += 1;
  if (filters.subcategory) count += 1;
  if (filters.stock !== "all") count += 1;
  return count;
}

export function hasActiveAdminInventoryFilters(filters: AdminInventoryFilters) {
  return getAdminInventoryActiveFilterCount(filters) > 0;
}

export function buildAdminInventoryHref(
  filters: AdminInventoryFilters,
  overrides: Partial<AdminInventoryFilters> = {},
) {
  const nextFilters: AdminInventoryFilters = {
    ...filters,
    ...overrides,
    page: overrides.page ?? filters.page,
  };

  const params = new URLSearchParams();
  if (nextFilters.q) params.set("q", nextFilters.q);
  if (nextFilters.category) params.set("category", nextFilters.category);
  if (nextFilters.subcategory) params.set("subcategory", nextFilters.subcategory);
  if (nextFilters.stock !== "all") params.set("stock", nextFilters.stock);
  if ((nextFilters.page ?? 1) > 1) params.set("page", String(nextFilters.page));

  const search = params.toString();
  return search ? `/admin/productos/inventario?${search}` : "/admin/productos/inventario";
}

/**
 * Mirrors buildAdminProductsFilterClause's category/stock composition
 * (admin-products-service.ts) exactly, minus the fields Inventario doesn't
 * have — same "Sin categoría" sentinel, same coalesced stock clause.
 */
export function buildAdminInventoryFilterClause(filters: AdminInventoryFilters) {
  const searchTerms = buildAdminProductsSearchTerms(filters.q);
  const searchClause =
    searchTerms.length > 0
      ? searchTerms
          .map(
            (term) =>
              `(title match "*${term}*" || slug.current match "*${term}*" || shortDescription match "*${term}*")`,
          )
          .join(" && ")
      : "true";

  const categoryClause =
    filters.category === ADMIN_PRODUCTS_NO_CATEGORY_VALUE
      ? "!defined(category->_id)"
      : filters.category
        ? `category->slug.current == "${filters.category}"`
        : "true";

  const subcategoryClause = filters.subcategory
    ? `subcategory->slug.current == "${filters.subcategory}"`
    : "true";

  const stockClause = buildAdminProductsStockClause(filters.stock);

  return [searchClause, categoryClause, subcategoryClause, stockClause].join(" && ");
}
