import { cache } from "react";
import { storefrontNavigation } from "@/config/navigation/storefront-navigation";
import { mapCatalogHierarchyToNavigationCategories, type CatalogHierarchyNode } from "@/features/catalog/hierarchy";
import { sanityFetch } from "@/integrations/sanity/client";
import { categoryTreeQuery } from "@/integrations/sanity/queries";
import { sanityConfig } from "@/integrations/sanity/config";
import type { StorefrontNavigation } from "@/types/navigation";

export const getStorefrontNavigation = cache(async (): Promise<StorefrontNavigation> => {
  if (!sanityConfig.projectId || !sanityConfig.dataset) {
    return storefrontNavigation;
  }

  try {
    const categories = await sanityFetch<CatalogHierarchyNode[]>(categoryTreeQuery);

    if (!categories.length) {
      return storefrontNavigation;
    }

    return {
      ...storefrontNavigation,
      categories: mapCatalogHierarchyToNavigationCategories(categories),
    };
  } catch {
    return storefrontNavigation;
  }
});
