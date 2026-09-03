import { getSanityImageUrl } from "@/integrations/sanity/image";
import { normalizeProductLogistics, type ProductLogistics } from "@/features/catalog/logistics";
import type {
  ProductDetailImage,
  ProductVariantAttribute,
  ProductVariantViewModel,
} from "@/features/catalog/types";
import type {
  ProductColorVariantDocument,
  ProductDocument,
  ProductVariantDocument,
  SanityImageWithAlt,
} from "@/types/cms";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function buildImage(
  source: SanityImageWithAlt | undefined,
  width: number,
  height: number,
  fallbackAlt: string,
): ProductDetailImage | null {
  if (!source) {
    return null;
  }

  return {
    url: getSanityImageUrl(source, width, height),
    alt: source.alt || fallbackAlt,
  };
}

function buildVariantImages(
  images: SanityImageWithAlt[] | undefined,
  productTitle: string,
  variantTitle: string,
) {
  return (images ?? []).map((image) => ({
    url: getSanityImageUrl(image, 1200, 1500),
    alt: image.alt || `${productTitle} ${variantTitle}`,
  }));
}

function summarizeAttributes(attributes: ProductVariantAttribute[]) {
  return attributes.map((attribute) => `${attribute.name}: ${attribute.value}`).join(" | ");
}

function buildVariantViewModel(input: {
  id: string;
  title: string;
  value: string;
  attributes: ProductVariantAttribute[];
  isActive: boolean;
  basePrice: number;
  transferPrice?: number;
  stock: number;
  logistics?: ProductLogistics | null;
  images: ProductDetailImage[];
  thumbnail: ProductDetailImage | null;
  primaryImageAlt: string;
  sku?: string;
}): ProductVariantViewModel {
  const primaryImage = input.images[0] ?? null;

  return {
    id: input.id,
    title: input.title,
    value: input.value,
    attributes: input.attributes,
    attributeSummary: summarizeAttributes(input.attributes),
    isActive: input.isActive,
    basePrice: input.basePrice,
    transferPrice: input.transferPrice,
    stock: input.stock,
    logistics: input.logistics ?? null,
    images: input.images,
    primaryImageUrl: primaryImage?.url ?? null,
    primaryImageAlt: primaryImage?.alt ?? input.primaryImageAlt,
    thumbnailUrl: input.thumbnail?.url ?? primaryImage?.url ?? null,
    thumbnailAlt: input.thumbnail?.alt ?? primaryImage?.alt ?? input.primaryImageAlt,
    sku: input.sku,
  };
}

function mapLegacyColorVariant(
  variant: ProductColorVariantDocument,
  product: Pick<ProductDocument, "basePrice" | "images" | "stock" | "title" | "transferPrice">,
): ProductVariantViewModel {
  const title = variant.title.trim();
  const value = isNonEmptyString(variant.value) ? variant.value : title;
  const images = buildVariantImages(variant.images, product.title, title);
  const primaryImage = variant.images?.[0] ?? product.images?.[0];
  const thumbnailSource = variant.thumbnail ? primaryImage : undefined;

  return buildVariantViewModel({
    id: variant._key || variant.value || title,
    title,
    value,
    attributes: [{ name: "Color", value }],
    isActive: true,
    basePrice: variant.basePrice ?? product.basePrice,
    transferPrice: variant.transferPrice ?? product.transferPrice,
    stock: variant.stock ?? product.stock,
    logistics: null,
    images: images.length > 0 ? images : buildVariantImages(product.images, product.title, title),
    thumbnail: buildImage(
      thumbnailSource,
      320,
      400,
      `${product.title} ${title}`,
    ),
    primaryImageAlt: primaryImage?.alt || `${product.title} ${title}`,
    sku: variant.sku,
  });
}

function mapGenericVariant(
  variant: ProductVariantDocument,
  product: Pick<ProductDocument, "basePrice" | "images" | "stock" | "title" | "transferPrice">,
): ProductVariantViewModel {
  const title = variant.title.trim();
  const value = variant.value.trim();
  const images = buildVariantImages(variant.images, product.title, title);
  const primaryImage = variant.images?.[0] ?? product.images?.[0];
  const thumbnailSource = primaryImage ?? undefined;

  return buildVariantViewModel({
    id: variant._key || value,
    title,
    value,
    attributes: (variant.attributes ?? [])
      .filter((attribute) => isNonEmptyString(attribute?.name) && isNonEmptyString(attribute?.value))
      .map((attribute) => ({
        name: attribute.name,
        value: attribute.value,
      })),
    isActive: variant.isActive !== false,
    basePrice: variant.basePrice ?? product.basePrice,
    transferPrice: variant.transferPrice ?? product.transferPrice,
    stock: variant.stock ?? product.stock,
    logistics: normalizeProductLogistics(variant.logistics),
    images: images.length > 0 ? images : buildVariantImages(product.images, product.title, title),
    thumbnail: buildImage(thumbnailSource, 320, 400, `${product.title} ${title}`),
    primaryImageAlt: primaryImage?.alt || `${product.title} ${title}`,
    sku: variant.sku,
  });
}

export function formatVariantAttributeSummary(attributes: ProductVariantAttribute[]) {
  return summarizeAttributes(attributes);
}

export function normalizeProductVariants(
  product: Pick<
    ProductDocument,
    "basePrice" | "images" | "stock" | "title" | "transferPrice" | "variants" | "colorVariants"
  >,
) {
  const hasGenericVariants = (product.variants ?? []).length > 0;
  const source = (hasGenericVariants ? product.variants : product.colorVariants) ?? [];

  const normalizedVariants = source
    .map((variant) =>
      hasGenericVariants
        ? mapGenericVariant(variant as ProductVariantDocument, product)
        : mapLegacyColorVariant(variant as ProductColorVariantDocument, product),
    )
    .filter((variant) => variant.isActive && isNonEmptyString(variant.id));

  return normalizedVariants;
}

export function hasSelectableProductVariants(
  product: Pick<
    ProductDocument,
    "basePrice" | "images" | "stock" | "title" | "transferPrice" | "variants" | "colorVariants"
  >,
) {
  return normalizeProductVariants(product).length > 0;
}
