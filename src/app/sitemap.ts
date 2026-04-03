import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { sanityFetch } from "@/integrations/sanity/client";
import {
  allProductSlugsQuery,
  categoryTreeQuery,
} from "@/integrations/sanity/queries";

type CategoryTreeItem = {
  slug: {
    current: string;
  };
  subcategories?: Array<{
    slug: {
      current: string;
    };
  }>;
};

type ProductSlugItem = {
  slug: string;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: siteConfig.url,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteConfig.url}/productos`,
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];

  try {
    const [categories, products] = await Promise.all([
      sanityFetch<CategoryTreeItem[]>(categoryTreeQuery),
      sanityFetch<ProductSlugItem[]>(allProductSlugsQuery),
    ]);

    const categoryRoutes: MetadataRoute.Sitemap = categories.flatMap((category) => {
      const categoryUrl = {
        url: `${siteConfig.url}/productos/${category.slug.current}`,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      };

      const subcategoryUrls = (category.subcategories ?? []).map((subcategory) => ({
        url: `${siteConfig.url}/productos/${category.slug.current}/${subcategory.slug.current}`,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }));

      return [categoryUrl, ...subcategoryUrls];
    });

    const productRoutes: MetadataRoute.Sitemap = products.map((product) => ({
      url: `${siteConfig.url}/productos/detalle/${product.slug}`,
      changeFrequency: "weekly",
      priority: 0.7,
    }));

    return [...staticRoutes, ...categoryRoutes, ...productRoutes];
  } catch {
    return staticRoutes;
  }
}
