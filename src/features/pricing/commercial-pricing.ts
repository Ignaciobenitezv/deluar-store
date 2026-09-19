import { PAYMENT_METHODS, type PaymentMethod } from "@/features/payments/types";

export type CommercialPriceSource = {
  basePrice: number;
  transferPrice?: number | null;
};

function normalizePrice(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : null;
}

export function isValidCommercialPrice(value: unknown): value is number {
  return normalizePrice(value) !== null;
}

/**
 * Deluar's single, fixed transfer-payment discount rule: always exactly 20%
 * off, rounded to whole pesos (the only unit every price in this project is
 * formatted/persisted in — see formatProductPrice/formatDashboardPrice,
 * always 0 fraction digits). Every write path that persists `transferPrice`
 * (product creation, product edit, variant edit) must derive it through this
 * function instead of trusting a client-submitted value or hardcoding the
 * 20% anywhere else.
 */
export function calculateTransferPrice(basePrice: number) {
  return Math.round(basePrice * 0.8);
}

export function resolveCommercialBasePrice(source: CommercialPriceSource) {
  return normalizePrice(source.basePrice) ?? 0;
}

export function resolveCommercialTransferPrice(source: CommercialPriceSource) {
  return normalizePrice(source.transferPrice);
}

export function resolveCommercialUnitPrice(
  source: CommercialPriceSource,
  paymentMethod: PaymentMethod,
) {
  const basePrice = resolveCommercialBasePrice(source);
  const transferPrice = resolveCommercialTransferPrice(source);

  if (paymentMethod === PAYMENT_METHODS.TRANSFER && transferPrice !== null) {
    return transferPrice;
  }

  return basePrice;
}

export function resolveCommercialLineTotal(
  source: CommercialPriceSource,
  paymentMethod: PaymentMethod,
  quantity: number,
) {
  const normalizedQuantity = Math.max(0, Math.trunc(quantity));

  return resolveCommercialUnitPrice(source, paymentMethod) * normalizedQuantity;
}

export function resolveCommercialSubtotal(
  items: Array<CommercialPriceSource & { quantity: number }>,
  paymentMethod: PaymentMethod,
) {
  return items.reduce(
    (accumulator, item) =>
      accumulator +
      resolveCommercialUnitPrice(item, paymentMethod) * Math.max(0, Math.trunc(item.quantity)),
    0,
  );
}
