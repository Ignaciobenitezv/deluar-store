import type { CatalogHierarchyNode } from "@/features/catalog/hierarchy";
import { productAvailabilityClause } from "@/features/catalog/product-availability";

export const ADMIN_LOW_STOCK_THRESHOLD = 5;

/**
 * Sentinel `category` filter value meaning "no valid category assigned" —
 * lives in the same free-text `category` slug field (no separate filter) so
 * it rides along with the existing URL param, href builder and pagination
 * for free. Never a real slug: Studio's default slugify never produces a
 * double-underscore-wrapped token from a category title.
 */
export const ADMIN_PRODUCTS_NO_CATEGORY_VALUE = "__none__";

export type AdminProductsStatusFilter = "all" | "visible" | "hidden";
export type AdminProductsStockFilter = "all" | "with" | "without" | "low";
export type AdminProductsToggleFilter = "all" | "on" | "off";
export type AdminProductsVariantsFilter = "all" | "with" | "without";

export type AdminProductsFilters = {
  q: string;
  status: AdminProductsStatusFilter;
  stock: AdminProductsStockFilter;
  offer: AdminProductsToggleFilter;
  newIn: AdminProductsToggleFilter;
  variants: AdminProductsVariantsFilter;
  image: AdminProductsVariantsFilter;
  category: string;
  subcategory: string;
  page: number;
};

export const ADMIN_PRODUCTS_DEFAULT_FILTERS: AdminProductsFilters = {
  q: "",
  status: "all",
  stock: "all",
  offer: "all",
  newIn: "all",
  variants: "all",
  image: "all",
  category: "",
  subcategory: "",
  page: 1,
};

export type AdminProductsCategoryNode = CatalogHierarchyNode;

function normalizeQueryText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeSearchTerms(value: string) {
  const normalized = normalizeQueryText(value);

  if (!normalized) {
    return [];
  }

  return normalized
    .split(" ")
    .map((term) => term.trim().toLowerCase())
    .filter(Boolean);
}

function normalizeStatus(value: string | undefined): AdminProductsStatusFilter {
  return value === "visible" || value === "hidden" ? value : "all";
}

function normalizeStock(value: string | undefined): AdminProductsStockFilter {
  return value === "with" || value === "without" || value === "low" ? value : "all";
}

function normalizeToggle(value: string | undefined): AdminProductsToggleFilter {
  return value === "on" || value === "off" ? value : "all";
}

function normalizeVariants(value: string | undefined): AdminProductsVariantsFilter {
  return value === "with" || value === "without" ? value : "all";
}

function normalizePage(value: string | undefined) {
  const parsed = Number.parseInt(value ?? "", 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
}

export function parseAdminProductsFilters(input: {
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
}): AdminProductsFilters {
  return {
    q: normalizeQueryText(input.q ?? ""),
    status: normalizeStatus(input.status),
    stock: normalizeStock(input.stock),
    offer: normalizeToggle(input.offer),
    newIn: normalizeToggle(input.newIn),
    variants: normalizeVariants(input.variants),
    image: normalizeVariants(input.image),
    category: normalizeQueryText(input.category ?? ""),
    subcategory: normalizeQueryText(input.subcategory ?? ""),
    page: normalizePage(input.page),
  };
}

export function buildAdminProductsSearchTerms(q: string) {
  return normalizeSearchTerms(q);
}

export function getAdminProductsActiveFilterCount(filters: AdminProductsFilters) {
  let count = 0;

  if (filters.q) count += 1;
  if (filters.status !== "all") count += 1;
  if (filters.stock !== "all") count += 1;
  if (filters.offer !== "all") count += 1;
  if (filters.newIn !== "all") count += 1;
  if (filters.variants !== "all") count += 1;
  if (filters.image !== "all") count += 1;
  if (filters.category) count += 1;
  if (filters.subcategory) count += 1;

  return count;
}

export function hasActiveAdminProductsFilters(filters: AdminProductsFilters) {
  return getAdminProductsActiveFilterCount(filters) > 0;
}

export function buildAdminProductsHref(filters: AdminProductsFilters, overrides: Partial<AdminProductsFilters> = {}) {
  const nextFilters: AdminProductsFilters = {
    ...filters,
    ...overrides,
    page: overrides.page ?? filters.page,
  };

  const params = new URLSearchParams();

  if (nextFilters.q) params.set("q", nextFilters.q);
  if (nextFilters.status !== "all") params.set("status", nextFilters.status);
  if (nextFilters.stock !== "all") params.set("stock", nextFilters.stock);
  if (nextFilters.offer !== "all") params.set("offer", nextFilters.offer);
  if (nextFilters.newIn !== "all") params.set("newIn", nextFilters.newIn);
  if (nextFilters.variants !== "all") params.set("variants", nextFilters.variants);
  if (nextFilters.image !== "all") params.set("image", nextFilters.image);
  if (nextFilters.category) params.set("category", nextFilters.category);
  if (nextFilters.subcategory) params.set("subcategory", nextFilters.subcategory);
  if ((nextFilters.page ?? 1) > 1) params.set("page", String(nextFilters.page));

  const search = params.toString();
  return search ? `/admin/productos?${search}` : "/admin/productos";
}

export function extractSubcategories(categoryTree: AdminProductsCategoryNode[], categorySlug: string) {
  const category = categoryTree.find((item) => item.slug.current === categorySlug);
  return category?.subcategories ?? [];
}

/**
 * Stock filter clause. "with"/"without"/"all" delegate entirely to
 * `productAvailabilityClause` — the single, canonical definition of
 * availability — so this never becomes a second, competing definition.
 *
 * "low" is a genuinely different, quantitative concept ("has stock, but not
 * much") that isProductStockAvailable doesn't (and shouldn't) express, so it
 * keeps its own sum-based computation — but fixed to respect the same
 * precedence rule (ignore base stock once variants exist) and to guard
 * every count()/math::sum() with `coalesce(..., 0)`: GROQ's count() on a
 * field that doesn't exist at all returns null, not 0, which silently broke
 * every `== 0` / `> 0` comparison below for the many products that have no
 * `variants` or `colorVariants` field at all (the same pitfall already
 * fixed once in productAvailabilityClause).
 */
export function buildAdminProductsStockClause(
  stock: AdminProductsStockFilter,
) {
  if (stock === "all") {
    return "true";
  }

  if (stock === "with") {
    return productAvailabilityClause;
  }

  if (stock === "without") {
    return `!(${productAvailabilityClause})`;
  }

  const hasActiveVariants = "coalesce(count(variants[isActive != false]), 0) > 0";
  const hasColorVariants = "coalesce(count(colorVariants), 0) > 0";
  const variantStock = "coalesce(math::sum(variants[isActive != false].stock), 0)";
  const colorVariantStock = "coalesce(math::sum(colorVariants[defined(stock)].stock), 0)";
  const simpleStock = "coalesce(stock, 0)";
  const isLow = (expression: string) => `(${expression} > 0 && ${expression} <= $lowStockThreshold)`;

  return `(
    (${hasActiveVariants} && ${isLow(variantStock)}) ||
    (!(${hasActiveVariants}) && ${hasColorVariants} && ${isLow(colorVariantStock)}) ||
    (!(${hasActiveVariants}) && !(${hasColorVariants}) && ${isLow(simpleStock)})
  )`;
}
