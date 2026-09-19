import { formatDashboardPrice } from "@/features/admin/dashboard/lib/dashboard-formatters";
import { ADMIN_LOW_STOCK_THRESHOLD } from "@/features/admin/products/lib/product-filters";
import { getSanityImageUrl, TIENDANUBE_PLACEHOLDER_IMAGE_ASSET_REF } from "@/integrations/sanity/image";
import type { SanityImageWithAlt } from "@/types/cms";

export type AdminInventoryStockTone = "success" | "warning" | "danger";

export type AdminInventoryStockRow = {
  key: string;
  kind: "base" | "variant";
  label: string;
  /** Real sku field for a variant/colorVariant; always null for the base row
   * — there is no sku field on a simple product in this schema. */
  sku: string | null;
  stock: number;
  isActive: boolean;
};

export type AdminInventoryItem = {
  id: string;
  rev: string;
  title: string;
  slug: string;
  imageUrl: string | null;
  imageAlt: string;
  categoryLabel: string;
  subcategoryLabel: string | null;
  priceLabel: string;
  hasVariants: boolean;
  variantCount: number;
  variantSource: "variants" | "colorVariants" | null;
  /** For a simple product, the base stock. For a variant product, the sum
   * of every variant's stock — the base `stock` field is never added in
   * (matches isProductStockAvailable's rule of ignoring it once variants
   * exist), and is never shown/edited here once there are variants. */
  totalStock: number;
  stockTone: AdminInventoryStockTone;
  rows: AdminInventoryStockRow[];
};

export type AdminInventoryItemSource = {
  _id: string;
  _rev: string;
  title: string;
  slug?: string | null;
  basePrice: number;
  category?: { title?: string } | null;
  subcategory?: { title?: string } | null;
  stock?: number;
  images?: SanityImageWithAlt[];
  variants?: Array<{
    _key?: string;
    title?: string;
    value?: string;
    sku?: string;
    stock?: number;
    isActive?: boolean;
  }>;
  colorVariants?: Array<{
    _key?: string;
    title?: string;
    value?: string;
    sku?: string;
    stock?: number;
  }>;
};

function normalizeStock(value: number | undefined) {
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value ?? 0)) : 0;
}

function resolveStockTone(stock: number): AdminInventoryStockTone {
  if (stock <= 0) return "danger";
  if (stock <= ADMIN_LOW_STOCK_THRESHOLD) return "warning";
  return "success";
}

function buildFallbackRowKey(source: "variants" | "colorVariants", index: number, title?: string, value?: string) {
  const basis = (value ?? "").trim() || (title ?? "").trim() || `variante-${index + 1}`;
  return `${source}-${index + 1}-${basis}`;
}

/** Same "real photo" criterion as Productos' own thumbnail pick
 * (pickAdminProductThumbnail in admin-product-item.ts) — reused here rather
 * than reimplemented, so a hidden Tiendanube placeholder never shows up as
 * if it were a real product photo. */
function pickInventoryThumbnail(images: SanityImageWithAlt[] | undefined) {
  if (!images || images.length === 0) {
    return null;
  }

  const realImage = images.find(
    (image) => image.image?.asset?._ref && image.image.asset._ref !== TIENDANUBE_PLACEHOLDER_IMAGE_ASSET_REF,
  );

  return realImage ?? images[0];
}

export function mapAdminInventoryItem(product: AdminInventoryItemSource): AdminInventoryItem {
  const variantSource =
    product.variants && product.variants.length > 0
      ? ("variants" as const)
      : product.colorVariants && product.colorVariants.length > 0
        ? ("colorVariants" as const)
        : null;

  const thumbnail = pickInventoryThumbnail(product.images);
  const imageUrl = thumbnail ? getSanityImageUrl(thumbnail, 320, 320) : null;

  if (!variantSource) {
    const baseStock = normalizeStock(product.stock);

    return {
      id: product._id,
      rev: product._rev,
      title: product.title,
      slug: product.slug ?? "",
      imageUrl,
      imageAlt: product.title,
      categoryLabel: product.category?.title ?? "Sin categoría",
      subcategoryLabel: product.subcategory?.title ?? null,
      priceLabel: formatDashboardPrice(product.basePrice),
      hasVariants: false,
      variantCount: 0,
      variantSource: null,
      totalStock: baseStock,
      stockTone: resolveStockTone(baseStock),
      rows: [
        {
          key: "base",
          kind: "base",
          label: product.title,
          sku: null,
          stock: baseStock,
          isActive: true,
        },
      ],
    };
  }

  const rawVariants = variantSource === "variants" ? (product.variants ?? []) : (product.colorVariants ?? []);
  const rows: AdminInventoryStockRow[] = rawVariants.map((variant, index) => ({
    key: variant._key?.trim() || buildFallbackRowKey(variantSource, index, variant.title, variant.value),
    kind: "variant",
    label: variant.title?.trim() || variant.value?.trim() || `Variante ${index + 1}`,
    sku: variant.sku?.trim() || null,
    stock: normalizeStock(variant.stock),
    isActive: "isActive" in variant ? variant.isActive !== false : true,
  }));

  const totalStock = rows.reduce((sum, row) => sum + row.stock, 0);

  return {
    id: product._id,
    rev: product._rev,
    title: product.title,
    slug: product.slug ?? "",
    imageUrl,
    imageAlt: product.title,
    categoryLabel: product.category?.title ?? "Sin categoría",
    subcategoryLabel: product.subcategory?.title ?? null,
    priceLabel: formatDashboardPrice(product.basePrice),
    hasVariants: true,
    variantCount: rows.length,
    variantSource,
    totalStock,
    stockTone: resolveStockTone(totalStock),
    rows,
  };
}
