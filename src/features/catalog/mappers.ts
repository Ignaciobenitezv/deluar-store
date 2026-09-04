import { getSanityImageUrl } from "@/integrations/sanity/image";
import { buildCatalogHref } from "@/features/catalog/hierarchy";
import { normalizeProductLogistics } from "@/features/catalog/logistics";
import { normalizeProductVariants } from "@/features/catalog/variant-normalizer";
import { resolveProductCommercialDisplay } from "@/features/catalog/product-commercial-display";
import { logger } from "@/lib/logger";
import type {
  CatalogCategorySummary,
  CatalogProductCard,
  ProductDetailData,
} from "@/features/catalog/types";
import type { ProductDocument, Slug } from "@/types/cms";

type CategorySummarySource = {
  _id: string;
  title: string;
  slug: Slug;
  description?: string;
};

export function mapProductToCatalogCard(product: ProductDocument): CatalogProductCard {
  const commercial = resolveProductCommercialDisplay(product);
  const categorySlug = product.category.slug.current;
  const productSlug = product.slug.current;

  logger.debug("storefront.product_visibility", {
    id: product._id,
    slug: productSlug,
    isActive: product.isActive,
    rev: product._rev,
  });

  return {
    id: product._id,
    title: product.title,
    slug: productSlug,
    shortDescription: product.shortDescription,
    basePrice: commercial.basePrice,
    transferPrice: commercial.transferPrice,
    pricePrefix: commercial.pricePrefix,
    stock: commercial.stock,
    logistics: normalizeProductLogistics(product.logistics),
    imageUrl: commercial.imageUrl,
    imageAlt: commercial.imageAlt,
    hoverImageUrl: commercial.hoverImageUrl,
    hoverImageAlt: commercial.hoverImageAlt,
    images: commercial.images,
    categorySlug,
    categoryTitle: product.category.title,
    subcategorySlug: product.subcategory?.slug.current,
    productHref: `/productos/detalle/${productSlug}`,
    hasSelectableOptions: commercial.hasSelectableOptions,
  };
}

export function mapCategoryToSummary(category: CategorySummarySource): CatalogCategorySummary {
  return {
    id: category._id,
    title: category.title,
    slug: category.slug.current,
    description: category.description,
    href: buildCatalogHref([category.slug.current]),
  };
}

function extractPortableTextParagraphs(value: unknown[] | undefined) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((block) => {
      if (
        typeof block === "object" &&
        block !== null &&
        "children" in block &&
        Array.isArray(block.children)
      ) {
        return block.children
          .map((child) =>
            typeof child === "object" && child !== null && "text" in child
              ? String(child.text ?? "")
              : "",
          )
          .join("")
          .trim();
      }

      return "";
    })
    .filter(Boolean);
}

export function mapProductToDetail(
  product: ProductDocument,
  relatedProducts: ProductDocument[] = [],
): ProductDetailData {
  const primaryImage = product.images?.[0];
  const variants = normalizeProductVariants(product);

  return {
    id: product._id,
    title: product.title,
    slug: product.slug.current,
    shortDescription: product.shortDescription,
    description: extractPortableTextParagraphs(product.description),
    basePrice: product.basePrice,
    transferPrice: product.transferPrice,
    stock: product.stock,
    logistics: normalizeProductLogistics(product.logistics),
    categoryTitle: product.category.title,
    categorySlug: product.category.slug.current,
    subcategoryTitle: product.subcategory?.title,
    attributes: (product.attributes ?? []).map((attribute) => ({
      label: attribute.label,
      value: attribute.value,
    })),
    images: (product.images ?? []).map((image) => ({
      url: getSanityImageUrl(image, 1200, 1500),
      alt: image.alt || product.title,
    })),
    primaryImageUrl: getSanityImageUrl(primaryImage, 1200, 1500),
    primaryImageAlt: primaryImage?.alt || product.title,
    variants,
    productHref: `/productos/detalle/${product.slug.current}`,
    relatedProducts: relatedProducts.map(mapProductToCatalogCard),
  };
}
