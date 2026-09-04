import { getSanityImageUrl } from "@/integrations/sanity/image";
import type { ProductDocument } from "@/types/cms";
import { normalizeProductVariants } from "@/features/catalog/variant-normalizer";
import type { ProductDetailImage, ProductVariantViewModel } from "@/features/catalog/types";

type ProductCommercialSource = Pick<
  ProductDocument,
  "basePrice" | "images" | "stock" | "title" | "transferPrice" | "variants" | "colorVariants"
>;

export type ProductCommercialDisplay = {
  hasSelectableOptions: boolean;
  hasStock: boolean;
  stock: number;
  basePrice: number;
  transferPrice?: number;
  pricePrefix?: string | null;
  imageUrl: string | null;
  imageAlt: string;
  hoverImageUrl?: string | null;
  hoverImageAlt?: string;
  images: ProductDetailImage[];
  representativeVariant: ProductVariantViewModel | null;
  variants: ProductVariantViewModel[];
};

function getPositiveInteger(value: number | undefined | null) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function uniqueNumbers(values: Array<number | null>) {
  return [...new Set(values.filter((value): value is number => typeof value === "number" && Number.isFinite(value)))];
}

export function getInitialProductVariantId(variants: ProductVariantViewModel[]) {
  const firstInStockVariant = variants.find((variant) => variant.stock > 0);

  return firstInStockVariant?.id ?? variants[0]?.id ?? null;
}

export function resolveProductCommercialDisplay(product: ProductCommercialSource): ProductCommercialDisplay {
  const variants = normalizeProductVariants(product);
  const hasSelectableOptions = variants.length > 0;
  const representativeVariant =
    variants.find((variant) => variant.stock > 0) ?? variants[0] ?? null;
  const productImages = (product.images ?? [])
    .map((image) => ({
      url: getSanityImageUrl(image, 1200, 1500),
      alt: image.alt || product.title,
    }))
    .filter((image) => Boolean(image.url));

  if (!hasSelectableOptions) {
    const primaryImage = productImages[0] ?? null;
    const secondaryImage = productImages[1] ?? null;
    const stock = Math.max(0, Math.trunc(product.stock ?? 0));

    return {
      hasSelectableOptions: false,
      hasStock: stock > 0,
      stock,
      basePrice: product.basePrice,
      transferPrice: product.transferPrice,
      pricePrefix: null,
      imageUrl: primaryImage?.url ?? null,
      imageAlt: primaryImage?.alt || product.title,
      hoverImageUrl: secondaryImage?.url ?? null,
      hoverImageAlt: secondaryImage?.alt || product.title,
      images: productImages,
      representativeVariant: null,
      variants,
    };
  }

  const numericPrices = uniqueNumbers([
    getPositiveInteger(product.basePrice),
    ...variants.map((variant) => getPositiveInteger(variant.basePrice)),
  ]);
  const numericTransferPrices = uniqueNumbers([
    getPositiveInteger(product.transferPrice ?? null),
    ...variants.map((variant) => getPositiveInteger(variant.transferPrice ?? null)),
  ]);
  const totalStock =
    Math.max(0, Math.trunc(product.stock ?? 0)) +
    variants.reduce((sum, variant) => sum + Math.max(0, Math.trunc(variant.stock ?? 0)), 0);
  const basePrice = numericPrices.length > 0 ? Math.min(...numericPrices) : product.basePrice;
  const transferPrice =
    numericTransferPrices.length > 0
      ? numericTransferPrices.length === 1
        ? numericTransferPrices[0]
        : Math.min(...numericTransferPrices)
      : product.transferPrice;
  const pricePrefix = numericPrices.length > 1 ? "Desde" : null;
  const imageSource = representativeVariant?.images?.[0] ?? productImages[0] ?? null;
  const hoverSource = representativeVariant?.images?.[1] ?? productImages[1] ?? null;

  return {
    hasSelectableOptions: true,
    hasStock: totalStock > 0,
    stock: totalStock,
    basePrice,
    transferPrice,
    pricePrefix,
    imageUrl: imageSource ? imageSource.url : null,
    imageAlt: imageSource?.alt || representativeVariant?.thumbnailAlt || product.title,
    hoverImageUrl: hoverSource ? hoverSource.url : null,
    hoverImageAlt: hoverSource?.alt || representativeVariant?.thumbnailAlt || product.title,
    images: representativeVariant?.images?.length ? representativeVariant.images : productImages,
    representativeVariant,
    variants,
  };
}
