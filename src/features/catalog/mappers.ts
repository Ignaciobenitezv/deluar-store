import { getSanityImageUrl } from "@/integrations/sanity/image";
import type {
  CatalogCategorySummary,
  CatalogProductCard,
  ProductDetailData,
} from "@/features/catalog/types";
import type { CategoryDocument, ProductDocument } from "@/types/cms";

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
    productHref: `/productos/detalle/${product.slug.current}`,
    relatedProducts: relatedProducts.map(mapProductToCatalogCard),
  };
}
