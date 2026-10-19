import {
  resolveCommercialBasePrice,
  resolveCommercialTransferPrice,
} from "@/features/pricing/commercial-pricing";

export function formatProductPrice(value: number, fractionDigits = 0) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatInstallmentPrice(basePrice: number) {
  return formatProductPrice(basePrice / 6, 2);
}

/**
 * Transfer offer shown on cards, read from the stored transferPrice (what
 * checkout charges, see resolveCommercialUnitPrice) instead of assuming a
 * rate. Null when there is no real transfer discount to advertise.
 */
export function resolveTransferOffer(product: { basePrice: number; transferPrice?: number | null }) {
  const basePrice = resolveCommercialBasePrice(product);
  const transferPrice = resolveCommercialTransferPrice(product);

  if (basePrice <= 0 || transferPrice === null || transferPrice >= basePrice) {
    return null;
  }

  const discountPercent = Math.round((1 - transferPrice / basePrice) * 100);

  return discountPercent > 0 ? { transferPrice, discountPercent } : null;
}
