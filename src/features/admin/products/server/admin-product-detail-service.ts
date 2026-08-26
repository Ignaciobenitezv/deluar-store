import crypto from "node:crypto";
import { unstable_noStore as noStore } from "next/cache";
import { getSanityImageUrl } from "@/integrations/sanity/image";
import { sanityFetch } from "@/integrations/sanity/client";
import { adminProductDetailQuery } from "@/integrations/sanity/admin-queries";
import { categoryTreeQuery } from "@/integrations/sanity/queries";
import { logger } from "@/lib/logger";
import type { SanityImageWithAlt } from "@/types/cms";
import type { ProductColorVariantDocument, ProductVariantDocument } from "@/types/cms";
import { ADMIN_LOW_STOCK_THRESHOLD } from "../lib/product-filters";
import { resolveAdminProductSlugValue } from "../lib/product-slug";
import { normalizeAdminProductVariants } from "../lib/variant-editor";
import type { CatalogHierarchyNode } from "@/features/catalog/hierarchy";
import type { AdminProductDetailData, AdminProductImageData } from "../types";

type AdminProductImageQueryItem = SanityImageWithAlt & {
  _key?: string;
};

type SanityReferenceLike =
  | {
      _id?: string;
      _ref?: string;
    }
  | string
  | null
  | undefined;

type AdminProductDetailQueryItem = {
  _id: string;
  _rev: string;
  _updatedAt: string;
  title: string;
  slug?: string;
  shortDescription: string;
  description: unknown[];
  basePrice: number;
  transferPrice?: number;
  stock: number;
  isActive?: boolean;
  isFeatured?: boolean;
  isOnOffer?: boolean;
  showInNewIn?: boolean;
  newInOrder?: number;
  seo?: {
    title?: string;
    description?: string;
  };
  images?: SanityImageWithAlt[];
  category?: {
    _id: string;
    title?: string;
    slug?: string;
  };
  subcategory?: {
    _id: string;
    title?: string;
    slug?: string;
  };
  variantCount?: number;
  variants?: ProductVariantDocument[];
  colorVariants?: ProductColorVariantDocument[];
};

export type AdminProductDetailPageData = {
  product: AdminProductDetailData;
  categoryTree: CatalogHierarchyNode[];
};

function formatUnitsLabel(value: number) {
  return `${value} unidades`;
}

function resolveStockSummary(product: AdminProductDetailQueryItem, variantCount: number) {
  const stockValue = Number.isFinite(product.stock) ? product.stock : 0;

  if (variantCount > 0) {
    return {
      stockLabel: variantCount === 1 ? "1 variante" : `${variantCount} variantes`,
      stockTone: "neutral" as const,
    };
  }

  if (stockValue <= 0) {
    return {
      stockLabel: "Sin stock",
      stockTone: "danger" as const,
    };
  }

  return {
    stockLabel: formatUnitsLabel(stockValue),
    stockTone: stockValue <= ADMIN_LOW_STOCK_THRESHOLD ? ("warning" as const) : ("success" as const),
  };
}

function normalizeProductImages(images: AdminProductImageQueryItem[] | undefined): AdminProductImageData[] {
  return (images ?? [])
    .flatMap((image) => {
      const assetRef = image.image.asset?._ref;

      if (!assetRef) {
        return [];
      }

      return [
        {
          key: image._key?.trim() || crypto.randomUUID(),
          alt: image.alt?.trim() || "",
          url: getSanityImageUrl(image, 640, 640),
          assetRef,
        },
      ];
    });
}

function resolveReferenceId(value: SanityReferenceLike) {
  if (typeof value === "string") {
    return value;
  }

  if (!value || typeof value !== "object") {
    return "";
  }

  return value._id ?? value._ref ?? "";
}

export function normalizeProductDetail(product: AdminProductDetailQueryItem): AdminProductDetailData {
  const normalizedVariants = normalizeAdminProductVariants({
    variants: product.variants ?? null,
    colorVariants: product.colorVariants ?? null,
  });
  const variantCount = normalizedVariants.variants.length;
  const stockSummary = resolveStockSummary(product, variantCount);
  const images = normalizeProductImages(product.images);
  const primaryImage = images[0] ?? null;

  return {
    id: product._id,
    rev: product._rev,
    updatedAt: product._updatedAt,
    title: product.title,
    slug: resolveAdminProductSlugValue(product.slug) || product._id,
    shortDescription: product.shortDescription,
    description: product.description ?? [],
    imageUrl: primaryImage?.url ?? null,
    imageAlt: primaryImage?.alt?.trim() || product.title,
    images,
    categoryId: resolveReferenceId(product.category),
    categoryLabel: product.category?.title?.trim() || "Sin categoría",
    categorySlug: product.category?.slug ?? "",
    subcategoryId: resolveReferenceId(product.subcategory) || null,
    subcategoryLabel: product.subcategory?.title?.trim() || null,
    subcategorySlug: product.subcategory?.slug ?? null,
    basePrice: product.basePrice,
    transferPrice: typeof product.transferPrice === "number" ? product.transferPrice : null,
    stock: Number.isFinite(product.stock) ? product.stock : 0,
    stockLabel: stockSummary.stockLabel,
    stockTone: stockSummary.stockTone,
    variantLabel: variantCount > 0 ? `${variantCount} variantes` : "Sin variantes",
    variantCount,
    hasVariants: variantCount > 0,
    variantSource: normalizedVariants.source,
    legacyColorVariantCount: normalizedVariants.legacyColorVariantCount,
    variants: normalizedVariants.variants,
    visible: product.isActive !== false,
    isFeatured: product.isFeatured === true,
    isOnOffer: product.isOnOffer === true,
    showInNewIn: product.showInNewIn === true,
    newInOrder: typeof product.newInOrder === "number" ? product.newInOrder : null,
    seoTitle: product.seo?.title?.trim() || "",
    seoDescription: product.seo?.description?.trim() || "",
  };
}

export async function getAdminProductDetailPageData(
  productId: string,
): Promise<AdminProductDetailPageData | null> {
  noStore();

  const [product, categoryTree] = await Promise.all([
    sanityFetch<AdminProductDetailQueryItem | null>(
      adminProductDetailQuery,
      { productId },
      { useToken: true },
    ),
    sanityFetch<CatalogHierarchyNode[]>(categoryTreeQuery, {}, { useToken: true }),
  ]);

  if (!product) {
    return null;
  }

  logger.debug("admin.products.detail.fetched", {
    productId,
    fetchedProductId: product._id,
    rev: product._rev,
    updatedAt: product._updatedAt,
    images: product.images?.length ?? 0,
  });

  return {
    product: normalizeProductDetail(product),
    categoryTree,
  };
}
