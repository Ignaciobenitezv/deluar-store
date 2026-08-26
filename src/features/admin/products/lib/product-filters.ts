import type { CatalogHierarchyNode } from "@/features/catalog/hierarchy";

export const ADMIN_LOW_STOCK_THRESHOLD = 5;

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

function buildEffectiveStockBranches() {
  return {
    variantStock: "math::sum(variants[isActive != false].stock)",
    colorVariantStock: "math::sum(colorVariants[defined(stock)].stock)",
    simpleStock: "stock",
    hasVariants: "count(variants[isActive != false]) > 0",
    hasColorVariants: "count(colorVariants) > 0",
  };
}

export function buildAdminProductsStockClause(
  stock: AdminProductsStockFilter,
) {
  if (stock === "all") {
    return "true";
  }

  const branches = buildEffectiveStockBranches();
  const branchComparison = (expression: string) => {
    if (stock === "with") {
      return `${expression} > 0`;
    }

    if (stock === "without") {
      return `${expression} <= 0`;
    }

    return `${expression} > 0 && ${expression} <= $lowStockThreshold`;
  };

  return `(
    (${branches.hasVariants} && ${branchComparison(branches.variantStock)}) ||
    (count(variants[isActive != false]) == 0 && ${branches.hasColorVariants} && ${branchComparison(branches.colorVariantStock)}) ||
    (count(variants[isActive != false]) == 0 && count(colorVariants) == 0 && ${branchComparison(branches.simpleStock)})
  )`;
}
