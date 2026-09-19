import { unstable_noStore as noStore } from "next/cache";
import { sanityFreshFetch } from "@/integrations/sanity/client";
import { categoryTreeQuery } from "@/integrations/sanity/queries";
import { buildAdminInventoryPageQuery } from "@/integrations/sanity/admin-queries";
import type { CatalogHierarchyNode } from "@/features/catalog/hierarchy";
import { ADMIN_LOW_STOCK_THRESHOLD } from "@/features/admin/products/lib/product-filters";
import { buildAdminInventoryFilterClause, type AdminInventoryFilters } from "../lib/inventory-filters";
import { mapAdminInventoryItem, type AdminInventoryItem, type AdminInventoryItemSource } from "../lib/inventory-item";

export const ADMIN_INVENTORY_PAGE_SIZE = 24;

type AdminInventoryPageQueryResponse = {
  filteredTotal: number;
  items: AdminInventoryItemSource[];
};

export type AdminInventoryPageData = {
  items: AdminInventoryItem[];
  categories: CatalogHierarchyNode[];
  filters: AdminInventoryFilters;
  page: number;
  pageSize: number;
  totalPages: number;
  filteredTotal: number;
};

export async function getAdminInventoryPageData(filters: AdminInventoryFilters): Promise<AdminInventoryPageData> {
  noStore();

  const pageSize = ADMIN_INVENTORY_PAGE_SIZE;
  const page = Math.max(1, Math.trunc(filters.page || 1));
  const offset = (page - 1) * pageSize;
  const filterClause = buildAdminInventoryFilterClause(filters);

  const [response, categories] = await Promise.all([
    sanityFreshFetch<AdminInventoryPageQueryResponse>(buildAdminInventoryPageQuery(filterClause), {
      offset,
      limit: pageSize,
      lowStockThreshold: ADMIN_LOW_STOCK_THRESHOLD,
    }),
    sanityFreshFetch<CatalogHierarchyNode[]>(categoryTreeQuery, {}),
  ]);

  const totalPages = Math.max(1, Math.ceil(response.filteredTotal / pageSize));

  return {
    items: response.items.map(mapAdminInventoryItem),
    categories,
    filters,
    page,
    pageSize,
    totalPages,
    filteredTotal: response.filteredTotal,
  };
}
