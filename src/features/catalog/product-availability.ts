import groq from "groq";

export type ProductAvailabilityVariant = {
  stock?: number | null;
  isActive?: boolean;
};

export type ProductAvailabilityColorVariant = {
  stock?: number | null;
};

export type ProductAvailabilitySource = {
  stock?: number | null;
  variants?: ProductAvailabilityVariant[] | null;
  colorVariants?: ProductAvailabilityColorVariant[] | null;
};

function hasPositiveStock(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/**
 * Single definition of "does this product have anything sellable right
 * now" — the stock half of public visibility. Never mutates or reads
 * `isActive`; the caller combines them: a product is publicly visible iff
 * `isActive != false && isProductStockAvailable(product)`.
 *
 * - No variants at all: available iff base `stock` > 0.
 * - `variants` present (mirrors normalizeProductVariants' own precedence —
 *   an empty array counts as "no variants", falling through): available iff
 *   at least one variant has `isActive != false` AND `stock` > 0. Base
 *   `stock` is ignored completely once variants exist, since a purchase
 *   always resolves against the chosen variant's own stock, never the
 *   product's (see resolveVariantStockTarget in
 *   features/inventory/variant-stock-target.ts).
 * - No `variants` but legacy `colorVariants` present: available iff at
 *   least one has `stock` > 0. Legacy variants have no `isActive` of their
 *   own.
 *
 * Keep this logically identical to `productAvailabilityClause` below.
 */
export function isProductStockAvailable(product: ProductAvailabilitySource): boolean {
  const variants = product.variants ?? [];

  if (variants.length > 0) {
    return variants.some((variant) => variant.isActive !== false && hasPositiveStock(variant.stock));
  }

  const colorVariants = product.colorVariants ?? [];

  if (colorVariants.length > 0) {
    return colorVariants.some((variant) => hasPositiveStock(variant.stock));
  }

  return hasPositiveStock(product.stock);
}

/**
 * GROQ mirror of `isProductStockAvailable` — must stay logically identical.
 * Splice into any public product query alongside `isActive != false`, e.g.:
 *   `_type == "product" && isActive != false && ${productAvailabilityClause}`
 * Never used for admin queries — the admin needs to see out-of-stock
 * products (marked isActive) to manage them; only the public storefront
 * gates on this.
 *
 * `coalesce(count(variants), 0)` (not bare `count(variants)`) everywhere a
 * count is compared: GROQ's `count()` on a field that doesn't exist at all
 * returns `null`, not `0` — unlike `product.variants ?? []` on the
 * TypeScript side, `null == 0` and `null > 0` are both `false` in GROQ, so
 * an undefined `variants`/`colorVariants` field failed *every* branch below
 * regardless of real stock. Wrapping in `coalesce(..., 0)` makes "field
 * missing" behave exactly like "field is an empty array", matching
 * `isProductStockAvailable` exactly.
 */
export const productAvailabilityClause = groq`(
  (coalesce(count(variants), 0) > 0 && count(variants[isActive != false && coalesce(stock, 0) > 0]) > 0) ||
  (coalesce(count(variants), 0) == 0 && coalesce(count(colorVariants), 0) > 0 && count(colorVariants[coalesce(stock, 0) > 0]) > 0) ||
  (coalesce(count(variants), 0) == 0 && coalesce(count(colorVariants), 0) == 0 && coalesce(stock, 0) > 0)
)`;
