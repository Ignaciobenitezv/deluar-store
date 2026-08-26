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

  if (normalizedVariants.length === 0) {
    const stockValue = Number.isFinite(product.stock) ? product.stock : 0;

    return {
      stockValue,
      variantCount: 0,
      stockLabel: stockValue <= 0 ? "Sin stock" : formatUnitsLabel(stockValue),
      stockHint: stockValue > 0 && stockValue <= ADMIN_LOW_STOCK_THRESHOLD ? "Stock bajo" : undefined,
      stockTone:
        stockValue <= 0
          ? ("danger" as const)
          : stockValue <= ADMIN_LOW_STOCK_THRESHOLD
            ? ("warning" as const)
            : ("success" as const),
    };
  }

  const numericVariantStocks = normalizedVariants
    .map((variant) => variant.stock)
    .filter((stock): stock is number => typeof stock === "number" && Number.isFinite(stock));

  if (numericVariantStocks.length === normalizedVariants.length) {
    const totalStock = numericVariantStocks.reduce((accumulator, stock) => accumulator + stock, 0);

    return {
      stockValue: totalStock,
      variantCount: normalizedVariants.length,
      stockLabel: totalStock <= 0 ? "Sin stock" : `${formatUnitsLabel(totalStock)} · ${normalizedVariants.length} variantes`,
      stockHint:
        totalStock > 0 && totalStock <= ADMIN_LOW_STOCK_THRESHOLD ? "Stock bajo" : `${normalizedVariants.length} variantes`,
      stockTone:
        totalStock <= 0
          ? ("danger" as const)
          : totalStock <= ADMIN_LOW_STOCK_THRESHOLD
            ? ("warning" as const)
            : ("success" as const),
    };
  }

  return {
    stockValue: null,
    variantCount: normalizedVariants.length,
    stockLabel: "Stock por variante",
    stockHint: `${normalizedVariants.length} variantes`,
    stockTone: "neutral" as const,
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
