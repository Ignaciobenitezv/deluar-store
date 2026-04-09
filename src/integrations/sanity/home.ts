import { cache } from "react";
import { mapHomePageData } from "@/features/home/mappers";
import type { HomePageData } from "@/features/home/types";
import { sanityFetch } from "@/integrations/sanity/client";
import {
  categoryTreeQuery,
  featuredProductsQuery,
  homePageQuery,
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
    const [homePage, categories, featuredProducts, offerProducts, promoSettings, siteSettings] =
      await Promise.all([
        sanityFetch<HomePageDocument | null>(homePageQuery),
        sanityFetch<CategoryDocument[]>(categoryTreeQuery),
        sanityFetch<ProductDocument[]>(featuredProductsQuery),
        sanityFetch<ProductDocument[]>(offerProductsQuery),
        sanityFetch<PromoSettingsDocument | null>(promoSettingsQuery),
        sanityFetch<SiteSettingsDocument | null>(siteSettingsQuery),
      ]);

    return mapHomePageData({
      homePage,
      categories,
      featuredProducts,
      offerProducts,
      promoSettings,
      siteSettings,
    });
  } catch {
    return mapHomePageData({
      homePage: null,
      categories: [],
      featuredProducts: [],
      offerProducts: [],
      promoSettings: null,
      siteSettings: null,
    });
  }
});
