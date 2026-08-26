export const ANALYTICS_EVENT_ENDPOINT = "/api/analytics/events";

export const ANALYTICS_VISITOR_COOKIE_NAME = "deluar_analytics_visitor_id";
export const ANALYTICS_SESSION_COOKIE_NAME = "deluar_analytics_session_id";

export const ANALYTICS_SESSION_INACTIVITY_MS = 30 * 60 * 1000;
export const ANALYTICS_VISITOR_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
export const ANALYTICS_SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export const ANALYTICS_EVENT_TYPES = [
  "SESSION_STARTED",
  "PAGE_VIEWED",
  "PRODUCT_VIEWED",
  "ADD_TO_CART",
  "REMOVE_FROM_CART",
  "CART_VIEWED",
  "CHECKOUT_STARTED",
  "CHECKOUT_INFO_COMPLETED",
  "ORDER_CREATED",
  "PURCHASE_COMPLETED",
  "CART_ABANDONED",
  "CHECKOUT_ABANDONED",
] as const;

export type AnalyticsEventType = (typeof ANALYTICS_EVENT_TYPES)[number];

export type AnalyticsCartItemSnapshot = {
  productId: string;
  title: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  variantId?: string | null;
  sku?: string | null;
  productSlug?: string | null;
  variantLabel?: string | null;
  variantValue?: string | null;
};

export type AnalyticsEventPayload = {
  eventId: string;
  dedupeKey?: string | null;
  type: AnalyticsEventType;
  productId?: string | null;
  variantId?: string | null;
  path?: string | null;
  url?: string | null;
  landingPage?: string | null;
  referrer?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmTerm?: string | null;
  utmContent?: string | null;
  cartId?: string | null;
  orderId?: string | null;
  cartItemCount?: number | null;
  cartSubtotal?: number | null;
  cartItemsSnapshot?: AnalyticsCartItemSnapshot[] | null;
  quantity?: number | null;
  quantityRemoved?: number | null;
  unitPrice?: number | null;
  lineTotal?: number | null;
  sku?: string | null;
  title?: string | null;
  productSlug?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type AnalyticsEventInput = Omit<AnalyticsEventPayload, "eventId"> & {
  eventId?: string;
  dedupeKey?: string;
  dedupeWindowMs?: number;
};
