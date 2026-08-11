import type { OrderItemVariantAttribute } from "@/features/order/types";

export type OrderItemVariantDisplayLine = {
  label: string;
  value: string;
};

type OrderItemVariantDisplaySource = {
  variantLabel?: string | null;
  variantAttributes?: OrderItemVariantAttribute[] | null;
  variantSku?: string | null;
};

function normalizeValue(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function getOrderItemVariantDisplayLines(
  item: OrderItemVariantDisplaySource,
): OrderItemVariantDisplayLine[] {
  const lines: OrderItemVariantDisplayLine[] = [];

  const variantLabel = normalizeValue(item.variantLabel);
  if (variantLabel) {
    lines.push({
      label: "Variante",
      value: variantLabel,
    });
  }

  for (const attribute of item.variantAttributes ?? []) {
    const attributeName = normalizeValue(attribute.name);
    const attributeValue = normalizeValue(attribute.value);

    if (!attributeName || !attributeValue) {
      continue;
    }

    lines.push({
      label: attributeName,
      value: attributeValue,
    });
  }

  const variantSku = normalizeValue(item.variantSku);
  if (variantSku) {
    lines.push({
      label: "SKU",
      value: variantSku,
    });
  }

  return lines;
}
