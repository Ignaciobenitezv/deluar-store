"use client";

import type { CartItem } from "@/features/cart/types";
import type { AnalyticsCartItemSnapshot } from "@/features/analytics/shared";

export const ANALYTICS_CART_STORAGE_KEY = "deluar-analytics-cart-id";

function normalizeNumber(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function getWindowStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

export function getOrCreateAnalyticsCartId() {
  const storage = getWindowStorage();

  if (!storage) {
    return crypto.randomUUID();
  }

  const storedValue = storage.getItem(ANALYTICS_CART_STORAGE_KEY);

  if (storedValue) {
    try {
      const parsed = JSON.parse(storedValue) as unknown;
      if (typeof parsed === "string" && parsed.trim().length > 0) {
        return parsed;
      }
    } catch {
      // fall through and replace invalid values
    }
  }

  const nextValue = crypto.randomUUID();
  storage.setItem(ANALYTICS_CART_STORAGE_KEY, JSON.stringify(nextValue));
  return nextValue;
}

export function clearAnalyticsCartId() {
  const storage = getWindowStorage();

  storage?.removeItem(ANALYTICS_CART_STORAGE_KEY);
}

export function buildAnalyticsCartSnapshot(
  items: CartItem[],
): {
  itemCount: number;
  subtotal: number;
  itemsSnapshot: AnalyticsCartItemSnapshot[];
} {
  const itemsSnapshot = items.map((item) => ({
    productId: item.productId ?? item.id,
    title: item.title,
    quantity: Math.max(0, Math.trunc(item.quantity)),
    unitPrice: normalizeNumber(item.basePrice),
    lineTotal: normalizeNumber(item.basePrice) * Math.max(0, Math.trunc(item.quantity)),
    variantId: item.variantId ?? null,
    sku: item.sku ?? null,
    productSlug: item.slug ?? null,
    variantLabel: item.variantLabel ?? null,
    variantValue: item.variantValue ?? null,
  }));

  return {
    itemCount: items.reduce((accumulator, item) => accumulator + Math.max(0, Math.trunc(item.quantity)), 0),
    subtotal: itemsSnapshot.reduce((accumulator, item) => accumulator + item.lineTotal, 0),
    itemsSnapshot,
  };
}
