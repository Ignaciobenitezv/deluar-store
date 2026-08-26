import { unstable_noStore as noStore } from "next/cache";
import { cache } from "react";
import { getSanityImageUrl } from "@/integrations/sanity/image";
import { sanityFetch } from "@/integrations/sanity/client";
import { categoryTreeQuery } from "@/integrations/sanity/queries";
import { buildAdminProductsPageQuery } from "@/integrations/sanity/admin-queries";
import type { CatalogHierarchyNode } from "@/features/catalog/hierarchy";
import { buildAdminProductsSearchTerms, type AdminProductsFilters } from "../lib/product-filters";
import { resolveAdminProductStockSummary } from "../lib/product-stock";
import type {
  AdminProductListItem,
  AdminProductsPageData,
} from "../types";

type AdminProductsPageQueryItem = {
  _id: string;
  _rev: string;
  _updatedAt: string;
  title: string;
  slug: string;
  shortDescription?: string;
  basePrice: number;
  transferPrice?: number | null;
  stock: number;
  isActive?: boolean;
  isOnOffer?: boolean;
  showInNewIn?: boolean;
  newInOrder?: number | null;
  images?: Array<{
    asset?: { _ref?: string };
    alt?: string;
  }>;
  category?: {
    _id: string;
    title: string;
    slug?: string;
  } | null;
  subcategory?: {
    _id: string;
    title: string;
    slug?: string;
  } | null;
  variants?: Array<{
    _key?: string;
    title?: string;
    value?: string;
    stock?: number;
    isActive?: boolean;
  }>;
  colorVariants?: Array<{
    _key?: string;
    title?: string;
    value?: string;
    stock?: number;
  }>;
};

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

  const imageClause =
    filters.image === "with"
      ? "count(images) > 0"
      : filters.image === "without"
        ? "count(images) == 0"
        : "true";

  const categoryClause = filters.category ? `category->slug.current == \"${filters.category}\"` : "true";
  const subcategoryClause = filters.subcategory ? `subcategory->slug.current == \"${filters.subcategory}\"` : "true";

  return [
    searchClause,
    statusClause,
    offerClause,
    newInClause,
    variantClause,
    imageClause,
    categoryClause,
    subcategoryClause,
  ].join(" && ");
}

function mapCategoryTree(categories: CatalogHierarchyNode[]): CatalogHierarchyNode[] {
  return categories;
}

function mapProductItem(product: AdminProductsPageQueryItem): AdminProductListItem {
  const stockSummary = resolveAdminProductStockSummary({
    basePrice: product.basePrice,
    images: (product.images ?? []) as never,
    stock: product.stock,
    title: product.title,
    transferPrice: product.transferPrice ?? undefined,
    variants: (product.variants ?? []) as never,
    colorVariants: (product.colorVariants ?? []) as never,
  });

  const variantCount = (product.variants?.length ?? 0) + (product.colorVariants?.length ?? 0);
  const variantSource =
    product.variants && product.variants.length > 0
      ? "variants"
      : product.colorVariants && product.colorVariants.length > 0
        ? "colorVariants"
        : null;

  return {
    id: product._id,
    rev: product._rev,
    updatedAt: product._updatedAt,
    title: product.title,
    slug: product.slug,
    shortDescription: product.shortDescription,
    imageUrl: product.images?.[0] ? getSanityImageUrl(product.images[0] as never, 640, 640) : null,
    imageAlt: product.title,
    categoryLabel: product.category?.title ?? "Sin categoría",
    categorySlug: product.category?.slug ?? null,
    subcategoryLabel: product.subcategory?.title ?? null,
    subcategorySlug: product.subcategory?.slug ?? null,
    basePrice: product.basePrice,
    transferPrice: product.transferPrice ?? null,
    stockLabel: stockSummary.stockLabel,
    stockHint: stockSummary.stockHint,
    stockTone: stockSummary.stockTone,
    stockValue: stockSummary.stockValue,
    variantLabel: variantCount > 0 ? `${variantCount} variantes` : "Sin variantes",
    variantCount,
    hasVariants: variantCount > 0,
    variantSource,
    visible: product.isActive !== false,
    isOnOffer: product.isOnOffer === true,
    showInNewIn: product.showInNewIn === true,
    newInOrder: typeof product.newInOrder === "number" ? product.newInOrder : null,
  };
}

export const getAdminProductsPageData = cache(async (filters: AdminProductsFilters): Promise<AdminProductsPageData> => {
  noStore();

  const pageSize = DEFAULT_ADMIN_PRODUCTS_PAGE_SIZE;
  const page = Math.max(1, Math.trunc(filters.page || 1));
  const offset = (page - 1) * pageSize;
  const filterClause = buildAdminProductsFilterClause(filters);
  const outOfStockClause = "stock <= 0";

  const [response, categories] = await Promise.all([
    sanityFetch<AdminProductsPageQueryResponse>(
      buildAdminProductsPageQuery(filterClause, outOfStockClause),
      { offset, limit: pageSize },
      { useToken: true },
    ),
    sanityFetch<CatalogHierarchyNode[]>(categoryTreeQuery, {}, { useToken: true }),
  ]);

  const totalPages = Math.max(1, Math.ceil(response.filteredTotal / pageSize));

  return {
    summary: response.global,
    filteredTotal: response.filteredTotal,
    items: response.items.map(mapProductItem),
    categories: mapCategoryTree(categories),
    filters,
    page,
    pageSize,
    totalPages,
    totalItems: response.global.total,
  };
});
