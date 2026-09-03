import type { ProductDocument, ProductLogisticsDocument, ProductVariantDocument } from "@/types/cms";

export type ProductLogistics = ProductLogisticsDocument;

export type ProductLogisticsDraft = {
  weightGrams: string;
  heightCm: string;
  widthCm: string;
  depthCm: string;
};

export const PRODUCT_LOGISTICS_FIELD_NAMES = [
  "weightGrams",
  "heightCm",
  "widthCm",
  "depthCm",
] as const satisfies readonly (keyof ProductLogisticsDraft)[];

export function createProductLogisticsDraft(logistics?: ProductLogistics | null): ProductLogisticsDraft {
  return {
    weightGrams: typeof logistics?.weightGrams === "number" ? String(logistics.weightGrams) : "",
    heightCm: typeof logistics?.heightCm === "number" ? String(logistics.heightCm) : "",
    widthCm: typeof logistics?.widthCm === "number" ? String(logistics.widthCm) : "",
    depthCm: typeof logistics?.depthCm === "number" ? String(logistics.depthCm) : "",
  };
}

export function hasCompleteProductLogistics(
  logistics?: Partial<ProductLogistics> | null,
): logistics is ProductLogistics {
  if (!logistics) {
    return false;
  }

  return PRODUCT_LOGISTICS_FIELD_NAMES.every((field) => {
    const value = logistics[field];
    return typeof value === "number" && Number.isFinite(value) && value > 0;
  });
}

export function normalizeProductLogistics(
  logistics?: Partial<ProductLogistics> | null,
): ProductLogistics | null {
  if (!hasCompleteProductLogistics(logistics)) {
    return null;
  }

  return {
    weightGrams: logistics.weightGrams,
    heightCm: logistics.heightCm,
    widthCm: logistics.widthCm,
    depthCm: logistics.depthCm,
  };
}

export function formatProductLogisticsSummary(logistics?: ProductLogistics | null) {
  if (!hasCompleteProductLogistics(logistics)) {
    return "Sin medidas";
  }

  return `${logistics.weightGrams} g · ${logistics.heightCm} × ${logistics.widthCm} × ${logistics.depthCm} cm`;
}

export function resolveProductLogistics(
  product: Pick<ProductDocument, "logistics">,
  variant?: Pick<ProductVariantDocument, "logistics"> | null,
) {
  const resolvedVariantLogistics = normalizeProductLogistics(variant?.logistics);
  if (resolvedVariantLogistics) {
    return resolvedVariantLogistics;
  }

  return normalizeProductLogistics(product.logistics);
}
