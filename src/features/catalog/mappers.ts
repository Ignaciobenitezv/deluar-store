import { getSanityImageUrl } from "@/integrations/sanity/image";
import type {
  CatalogCategorySummary,
  CatalogProductCard,
  ProductColorVariant,
  ProductDetailData,
} from "@/features/catalog/types";
import type {
  CategoryDocument,
  ProductColorVariantDocument,
  ProductDocument,
} from "@/types/cms";

export function mapProductToCatalogCard(product: ProductDocument): CatalogProductCard {
  const categorySlug = product.category.slug.current;
  const productSlug = product.slug.current;
  const image = product.images[0];

  return {
    id: product._id,
    title: product.title,
    slug: productSlug,
    shortDescription: product.shortDescription,
    basePrice: product.basePrice,
    transferPrice: product.transferPrice,
    imageUrl: getSanityImageUrl(image),
    imageAlt: image?.alt || product.title,
    categorySlug,
    categoryTitle: product.category.title,
    subcategorySlug: product.subcategory?.slug.current,
    productHref: `/productos/detalle/${productSlug}`,
  };
}

export function mapCategoryToSummary(category: CategoryDocument): CatalogCategorySummary {
  return {
    id: category._id,
    title: category.title,
    slug: category.slug.current,
    description: category.description,
    href: `/productos/${category.slug.current}`,
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

function mapColorVariant(
  variant: ProductColorVariantDocument,
  productTitle: string,
): ProductColorVariant {
  const images = (variant.images ?? []).map((image) => ({
    url: getSanityImageUrl(image, 1200, 1500),
    alt: image.alt || `${productTitle} ${variant.title}`,
  }));
  const primaryImage = variant.images?.[0];
  const thumbnail = variant.thumbnail ?? primaryImage;

  return {
    id: variant._key || variant.value,
    title: variant.title,
    value: variant.value,
    thumbnailUrl: getSanityImageUrl(thumbnail, 320, 400),
    thumbnailAlt: thumbnail?.alt || `${productTitle} ${variant.title}`,
    images,
    primaryImageUrl: getSanityImageUrl(primaryImage, 1200, 1500),
    primaryImageAlt: primaryImage?.alt || `${productTitle} ${variant.title}`,
    sku: variant.sku,
    basePrice: variant.basePrice,
    transferPrice: variant.transferPrice,
    stock: variant.stock,
  };
}

export function mapProductToDetail(
  product: ProductDocument,
  relatedProducts: ProductDocument[] = [],
): ProductDetailData {
  const primaryImage = product.images?.[0];

  return {
    id: product._id,
    title: product.title,
    slug: product.slug.current,
    shortDescription: product.shortDescription,
    description: extractPortableTextParagraphs(product.description),
    basePrice: product.basePrice,
    transferPrice: product.transferPrice,
    stock: product.stock,
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
    colorVariants: (product.colorVariants ?? []).map((variant) =>
      mapColorVariant(variant, product.title),
    ),
    productHref: `/productos/detalle/${product.slug.current}`,
    relatedProducts: relatedProducts.map(mapProductToCatalogCard),
  };
}
