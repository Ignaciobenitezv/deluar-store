import { getSanityImageUrl, TIENDANUBE_PLACEHOLDER_IMAGE_ASSET_REF } from "@/integrations/sanity/image";
import { resolveProductCommercialDisplay } from "@/features/catalog/product-commercial-display";
import { formatDashboardPrice } from "@/features/admin/dashboard/lib/dashboard-formatters";
import { ADMIN_LOW_STOCK_THRESHOLD } from "./product-filters";
import type { AdminProductListItem, AdminProductStockEditItem } from "../types";
import type { SanityImageWithAlt } from "@/types/cms";

export type AdminProductItemSource = {
  _id: string;
  _rev: string;
  _updatedAt: string;
  title: string;
  slug?: string | null;
  shortDescription?: string;
  basePrice: number;
  transferPrice?: number | null;
  stock: number;
  isActive?: boolean;
  isOnOffer?: boolean;
  showInNewIn?: boolean;
  newInOrder?: number | null;
  // Raw, unprojected `images` field (see `adminProductProjection`) — the
  // real nested shape is `{ alt?, image: { asset: { _ref } } }`, matching
  // `SanityImageWithAlt` exactly.
  images?: SanityImageWithAlt[];
  category?: {
    _id: string;
    title?: string;
    slug?: string | null;
  } | null;
  subcategory?: {
    _id: string;
    title?: string;
    slug?: string | null;
  } | null;
  variants?: Array<{
    _key?: string;
    title?: string;
    value?: string;
    stock?: number;
    isActive?: boolean;
    basePrice?: number;
    transferPrice?: number;
  }>;
  colorVariants?: Array<{
    _key?: string;
    title?: string;
    value?: string;
    stock?: number;
    isActive?: boolean;
    basePrice?: number;
    transferPrice?: number;
  }>;
};

function normalizeStock(value: number | undefined) {
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value ?? 0)) : 0;
}

function buildFallbackStockKey(source: "variants" | "colorVariants", index: number, title?: string, value?: string) {
  const normalizedTitle = (title ?? "").trim();
  const normalizedValue = (value ?? "").trim();
  const basis = normalizedValue || normalizedTitle || `variant-${index + 1}`;

  return `${source}-${index + 1}-${basis}`;
}

function buildStockItems(product: AdminProductItemSource): AdminProductStockEditItem[] {
  const variantSource = product.variants && product.variants.length > 0
    ? ("variants" as const)
    : product.colorVariants && product.colorVariants.length > 0
      ? ("colorVariants" as const)
      : null;

  const stockItems: AdminProductStockEditItem[] = [
    {
      key: "base",
      label: "Producto base / Normal",
      stock: normalizeStock(product.stock),
      kind: "base",
    },
  ];

  if (!variantSource) {
    return stockItems;
  }

  const variants = variantSource === "variants" ? product.variants ?? [] : product.colorVariants ?? [];

  for (const [index, variant] of variants.entries()) {
    stockItems.push({
      key: variant._key?.trim() || buildFallbackStockKey(variantSource, index, variant.title, variant.value),
      label: (variant.title?.trim() || variant.value?.trim() || `Variante ${index + 1}`),
      stock: normalizeStock(variant.stock),
      kind: "variant",
      isActive: variant.isActive,
    });
  }

  return stockItems;
}

/**
 * Same "real photo" criterion as the Con foto / Sin foto catalog filter
 * (buildAdminProductsFilterClause in admin-products-service.ts) — an image
 * counts as real when its asset ref is defined and isn't the Tiendanube
 * placeholder. Prefers the first real photo for the row thumbnail; falls
 * back to the placeholder itself only when that's genuinely the only entry,
 * and to `null` (→ the "Sin imagen" placeholder box) when there are none at
 * all. Never reorders or mutates `images` — this only decides which single
 * entry the thumbnail reads from.
 */
function pickAdminProductThumbnail(images: SanityImageWithAlt[] | undefined): SanityImageWithAlt | null {
  if (!images || images.length === 0) {
    return null;
  }

  const realImage = images.find(
    (image) => image.image?.asset?._ref && image.image.asset._ref !== TIENDANUBE_PLACEHOLDER_IMAGE_ASSET_REF,
  );

  return realImage ?? images[0];
}

function buildCommercialSummary(product: AdminProductItemSource) {
  const commercialDisplay = resolveProductCommercialDisplay({
    basePrice: product.basePrice,
    images: (product.images ?? []) as never,
    stock: product.stock,
    title: product.title,
    transferPrice: product.transferPrice ?? undefined,
    variants: (product.variants ?? []) as never,
    colorVariants: (product.colorVariants ?? []) as never,
  });

  const totalStock = Math.max(0, Math.trunc(commercialDisplay.stock ?? 0));
  const hasSelectableOptions = commercialDisplay.hasSelectableOptions;

  return {
    variantCount: commercialDisplay.variants.length,
    stockValue: totalStock,
    stockLabel: totalStock <= 0 ? "Sin stock" : `${totalStock} unidades`,
    stockHint: hasSelectableOptions
      ? "Stock total con variantes"
      : totalStock > 0 && totalStock <= ADMIN_LOW_STOCK_THRESHOLD
        ? "Stock bajo"
        : undefined,
    stockTone:
      totalStock <= 0
        ? ("danger" as const)
        : totalStock <= ADMIN_LOW_STOCK_THRESHOLD
          ? ("warning" as const)
          : ("success" as const),
    priceLabel: hasSelectableOptions
      ? `${commercialDisplay.pricePrefix ? `${commercialDisplay.pricePrefix} ` : ""}${formatDashboardPrice(commercialDisplay.basePrice)}`
      : formatDashboardPrice(product.basePrice),
    priceHint: hasSelectableOptions
      ? undefined
      : typeof product.transferPrice === "number"
        ? `Transferencia: ${formatDashboardPrice(product.transferPrice)}`
        : "Sin precio por transferencia",
  };
}

export function mapAdminProductListItem(product: AdminProductItemSource): AdminProductListItem {
  const commercialSummary = buildCommercialSummary(product);
  const thumbnail = pickAdminProductThumbnail(product.images);
  const variantSource =
    product.variants && product.variants.length > 0
      ? "variants"
      : product.colorVariants && product.colorVariants.length > 0
        ? "colorVariants"
        : null;

  return {
    id: product._id,
    rev: product._rev,
    updatedAt: product._updatedAt,
    title: product.title,
    slug: product.slug ?? "",
    shortDescription: product.shortDescription,
    imageUrl: thumbnail ? getSanityImageUrl(thumbnail, 640, 640) : null,
    imageAlt: product.title,
    categoryLabel: product.category?.title ?? "Sin categoría",
    categorySlug: product.category?.slug ?? null,
    subcategoryLabel: product.subcategory?.title ?? null,
    subcategorySlug: product.subcategory?.slug ?? null,
    basePrice: product.basePrice,
    transferPrice: product.transferPrice ?? null,
    priceLabel: commercialSummary.priceLabel,
    priceHint: commercialSummary.priceHint,
    stockLabel: commercialSummary.stockLabel,
    stockHint: commercialSummary.stockHint,
    stockTone: commercialSummary.stockTone,
    stockValue: commercialSummary.stockValue,
    stockItems: buildStockItems(product),
    variantLabel: commercialSummary.variantCount > 0 ? `${commercialSummary.variantCount} variantes` : "Sin variantes",
    variantCount: commercialSummary.variantCount,
    hasVariants: commercialSummary.variantCount > 0,
    variantSource,
    visible: product.isActive !== false,
    isOnOffer: product.isOnOffer === true,
    showInNewIn: product.showInNewIn === true,
    newInOrder: typeof product.newInOrder === "number" ? product.newInOrder : null,
  };
}
