import { cache } from "react";
import { storefrontNavigation } from "@/config/navigation/storefront-navigation";
import { sanityFetch } from "@/integrations/sanity/client";
import { categoryTreeQuery } from "@/integrations/sanity/queries";
import { sanityConfig } from "@/integrations/sanity/config";
import type {
  NavigationCategory,
  NavigationCategoryItem,
  StorefrontNavigation,
} from "@/types/navigation";

export type SanityNavigationCategory = {
  _id: string;
  title: string;
  slug: {
    current: string;
  };
  subcategories?: Array<{
    _id: string;
    title: string;
    slug: {
      current: string;
    };
  }>;
};

export function mapSanityNavigationCategories(
  categories: SanityNavigationCategory[],
): NavigationCategory[] {
  return categories.map((category) => ({
    id: category._id,
    label: category.title,
    href: `/productos/${category.slug.current}`,
    cmsKey: category.slug.current,
    items: (category.subcategories ?? []).map<NavigationCategoryItem>((item) => ({
      id: item._id,
      label: item.title,
      href: `/productos/${category.slug.current}/${item.slug.current}`,
      cmsKey: item.slug.current,
    })),
  }));
}

export const getStorefrontNavigation = cache(async (): Promise<StorefrontNavigation> => {
  if (!sanityConfig.projectId || !sanityConfig.dataset) {
    return storefrontNavigation;
  }

  try {
    const categories = await sanityFetch<SanityNavigationCategory[]>(
      categoryTreeQuery,
    );

    if (!categories.length) {
      return storefrontNavigation;
    }

    return {
      ...storefrontNavigation,
      categories: mapSanityNavigationCategories(categories),
    };
  } catch {
    return storefrontNavigation;
  }
});
