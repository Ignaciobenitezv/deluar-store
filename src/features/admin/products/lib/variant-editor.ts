import { normalizeAdminProductSlug } from "./product-slug";
import { normalizeProductLogistics, type ProductLogistics } from "@/features/catalog/logistics";
import type { ProductColorVariantDocument, ProductVariantAttributeDocument, ProductVariantDocument, SanityImageWithAlt } from "@/types/cms";

export const ADMIN_PRODUCT_VARIANT_ATTRIBUTE_NAMES = ["Color", "Tamaño", "Modelo", "Talle"] as const;

export type AdminProductVariantAttributeName = (typeof ADMIN_PRODUCT_VARIANT_ATTRIBUTE_NAMES)[number];

export type AdminProductVariantAttribute = {
  name: AdminProductVariantAttributeName;
  value: string;
};

export type AdminProductVariantSource = "variants" | "colorVariants";

export type AdminProductVariantData = {
  key: string;
  title: string;
  value: string;
  attributes: AdminProductVariantAttribute[];
  sku: string;
  basePrice: number | null;
  transferPrice: number | null;
  stock: number;
  isActive: boolean;
  logistics: ProductLogistics | null;
  images: SanityImageWithAlt[];
  source: AdminProductVariantSource;
};

type VariantLike = {
  _key?: string;
  title?: string;
  value?: string;
  sku?: string;
  basePrice?: number;
  transferPrice?: number;
  stock?: number;
  isActive?: boolean;
  logistics?: ProductLogistics | null;
  images?: SanityImageWithAlt[];
};

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function normalizeVariantAttributeName(value: string): AdminProductVariantAttributeName | null {
  const normalized = normalizeString(value);

  if (ADMIN_PRODUCT_VARIANT_ATTRIBUTE_NAMES.includes(normalized as AdminProductVariantAttributeName)) {
    return normalized as AdminProductVariantAttributeName;
  }

  return null;
}

export function normalizeVariantAttributeValue(value: string) {
  return normalizeString(value);
}

export function normalizeVariantAttributes(
  attributes: Array<Partial<ProductVariantAttributeDocument> | null | undefined>,
): AdminProductVariantAttribute[] {
  const seenNames = new Set<AdminProductVariantAttributeName>();
  const normalizedAttributes: AdminProductVariantAttribute[] = [];

  for (const attribute of attributes) {
    const name = normalizeVariantAttributeName(attribute?.name ?? "");
    const value = normalizeVariantAttributeValue(attribute?.value ?? "");

    if (!name || !value || seenNames.has(name)) {
      continue;
    }

    seenNames.add(name);
    normalizedAttributes.push({ name, value });
  }

  return normalizedAttributes;
}

export function buildVariantAttributeSignature(attributes: AdminProductVariantAttribute[]) {
  return attributes
    .map((attribute) => ({
      name: attribute.name,
      value: normalizeVariantAttributeValue(attribute.value).toLowerCase(),
    }))
    .sort((left, right) => {
      const leftIndex = ADMIN_PRODUCT_VARIANT_ATTRIBUTE_NAMES.indexOf(left.name);
      const rightIndex = ADMIN_PRODUCT_VARIANT_ATTRIBUTE_NAMES.indexOf(right.name);

      return leftIndex - rightIndex || left.value.localeCompare(right.value);
    })
    .map((attribute) => `${attribute.name}:${attribute.value}`)
    .join("|");
}

function normalizeKey(value: unknown) {
  const normalized = normalizeString(value);

  if (normalized) {
    return normalized;
  }

  return "";
}

function buildStableFallbackKey(prefix: string, index: number, title: string, value: string) {
  const basis = normalizeAdminProductSlug(value || title) || `variant-${index + 1}`;
  return `${prefix}-${index + 1}-${basis}`;
}

export function normalizeAdminVariantFromCanonical(
  variant: VariantLike,
  index: number,
): AdminProductVariantData {
  const title = normalizeString(variant.title);
  const value = normalizeString(variant.value) || title || `variante-${index + 1}`;
  const attributes = normalizeVariantAttributes(
    (variant as ProductVariantDocument).attributes ?? [],
  );

  return {
    key: normalizeKey(variant._key) || buildStableFallbackKey("variant", index, title, value),
    title: title || value,
    value,
    attributes,
    sku: normalizeString(variant.sku),
    basePrice: normalizeNumber(variant.basePrice),
    transferPrice: normalizeNumber(variant.transferPrice),
    stock: Math.max(0, Math.trunc(normalizeNumber(variant.stock) ?? 0)),
    isActive: variant.isActive !== false,
    logistics: normalizeProductLogistics(variant.logistics),
    images: Array.isArray(variant.images) ? variant.images : [],
    source: "variants",
  };
}

export function normalizeAdminVariantFromLegacy(
  variant: VariantLike,
  index: number,
): AdminProductVariantData {
  const title = normalizeString(variant.title);
  const value = normalizeString(variant.value) || title || `color-${index + 1}`;

  return {
    key: normalizeKey(variant._key) || buildStableFallbackKey("legacy", index, title, value),
    title: title || value,
    value,
    attributes: value ? [{ name: "Color", value }] : [],
    sku: normalizeString(variant.sku),
    basePrice: normalizeNumber(variant.basePrice),
    transferPrice: normalizeNumber(variant.transferPrice),
    stock: Math.max(0, Math.trunc(normalizeNumber(variant.stock) ?? 0)),
    isActive: true,
    logistics: null,
    images: Array.isArray(variant.images) ? variant.images : [],
    source: "colorVariants",
  };
}

export function normalizeAdminProductVariants(input: {
  variants?: ProductVariantDocument[] | null;
  colorVariants?: ProductColorVariantDocument[] | null;
}) {
  const canonicalVariants = (input.variants ?? []).map((variant, index) =>
    normalizeAdminVariantFromCanonical(variant, index),
  );

  if (canonicalVariants.length > 0) {
    return {
      source: "variants" as const,
      variants: canonicalVariants,
      legacyColorVariantCount: (input.colorVariants ?? []).length,
    };
  }

  const legacyVariants = (input.colorVariants ?? []).map((variant, index) =>
    normalizeAdminVariantFromLegacy(variant, index),
  );

  return {
    source: legacyVariants.length > 0 ? ("colorVariants" as const) : null,
    variants: legacyVariants,
    legacyColorVariantCount: legacyVariants.length,
  };
}

export function buildVariantCombinationKey(attributes: AdminProductVariantAttribute[]) {
  return buildVariantAttributeSignature(attributes);
}
