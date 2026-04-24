import { cache } from "react";
import { storefrontNavigation } from "@/config/navigation/storefront-navigation";
import {
  mapCategoryToSummary,
  mapProductToCatalogCard,
  mapProductToDetail,
} from "@/features/catalog/mappers";
import type {
  CatalogCategorySummary,
  CatalogPageData,
  ProductDetailData,
} from "@/features/catalog/types";
import { sanityFetch } from "@/integrations/sanity/client";
import {
  allProductsQuery,
  categoryBySlugQuery,
  categoryTreeQuery,
  productBySlugQuery,
  productsByCategoryQuery,
  relatedProductsByCategoryQuery,
  searchProductsQuery,
} from "@/integrations/sanity/queries";
import type { CategoryDocument, ProductDocument, SubcategoryDocument } from "@/types/cms";

type CategoryWithSubcategories = CategoryDocument & {
  subcategories?: SubcategoryDocument[];
};

type CatalogFilters = {
  q?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  color?: string;
};

function getFallbackCategorySummary(): CatalogCategorySummary[] {
  return storefrontNavigation.categories.map((category) => ({
    id: category.id,
    title: category.label,
    slug: category.cmsKey ?? category.id,
    description: undefined,
    href: `/productos/${category.cmsKey ?? category.id}`,
  }));
}

function getFallbackCategory(slug: string) {
  return storefrontNavigation.categories.find((category) => category.cmsKey === slug);
}

function getFallbackSubcategory(categorySlug: string, subcategorySlug: string) {
  return storefrontNavigation.categories
    .find((category) => category.cmsKey === categorySlug)
    ?.items.find((item) => item.cmsKey === subcategorySlug);
}

function matchesCatalogFilters(product: ProductDocument, filters: CatalogFilters) {
  if (typeof filters.minPrice === "number" && product.basePrice < filters.minPrice) {
    return false;
  }

  if (typeof filters.maxPrice === "number" && product.basePrice > filters.maxPrice) {
    return false;
  }

  if (filters.inStock && product.stock <= 0) {
    return false;
  }

  if (filters.color) {
    const normalizedColor = filters.color.trim().toLowerCase();
    const hasColorVariant = (product.colorVariants ?? []).some((variant) => {
      const title = variant.title?.trim().toLowerCase() ?? "";
      const value = variant.value?.trim().toLowerCase() ?? "";

      return title === normalizedColor || value === normalizedColor;
    });

    if (!hasColorVariant) {
      return false;
    }
  }

  return true;
}

export const getCatalogPageData = cache(async (filters: CatalogFilters = {}): Promise<CatalogPageData> => {
  const normalizedQuery = filters.q?.trim() ?? "";
  const searchPattern = `*${normalizedQuery}*`;

  try {
    const [products, categories] = await Promise.all([
      sanityFetch<ProductDocument[]>(
        normalizedQuery ? searchProductsQuery : allProductsQuery,
        normalizedQuery ? { q: normalizedQuery, pattern: searchPattern } : {},
      ),
      sanityFetch<CategoryWithSubcategories[]>(categoryTreeQuery),
    ]);
    const filteredProducts = products.filter((product) => matchesCatalogFilters(product, filters));

    return {
      title: normalizedQuery ? `Resultados para: ${normalizedQuery}` : "Productos",
      description: normalizedQuery
        ? `Productos de DELUAR que coinciden con "${normalizedQuery}".`
        : "Seleccion de objetos y textiles para hogar y decoracion curados para DELUAR.",
      products: filteredProducts.map(mapProductToCatalogCard),
      categories: categories.length
        ? categories.map(mapCategoryToSummary)
        : getFallbackCategorySummary(),
    };
  } catch {
    return {
      title: normalizedQuery ? `Resultados para: ${normalizedQuery}` : "Productos",
      description: normalizedQuery
        ? `Productos de DELUAR que coinciden con "${normalizedQuery}".`
        : "Seleccion de objetos y textiles para hogar y decoracion curados para DELUAR.",
      products: [],
      categories: getFallbackCategorySummary(),
    };
  }
});

export async function getCategoryCatalogPageData(
  categorySlug: string,
  subcategorySlug = "",
): Promise<CatalogPageData | null> {
  try {
    const [category, products] = await Promise.all([
      sanityFetch<CategoryWithSubcategories | null>(categoryBySlugQuery, { slug: categorySlug }),
      sanityFetch<ProductDocument[]>(productsByCategoryQuery, {
        categorySlug,
        subcategorySlug,
      }),
    ]);

    if (category) {
      const matchedSubcategory = subcategorySlug
        ? category.subcategories?.find((item) => item.slug.current === subcategorySlug)
        : undefined;

      return {
        title: matchedSubcategory ? matchedSubcategory.title : category.title,
        description:
          matchedSubcategory?.description ||
          category.description ||
          "Coleccion curada para explorar productos por categoria.",
        products: products.map(mapProductToCatalogCard),
        categories: [mapCategoryToSummary(category)],
      };
    }
  } catch {
    // Fall through to local fallback.
  }

  const fallbackCategory = getFallbackCategory(categorySlug);

  if (!fallbackCategory) {
    return null;
  }

  const fallbackSubcategory = subcategorySlug
    ? getFallbackSubcategory(categorySlug, subcategorySlug)
    : undefined;

  return {
    title: fallbackSubcategory?.label || fallbackCategory.label,
    description:
      "Esta categoria ya esta preparada para consumir productos reales desde Sanity.",
    products: [],
    categories: [getFallbackCategorySummary().find((item) => item.slug === categorySlug)!],
  };
}

export const getProductDetailData = cache(
  async (slug: string): Promise<ProductDetailData | null> => {
    try {
      const product = await sanityFetch<ProductDocument | null>(productBySlugQuery, {
        slug,
      });

      if (!product) {
        return null;
      }

      const relatedProducts = await sanityFetch<ProductDocument[]>(
        relatedProductsByCategoryQuery,
        {
          categorySlug: product.category.slug.current,
          slug,
        },
      );

      return mapProductToDetail(product, relatedProducts);
    } catch {
      return null;
    }
  },
);
