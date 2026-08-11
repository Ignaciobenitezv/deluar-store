import type { ProductDocument } from "@/types/cms";

export type VariantStockSelection = {
  variantId?: string | null;
  variantValue?: string | null;
  variantLabel?: string | null;
  variantSku?: string | null;
  variantAttributes?: unknown;
};

type VariantCollection = "variants" | "colorVariants";

type VariantLike = {
  _key?: string;
  title?: string;
  value?: string;
  stock?: number;
  isActive?: boolean;
  sku?: string;
};

export type VariantStockTarget = {
  productId: string;
  productSlug: string;
  productTitle: string;
  productRev?: string;
  quantity: number;
  stock: number;
  stockSource: "product" | "variant";
  variant?: {
    collection: VariantCollection;
    key: string;
    title: string;
    value: string;
    sku?: string;
    stock?: number;
    isActive?: boolean;
  };
};

export type ProductForVariantStockTarget = Pick<
  ProductDocument,
  "_id" | "_rev" | "slug" | "title" | "stock" | "variants" | "colorVariants"
>;

export class VariantStockTargetResolutionError extends Error {
  reason: "not_found" | "inactive";

  constructor(reason: "not_found" | "inactive", message: string) {
    super(message);
    this.name = "VariantStockTargetResolutionError";
    this.reason = reason;
  }
}

export function isVariantStockTargetResolutionError(
  error: unknown,
): error is VariantStockTargetResolutionError {
  return error instanceof VariantStockTargetResolutionError;
}

function normalizeString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeStock(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.trunc(value))
    : undefined;
}

function buildSelection(input: VariantStockSelection) {
  return {
    variantId: normalizeString(input.variantId),
    variantValue: normalizeString(input.variantValue),
  };
}

function findVariant(
  variants: VariantLike[] | undefined,
  selection: ReturnType<typeof buildSelection>,
  collection: VariantCollection,
) {
  if (!Array.isArray(variants) || variants.length === 0) {
    return null;
  }

  if (selection.variantId) {
    const matchByKey = variants.find((variant) => variant._key === selection.variantId);

    if (matchByKey) {
      return {
        collection,
        variant: matchByKey,
      };
    }
  }

  if (selection.variantValue) {
    const matchByValue = variants.find((variant) => variant.value === selection.variantValue);

    if (matchByValue) {
      return {
        collection,
        variant: matchByValue,
      };
    }
  }

  return null;
}

function toResolvedVariant(
  collection: VariantCollection,
  variant: VariantLike,
): NonNullable<VariantStockTarget["variant"]> | null {
  const key = normalizeString(variant._key);
  const title = normalizeString(variant.title);
  const value = normalizeString(variant.value);

  if (!key || !title || !value) {
    return null;
  }

  return {
    collection,
    key,
    title,
    value,
    sku: normalizeString(variant.sku),
    stock: normalizeStock(variant.stock),
    isActive: variant.isActive,
  };
}

export function resolveVariantStockTarget(
  product: ProductForVariantStockTarget,
  input: VariantStockSelection & { quantity: number },
): VariantStockTarget {
  const selection = buildSelection(input);
  const quantity = Math.max(0, Math.trunc(input.quantity));
  const productStock = normalizeStock(product.stock) ?? 0;

  if (!selection.variantId && !selection.variantValue) {
    return {
      productId: product._id,
      productSlug: product.slug.current,
      productTitle: product.title,
      productRev: product._rev,
      quantity,
      stock: productStock,
      stockSource: "product",
    };
  }

const matchedVariant =
    findVariant(product.variants, selection, "variants") ??
    findVariant(product.colorVariants, selection, "colorVariants");

  if (!matchedVariant) {
    throw new VariantStockTargetResolutionError(
      "not_found",
      "La variante seleccionada ya no esta disponible.",
    );
  }

  if (matchedVariant.variant.isActive === false) {
    throw new VariantStockTargetResolutionError(
      "inactive",
      "La variante seleccionada esta inactiva.",
    );
  }

  const resolvedVariant =
    toResolvedVariant(matchedVariant.collection, matchedVariant.variant);

  if (!resolvedVariant) {
    throw new VariantStockTargetResolutionError(
      "not_found",
      "La variante seleccionada ya no esta disponible.",
    );
  }

  const variantStock = resolvedVariant.stock;

  if (typeof variantStock !== "number") {
    return {
      productId: product._id,
      productSlug: product.slug.current,
      productTitle: product.title,
      productRev: product._rev,
      quantity,
      stock: productStock,
      stockSource: "product",
      variant: resolvedVariant,
    };
  }

  return {
    productId: product._id,
    productSlug: product.slug.current,
    productTitle: product.title,
    productRev: product._rev,
    quantity,
    stock: variantStock,
    stockSource: "variant",
    variant: resolvedVariant,
  };
}
