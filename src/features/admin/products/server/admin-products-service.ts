import { unstable_noStore as noStore } from "next/cache";
import { sanityFreshFetch } from "@/integrations/sanity/client";
import { TIENDANUBE_PLACEHOLDER_IMAGE_ASSET_REF } from "@/integrations/sanity/image";
import { categoryTreeQuery } from "@/integrations/sanity/queries";
import { buildAdminProductsPageQuery } from "@/integrations/sanity/admin-queries";
import type { CatalogHierarchyNode } from "@/features/catalog/hierarchy";
import {
  ADMIN_LOW_STOCK_THRESHOLD,
  ADMIN_PRODUCTS_NO_CATEGORY_VALUE,
  buildAdminProductsSearchTerms,
  buildAdminProductsStockClause,
  type AdminProductsFilters,
} from "../lib/product-filters";
import { mapAdminProductListItem, type AdminProductItemSource } from "../lib/admin-product-item";
import type { AdminProductsPageData } from "../types";

type AdminProductsPageQueryItem = AdminProductItemSource;

type AdminProductsPageQueryResponse = {
  global: {
    total: number;
    visible: number;
    outOfStock: number;
    onOffer: number;
  };
  filteredTotal: number;
  items: AdminProductsPageQueryItem[];
  categories: CatalogHierarchyNode[];
};

export const DEFAULT_ADMIN_PRODUCTS_PAGE_SIZE = 24;

function buildAdminProductsFilterClause(filters: AdminProductsFilters) {
  const searchTerms = buildAdminProductsSearchTerms(filters.q);
  const searchClause =
    searchTerms.length > 0
      ? searchTerms
          .map(
            (term) =>
              `(title match \"*${term}*\" || slug.current match \"*${term}*\" || shortDescription match \"*${term}*\")`,
          )
          .join(" && ")
      : "true";

  const statusClause =
    filters.status === "visible"
      ? "isActive != false"
      : filters.status === "hidden"
        ? "isActive == false"
        : "true";

  const offerClause =
    filters.offer === "on" ? "isOnOffer == true" : filters.offer === "off" ? "isOnOffer == false" : "true";

  const newInClause =
    filters.newIn === "on"
      ? "showInNewIn == true"
      : filters.newIn === "off"
        ? "showInNewIn == false"
        : "true";

  const variantClause =
    filters.variants === "with"
      ? "(count(variants) > 0 || count(colorVariants) > 0)"
      : filters.variants === "without"
        ? "(count(variants) == 0 && count(colorVariants) == 0)"
        : "true";

  // "without" deliberately does NOT require isActive != false — Lucila can
  // already combine it with the separate Estado filter (statusClause above)
  // if she wants e.g. "Visible + Sin stock".
  const stockClause = buildAdminProductsStockClause(filters.stock);

  // Mirrors the exact clause already used by
  // homeCategoryRepresentativeProductQuery (src/integrations/sanity/queries.ts)
  // for the same problem: a real photo is any image whose asset ref is
  // defined AND isn't the Tiendanube placeholder asset.
  const realImageExistsClause = `count(images[defined(image.asset._ref) && image.asset._ref != $placeholderAssetRef]) > 0`;
  const imageClause =
    filters.image === "with"
      ? realImageExistsClause
      : filters.image === "without"
        ? `!(${realImageExistsClause})`
        : "true";

  // "Sin categoría" rides the same free-text category field via a sentinel
  // value instead of a separate filter. `!defined(category->_id)` is the one
  // clause that actually covers every real "no valid category" shape in this
  // dataset: the reference field missing entirely, present but null, and a
  // stale reference to a category that no longer resolves (deleted, or only
  // a draft under this query's published perspective) — a broken reference
  // dereferences to null in GROQ just like a missing field does.
  const categoryClause =
    filters.category === ADMIN_PRODUCTS_NO_CATEGORY_VALUE
      ? "!defined(category->_id)"
      : filters.category
        ? `category->slug.current == \"${filters.category}\"`
        : "true";
  const subcategoryClause = filters.subcategory ? `subcategory->slug.current == \"${filters.subcategory}\"` : "true";

  return [
    searchClause,
    statusClause,
    offerClause,
    newInClause,
    variantClause,
    stockClause,
    imageClause,
    categoryClause,
    subcategoryClause,
  ].join(" && ");
}

function mapCategoryTree(categories: CatalogHierarchyNode[]): CatalogHierarchyNode[] {
  return categories;
}

export async function getAdminProductsPageData(filters: AdminProductsFilters): Promise<AdminProductsPageData> {
  noStore();

  const pageSize = DEFAULT_ADMIN_PRODUCTS_PAGE_SIZE;
  const page = Math.max(1, Math.trunc(filters.page || 1));
  const offset = (page - 1) * pageSize;
  const filterClause = buildAdminProductsFilterClause(filters);

  const [response, categories] = await Promise.all([
    sanityFreshFetch<AdminProductsPageQueryResponse>(
      buildAdminProductsPageQuery(filterClause),
      {
        offset,
        limit: pageSize,
        placeholderAssetRef: TIENDANUBE_PLACEHOLDER_IMAGE_ASSET_REF,
        lowStockThreshold: ADMIN_LOW_STOCK_THRESHOLD,
      },
    ),
    sanityFreshFetch<CatalogHierarchyNode[]>(categoryTreeQuery, {}),
  ]);

  const totalPages = Math.max(1, Math.ceil(response.filteredTotal / pageSize));

  return {
    summary: response.global,
    filteredTotal: response.filteredTotal,
    items: response.items.map(mapAdminProductListItem),
    categories: mapCategoryTree(categories),
    filters,
    page,
    pageSize,
    totalPages,
    totalItems: response.global.total,
  };
}
