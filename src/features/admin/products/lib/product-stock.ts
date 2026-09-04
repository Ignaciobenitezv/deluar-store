import { normalizeProductVariants } from "@/features/catalog/variant-normalizer";
import type { ProductDocument } from "@/types/cms";
import { ADMIN_LOW_STOCK_THRESHOLD } from "./product-filters";

export type AdminProductStockSource = Pick<
  ProductDocument,
  "basePrice" | "images" | "stock" | "title" | "transferPrice" | "variants" | "colorVariants"
>;

export type AdminProductStockTone = "neutral" | "success" | "warning" | "danger";

export type AdminProductStockSummary = {
  stockValue: number | null;
  stockLabel: string;
  stockHint?: string;
  stockTone: AdminProductStockTone;
};

function formatUnitsLabel(value: number) {
  return `${value} unidades`;
}

function resolveVariantStockValue(product: AdminProductStockSource) {
  const normalizedVariants = normalizeProductVariants(product);
  const baseStockValue = Number.isFinite(product.stock) ? Math.max(0, Math.trunc(product.stock ?? 0)) : 0;

  if (normalizedVariants.length === 0) {
    return {
      stockValue: baseStockValue,
      variantCount: 0,
      stockLabel: baseStockValue <= 0 ? "Sin stock" : formatUnitsLabel(baseStockValue),
      stockHint: baseStockValue > 0 && baseStockValue <= ADMIN_LOW_STOCK_THRESHOLD ? "Stock bajo" : undefined,
      stockTone:
        baseStockValue <= 0
          ? ("danger" as const)
          : baseStockValue <= ADMIN_LOW_STOCK_THRESHOLD
            ? ("warning" as const)
            : ("success" as const),
    };
  }

  const numericVariantStocks = normalizedVariants
    .map((variant) => variant.stock)
    .filter((stock): stock is number => typeof stock === "number" && Number.isFinite(stock));
  const totalVariantStock = numericVariantStocks.reduce(
    (accumulator, stock) => accumulator + Math.max(0, Math.trunc(stock)),
    0,
  );
  const totalStock = baseStockValue + totalVariantStock;

  if (numericVariantStocks.length === normalizedVariants.length) {
    return {
      stockValue: totalStock,
      variantCount: normalizedVariants.length,
      stockLabel: `Base ${formatUnitsLabel(baseStockValue)}`,
      stockHint:
        totalStock > 0 && totalStock <= ADMIN_LOW_STOCK_THRESHOLD
          ? "Stock bajo"
          : `${normalizedVariants.length} variantes`,
      stockTone:
        totalStock <= 0
          ? ("danger" as const)
          : totalStock <= ADMIN_LOW_STOCK_THRESHOLD
            ? ("warning" as const)
            : ("success" as const),
    };
  }

  return {
    stockValue: totalStock,
    variantCount: normalizedVariants.length,
    stockLabel: `Base ${formatUnitsLabel(baseStockValue)}`,
    stockHint:
      totalStock > 0 && totalStock <= ADMIN_LOW_STOCK_THRESHOLD
        ? "Stock bajo"
        : `${normalizedVariants.length} variantes`,
    stockTone:
      totalStock <= 0
        ? ("danger" as const)
        : totalStock <= ADMIN_LOW_STOCK_THRESHOLD
          ? ("warning" as const)
          : ("success" as const),
  };
}

export function resolveAdminProductStockSummary(product: AdminProductStockSource): AdminProductStockSummary {
  const resolved = resolveVariantStockValue(product);

  return {
    stockValue: resolved.stockValue,
    stockLabel: resolved.stockLabel,
    stockHint: resolved.stockHint,
    stockTone: resolved.stockTone,
  };
}

export function resolveAdminProductEffectiveStock(product: AdminProductStockSource) {
  return resolveVariantStockValue(product).stockValue;
}
