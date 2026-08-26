"use client";

import {
  ANALYTICS_EVENT_ENDPOINT,
  ANALYTICS_EVENT_TYPES,
  type AnalyticsEventInput,
  type AnalyticsEventPayload,
  type AnalyticsEventType,
} from "@/features/analytics/shared";
import { buildAnalyticsCartSnapshot, getOrCreateAnalyticsCartId } from "@/features/analytics/client/cart-utils";
import type { CartItem } from "@/features/cart/types";

const recentEventKeys = new Map<string, number>();

function normalizeMaybeString(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getBrowserContext() {
  if (typeof window === "undefined") {
    return null;
  }

  const url = `${window.location.pathname}${window.location.search}`;
  const searchParams = new URLSearchParams(window.location.search);

  return {
    path: window.location.pathname,
    url,
    landingPage: url,
    referrer: normalizeMaybeString(document.referrer),
    utmSource: normalizeMaybeString(searchParams.get("utm_source")),
    utmMedium: normalizeMaybeString(searchParams.get("utm_medium")),
    utmCampaign: normalizeMaybeString(searchParams.get("utm_campaign")),
    utmTerm: normalizeMaybeString(searchParams.get("utm_term")),
    utmContent: normalizeMaybeString(searchParams.get("utm_content")),
  };
}

function shouldSkipRepeat(key: string, windowMs: number) {
  const now = Date.now();
  const lastSeenAt = recentEventKeys.get(key);

  if (typeof lastSeenAt === "number" && now - lastSeenAt < windowMs) {
    return true;
  }

  recentEventKeys.set(key, now);

  if (recentEventKeys.size > 256) {
    for (const [entryKey, entrySeenAt] of recentEventKeys) {
      if (now - entrySeenAt >= windowMs) {
        recentEventKeys.delete(entryKey);
      }
    }
  }

  return false;
}

function buildPayload(input: AnalyticsEventInput): AnalyticsEventPayload | null {
  const context = getBrowserContext();

  if (!context) {
    return null;
  }

  return {
    eventId: input.eventId ?? crypto.randomUUID(),
    type: input.type,
    productId: input.productId ?? null,
    variantId: input.variantId ?? null,
    path: input.path ?? context.path,
    url: input.url ?? context.url,
    landingPage: input.landingPage ?? context.landingPage,
    referrer: input.referrer ?? context.referrer,
    utmSource: input.utmSource ?? context.utmSource,
    utmMedium: input.utmMedium ?? context.utmMedium,
    utmCampaign: input.utmCampaign ?? context.utmCampaign,
    utmTerm: input.utmTerm ?? context.utmTerm,
    utmContent: input.utmContent ?? context.utmContent,
    cartId: input.cartId ?? null,
    orderId: input.orderId ?? null,
    cartItemCount: input.cartItemCount ?? null,
    cartSubtotal: input.cartSubtotal ?? null,
    cartItemsSnapshot: input.cartItemsSnapshot ?? null,
    quantity: input.quantity ?? null,
    quantityRemoved: input.quantityRemoved ?? null,
    unitPrice: input.unitPrice ?? null,
    lineTotal: input.lineTotal ?? null,
    sku: input.sku ?? null,
    title: input.title ?? null,
    productSlug: input.productSlug ?? null,
    metadata: input.metadata ?? null,
  };
}

function sendAnalyticsPayload(payload: AnalyticsEventPayload) {
  const body = JSON.stringify(payload);

  if (typeof navigator.sendBeacon === "function") {
    const blob = new Blob([body], { type: "application/json" });
    if (navigator.sendBeacon(ANALYTICS_EVENT_ENDPOINT, blob)) {
      return;
    }
  }

  void fetch(ANALYTICS_EVENT_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body,
    keepalive: true,
    credentials: "same-origin",
    cache: "no-store",
  }).catch(() => {});
}

function trackEvent(input: AnalyticsEventInput) {
  if (typeof window === "undefined") {
    return;
  }

  if (!ANALYTICS_EVENT_TYPES.includes(input.type as AnalyticsEventType)) {
    return;
  }

  if (input.dedupeKey && shouldSkipRepeat(input.dedupeKey, input.dedupeWindowMs ?? 1200)) {
    return;
  }

  const payload = buildPayload(input);

  if (!payload) {
    return;
  }

  try {
    sendAnalyticsPayload(payload);
  } catch {
    // Analytics must never block UX.
  }
}

export function trackPageView() {
  if (typeof window === "undefined") {
    return;
  }

  const url = `${window.location.pathname}${window.location.search}`;

  trackEvent({
    type: "PAGE_VIEWED",
    dedupeKey: `page:${url}`,
  });
}

type TrackProductViewInput = {
  productId: string;
  variantId?: string | null;
  productSlug?: string | null;
};

export function trackProductView({
  productId,
  variantId,
  productSlug,
}: TrackProductViewInput) {
  if (typeof window === "undefined") {
    return;
  }

  const url = `${window.location.pathname}${window.location.search}`;

  trackEvent({
    type: "PRODUCT_VIEWED",
    productId,
    variantId: variantId ?? null,
    metadata: productSlug ? { productSlug } : null,
    dedupeKey: `product:${productId}:${variantId ?? ""}:${url}`,
  });
}

function buildCartPayload(items: CartItem[]) {
  const cartId = getOrCreateAnalyticsCartId();
  const snapshot = buildAnalyticsCartSnapshot(items);

  return {
    cartId,
    cartItemCount: snapshot.itemCount,
    cartSubtotal: snapshot.subtotal,
    cartItemsSnapshot: snapshot.itemsSnapshot,
  };
}

type TrackCartViewedInput = {
  items: CartItem[];
  source?: string;
};

export function trackCartViewed({ items, source }: TrackCartViewedInput) {
  if (typeof window === "undefined") {
    return;
  }

  const cart = buildCartPayload(items);

  trackEvent({
    type: "CART_VIEWED",
    ...cart,
    metadata: source ? { source } : null,
    dedupeKey: `cart-viewed:${cart.cartId}:${window.location.pathname}`,
  });
}

type TrackAddToCartInput = {
  productId: string;
  variantId?: string | null;
  quantity: number;
  unitPrice: number;
  sku?: string | null;
  productSlug?: string | null;
  productTitle?: string | null;
  items: CartItem[];
};

export function trackAddToCart({
  productId,
  variantId,
  quantity,
  unitPrice,
  sku,
  productSlug,
  productTitle,
  items,
}: TrackAddToCartInput) {
  if (typeof window === "undefined") {
    return;
  }

  const cart = buildCartPayload(items);

  trackEvent({
    type: "ADD_TO_CART",
    productId,
    variantId: variantId ?? null,
    quantity,
    unitPrice,
    sku: sku ?? null,
    productSlug: productSlug ?? null,
    title: productTitle ?? null,
    ...cart,
  });
}

type TrackRemoveFromCartInput = {
  productId: string;
  variantId?: string | null;
  quantityRemoved: number;
  sku?: string | null;
  productSlug?: string | null;
  productTitle?: string | null;
  items: CartItem[];
};

export function trackRemoveFromCart({
  productId,
  variantId,
  quantityRemoved,
  sku,
  productSlug,
  productTitle,
  items,
}: TrackRemoveFromCartInput) {
  if (typeof window === "undefined") {
    return;
  }

  const cart = buildCartPayload(items);

  trackEvent({
    type: "REMOVE_FROM_CART",
    productId,
    variantId: variantId ?? null,
    quantityRemoved,
    sku: sku ?? null,
    productSlug: productSlug ?? null,
    title: productTitle ?? null,
    ...cart,
  });
}

type TrackCheckoutStartedInput = {
  items: CartItem[];
  shippingMethod?: string | null;
  paymentMethod?: string | null;
};

export function trackCheckoutStarted({
  items,
  shippingMethod,
  paymentMethod,
}: TrackCheckoutStartedInput) {
  if (typeof window === "undefined") {
    return;
  }

  const cart = buildCartPayload(items);

  trackEvent({
    type: "CHECKOUT_STARTED",
    ...cart,
    metadata: {
      shippingMethod: shippingMethod ?? null,
      paymentMethod: paymentMethod ?? null,
    },
    dedupeKey: `checkout-started:${cart.cartId}:${window.location.pathname}`,
  });
}

type TrackCheckoutInfoCompletedInput = {
  items: CartItem[];
  shippingMethod?: string | null;
  paymentMethod?: string | null;
};

export function trackCheckoutInfoCompleted({
  items,
  shippingMethod,
  paymentMethod,
}: TrackCheckoutInfoCompletedInput) {
  if (typeof window === "undefined") {
    return;
  }

  const cart = buildCartPayload(items);

  trackEvent({
    type: "CHECKOUT_INFO_COMPLETED",
    ...cart,
    metadata: {
      shippingMethod: shippingMethod ?? null,
      paymentMethod: paymentMethod ?? null,
    },
    dedupeKey: `checkout-info-completed:${cart.cartId}:${window.location.pathname}`,
  });
}
