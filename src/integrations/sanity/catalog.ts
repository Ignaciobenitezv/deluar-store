import { cache } from "react";
import { unstable_noStore as noStore } from "next/cache";
import { storefrontNavigation } from "@/config/navigation/storefront-navigation";
import {
  mapCategoryToSummary,
  mapProductToCatalogCard,
  mapProductToDetail,
} from "@/features/catalog/mappers";
import {
  normalizeProductVariants,
} from "@/features/catalog/variant-normalizer";
import type {
  CatalogCategorySummary,
  CatalogPageData,
  CatalogSort,
  ProductDetailData,
} from "@/features/catalog/types";
import {
  buildCatalogHref,
  resolveCatalogHierarchy,
  type CatalogHierarchyNode,
} from "@/features/catalog/hierarchy";
import { paginateCatalogItems } from "@/features/catalog/pagination";
import { sanityFetch, sanityFreshFetch } from "@/integrations/sanity/client";
import {
  allProductsQuery,
  categoryBySlugQuery,
  categoryTreeQuery,
  catalogProductsByHierarchyQuery,
  productBySlugQuery,
  relatedProductFallbackGroupsQuery,
  searchProductsQuery,
} from "@/integrations/sanity/queries";
import type { ProductDocument } from "@/types/cms";

type CategoryWithSubcategories = CatalogHierarchyNode;

type CatalogFilters = {
  q?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  color?: string;
  sort?: CatalogSort;
  page?: number;
  perPage?: number;
};

type RelatedProductFallbackGroups = {
  sameCategory?: ProductDocument[];
  featured?: ProductDocument[];
  fallback?: ProductDocument[];
};

const RELATED_PRODUCTS_LIMIT = 4;

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
  type FallbackNode = {
    label: string;
    href: string;
    cmsKey?: string;
    items?: FallbackNode[];
  };

  function findSubcategory(nodes: FallbackNode[], slug: string): FallbackNode | undefined {
    for (const node of nodes) {
      if (node.cmsKey === slug) {
        return node;
      }

      const nestedMatch = node.items?.length ? findSubcategory(node.items, slug) : undefined;

      if (nestedMatch) {
        return nestedMatch;
      }
    }

    return undefined;
  }

  return findSubcategory(
    storefrontNavigation.categories.filter((category) => category.cmsKey === categorySlug),
    subcategorySlug,
  );
}

function mapHierarchyNodeToSummary(
  node: CatalogHierarchyNode,
  pathSegments: string[],
): CatalogCategorySummary {
  return {
    id: node._id,
    title: node.title,
    slug: node.slug.current,
    description: node.description,
    href: buildCatalogHref(pathSegments),
  };
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
    const hasColorVariant = normalizeProductVariants(product).some((variant) => {
      const tokens = [
        variant.title,
        variant.value,
        ...variant.attributes.map((attribute) => attribute.name),
        ...variant.attributes.map((attribute) => attribute.value),
      ]
        .map((token) => token.trim().toLowerCase())
        .filter(Boolean);

      return tokens.some((token) => token === normalizedColor);
    });

    if (!hasColorVariant) {
      return false;
    }
  }

  return true;
}

function sortProducts(products: ProductDocument[], sort?: CatalogSort) {
  const sortedProducts = [...products];

  switch (sort) {
    case "price-asc":
      sortedProducts.sort((left, right) => left.basePrice - right.basePrice);
      break;
    case "price-desc":
      sortedProducts.sort((left, right) => right.basePrice - left.basePrice);
      break;
    case "title-asc":
      sortedProducts.sort((left, right) => left.title.localeCompare(right.title, "es"));
      break;
    case "title-desc":
      sortedProducts.sort((left, right) => right.title.localeCompare(left.title, "es"));
      break;
    case "oldest":
      sortedProducts.sort(
        (left, right) =>
          new Date(left._createdAt).getTime() - new Date(right._createdAt).getTime(),
      );
      break;
    case "newest":
      sortedProducts.sort(
        (left, right) =>
          new Date(right._createdAt).getTime() - new Date(left._createdAt).getTime(),
      );
      break;
    case "best-selling":
    default:
      break;
  }

  return sortedProducts;
}

function mergeRelatedProductFallbacks(groups: RelatedProductFallbackGroups) {
  const relatedProducts: ProductDocument[] = [];
  const seenIds = new Set<string>();
  const seenSlugs = new Set<string>();

  for (const product of [
    ...(groups.sameCategory ?? []),
    ...(groups.featured ?? []),
    ...(groups.fallback ?? []),
  ]) {
    const slug = product.slug?.current;

    if (
      !slug ||
      product.stock <= 0 ||
      product.isActive === false ||
      seenIds.has(product._id) ||
      seenSlugs.has(slug)
    ) {
      continue;
    }

    relatedProducts.push(product);
    seenIds.add(product._id);
    seenSlugs.add(slug);

    if (relatedProducts.length >= RELATED_PRODUCTS_LIMIT) {
      break;
    }
  }

  return relatedProducts;
}

export const getCatalogPageData = cache(async (filters: CatalogFilters = {}): Promise<CatalogPageData> => {
  const normalizedQuery = filters.q?.trim() ?? "";
  const searchPattern = `*${normalizedQuery}*`;

  try {
    const [products, categories] = await Promise.all([
      sanityFreshFetch<ProductDocument[]>(
        normalizedQuery ? searchProductsQuery : allProductsQuery,
        normalizedQuery ? { q: normalizedQuery, pattern: searchPattern } : {},
      ),
      sanityFetch<CategoryWithSubcategories[]>(categoryTreeQuery),
    ]);
    const filteredProducts = products.filter((product) => matchesCatalogFilters(product, filters));
    const sortedProducts = sortProducts(filteredProducts, filters.sort);
    const paginatedProducts = paginateCatalogItems(sortedProducts, filters.page, filters.perPage);

      return {
        title: normalizedQuery ? `Resultados para: ${normalizedQuery}` : "Productos",
        description: normalizedQuery
          ? `Productos de DELUAR que coinciden con "${normalizedQuery}".`
          : "Explora el catalogo de DELUAR con textiles, bazar y decoracion para el hogar.",
        childCategories: [],
        subcategoryTreeRoot: undefined,
        products: paginatedProducts.items.map(mapProductToCatalogCard),
        categories: categories.length
          ? categories.map(mapCategoryToSummary)
          : getFallbackCategorySummary(),
      pagination: paginatedProducts.pagination,
    };
  } catch {
    const paginatedProducts = paginateCatalogItems([], filters.page, filters.perPage);

      return {
        title: normalizedQuery ? `Resultados para: ${normalizedQuery}` : "Productos",
        description: normalizedQuery
          ? `Productos de DELUAR que coinciden con "${normalizedQuery}".`
          : "Explora el catalogo de DELUAR con textiles, bazar y decoracion para el hogar.",
        childCategories: [],
        subcategoryTreeRoot: undefined,
        products: [],
        categories: getFallbackCategorySummary(),
        pagination: paginatedProducts.pagination,
      };
  }
});

export async function getCategoryCatalogPageData(
  categorySlug: string,
  subcategorySlugs: string[] = [],
  filters: CatalogFilters = {},
): Promise<CatalogPageData | null> {
  try {
    const category = await sanityFetch<CategoryWithSubcategories | null>(categoryBySlugQuery, {
      slug: categorySlug,
    });

    if (category) {
      const resolution = resolveCatalogHierarchy([category], categorySlug, subcategorySlugs);

      if (!resolution) {
        return null;
      }

      const products = await sanityFreshFetch<ProductDocument[]>(catalogProductsByHierarchyQuery, {
        categorySlug,
        includeRootProducts: resolution.depth === 0,
        subcategoryIds: resolution.depth === 0
          ? resolution.descendantIds
          : [resolution.currentNode._id, ...resolution.descendantIds],
      });

      const filteredProducts = products.filter((product) => matchesCatalogFilters(product, filters));
      const sortedProducts = sortProducts(filteredProducts, filters.sort);
      const paginatedProducts = paginateCatalogItems(sortedProducts, filters.page, filters.perPage);

      return {
        title: resolution.currentNode.title,
        description:
          resolution.currentNode.description ||
          resolution.rootCategory.description ||
          "Coleccion curada para explorar productos por categoria.",
        childCategories: (resolution.currentNode.subcategories ?? []).map((child) =>
          mapHierarchyNodeToSummary(child, [...resolution.pathSegments, child.slug.current]),
        ),
        subcategoryTreeRoot: resolution.rootCategory,
        products: paginatedProducts.items.map(mapProductToCatalogCard),
        categories: [mapCategoryToSummary(category)],
        pagination: paginatedProducts.pagination,
      };
    }
  } catch {
    // Fall through to local fallback.
  }

  const fallbackCategory = getFallbackCategory(categorySlug);

  if (!fallbackCategory) {
    return null;
  }

  const fallbackSubcategory = subcategorySlugs.at(-1)
    ? getFallbackSubcategory(categorySlug, subcategorySlugs.at(-1)!)
    : undefined;

  return {
    title: fallbackSubcategory?.label || fallbackCategory.label,
    description:
      "Explora esta categoria de DELUAR y sus productos destacados.",
    childCategories: [],
    subcategoryTreeRoot: undefined,
    products: [],
    categories: [getFallbackCategorySummary().find((item) => item.slug === categorySlug)!],
    pagination: paginateCatalogItems([], filters.page, filters.perPage).pagination,
  };
}

export const getProductDetailData = cache(
  async (slug: string): Promise<ProductDetailData | null> => {
    noStore();

    try {
      const product = await sanityFreshFetch<ProductDocument | null>(productBySlugQuery, {
        slug,
      });

      if (!product) {
        return null;
      }

      const relatedProductGroups = await sanityFreshFetch<RelatedProductFallbackGroups>(
        relatedProductFallbackGroupsQuery,
        {
          categorySlug: product.category?.slug.current ?? "",
          slug,
        },
      );
      const relatedProducts = mergeRelatedProductFallbacks(relatedProductGroups);

      return mapProductToDetail(product, relatedProducts);
    } catch {
      return null;
    }
  },
);
