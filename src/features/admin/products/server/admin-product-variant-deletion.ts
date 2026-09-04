import "server-only";

import { prisma } from "@/lib/prisma";
import type { AdminProductVariantData } from "../lib/variant-editor";

type AdminProductVariantDeletionUsage = {
  usedVariantKeys: Set<string>;
  usedVariantValues: Set<string>;
};

function normalizeComparisonValue(value: string) {
  return value.trim().toLowerCase();
}

export async function loadAdminProductVariantDeletionUsage(
  productId: string,
): Promise<AdminProductVariantDeletionUsage> {
  const orderItems = await prisma.orderItem.findMany({
    where: { productId },
    select: {
      variantId: true,
      variantValue: true,
    },
  });

  const usedVariantKeys = new Set<string>();
  const usedVariantValues = new Set<string>();

  for (const item of orderItems) {
    const variantKey = item.variantId?.trim();
    const variantValue = item.variantValue?.trim();

    if (variantKey) {
      usedVariantKeys.add(variantKey);
    }

    if (variantValue) {
      usedVariantValues.add(normalizeComparisonValue(variantValue));
    }
  }

  return {
    usedVariantKeys,
    usedVariantValues,
  };
}

export function applyAdminProductVariantDeletionUsage(
  variants: AdminProductVariantData[],
  usage: AdminProductVariantDeletionUsage,
) {
  return variants.map((variant) => ({
    ...variant,
    canDelete:
      !usage.usedVariantKeys.has(variant.key.trim()) &&
      !usage.usedVariantValues.has(normalizeComparisonValue(variant.value)),
  }));
}
