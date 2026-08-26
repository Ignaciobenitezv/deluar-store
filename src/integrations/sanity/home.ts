import { cache } from "react";
import { mapHomePageData } from "@/features/home/mappers";
import type { HomePageData } from "@/features/home/types";
import { sanityFetch, sanityFreshFetch } from "@/integrations/sanity/client";
import {
  categoryTreeQuery,
  featuredProductsQuery,
  homePageQuery,
  newInProductsQuery,
  offerProductsQuery,
  promoSettingsQuery,
  siteSettingsQuery,
} from "@/integrations/sanity/queries";
import type {
  CategoryDocument,
  HomePageDocument,
  ProductDocument,
  PromoSettingsDocument,
  SiteSettingsDocument,
} from "@/types/cms";

export const getHomePageData = cache(async (): Promise<HomePageData> => {
  try {
    const [homePage, categories, featuredProducts, newInProducts, offerProducts, promoSettings, siteSettings] =
      await Promise.all([
        sanityFreshFetch<HomePageDocument | null>(homePageQuery),
        sanityFetch<CategoryDocument[]>(categoryTreeQuery),
        sanityFreshFetch<ProductDocument[]>(featuredProductsQuery),
        sanityFreshFetch<ProductDocument[]>(newInProductsQuery),
        sanityFreshFetch<ProductDocument[]>(offerProductsQuery),
        sanityFetch<PromoSettingsDocument | null>(promoSettingsQuery),
        sanityFetch<SiteSettingsDocument | null>(siteSettingsQuery),
      ]);

    return mapHomePageData({
      homePage,
      categories,
      featuredProducts,
      newInProducts,
      offerProducts,
      promoSettings,
      siteSettings,
    });
  } catch {
    return mapHomePageData({
      homePage: null,
      categories: [],
      featuredProducts: [],
      newInProducts: [],
      offerProducts: [],
      promoSettings: null,
      siteSettings: null,
    });
  }
});
