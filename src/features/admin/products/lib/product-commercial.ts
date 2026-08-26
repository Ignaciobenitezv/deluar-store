import { normalizeProductVariants } from "@/features/catalog/variant-normalizer";
import type { ProductDocument } from "@/types/cms";

type ProductCommercialVariantSource = Pick<
  ProductDocument,
  "basePrice" | "images" | "stock" | "title" | "transferPrice" | "variants" | "colorVariants"
>;

export function buildProductCommercialVariantInput(product: ProductCommercialVariantSource) {
  return {
    title: product.title,
    basePrice: product.basePrice,
    transferPrice: product.transferPrice,
    stock: product.stock,
    images: product.images,
    variants: product.variants,
    colorVariants: product.colorVariants,
  };
}

export function hasProductVariants(product: ProductCommercialVariantSource) {
  return normalizeProductVariants(buildProductCommercialVariantInput(product) as ProductDocument).length > 0;
}
