import { cookies } from "next/headers";
import { Prisma } from "@/generated/prisma/client";
import {
  ANALYTICS_EVENT_TYPES,
  ANALYTICS_SESSION_COOKIE_NAME,
  ANALYTICS_SESSION_INACTIVITY_MS,
  ANALYTICS_VISITOR_COOKIE_NAME,
  type AnalyticsCartItemSnapshot,
  type AnalyticsEventPayload,
  type AnalyticsEventType,
} from "@/features/analytics/shared";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/http";
import { isSameOriginRequest } from "@/lib/request-security";

type IngestAnalyticsSuccess = {
  visitorId: string;
  sessionId: string;
};

type PrismaTransactionClient = Prisma.TransactionClient;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizeUuid(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return UUID_PATTERN.test(trimmed) ? trimmed : null;
}

function normalizeMaybeString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeMetadata(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function toJsonValue(value: Record<string, unknown> | null) {
  return value ? (value as Prisma.InputJsonValue) : undefined;
}

function normalizeEventType(value: unknown): AnalyticsEventType | null {
  if (typeof value !== "string") {
    return null;
  }

  return ANALYTICS_EVENT_TYPES.includes(value as AnalyticsEventType)
    ? (value as AnalyticsEventType)
    : null;
}

function normalizeCartItemsSnapshot(
  value: unknown,
): AnalyticsCartItemSnapshot[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const items: AnalyticsCartItemSnapshot[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      continue;
    }

    const record = item as Record<string, unknown>;
    const productId = normalizeMaybeString(record.productId);
    const title = normalizeMaybeString(record.title);
    const quantity = normalizeNumber(record.quantity);
    const unitPrice = normalizeNumber(record.unitPrice);
    const lineTotal = normalizeNumber(record.lineTotal);

    if (!productId || !title || quantity === null || unitPrice === null || lineTotal === null) {
      continue;
    }

    items.push({
      productId,
      title,
      quantity: Math.max(0, Math.trunc(quantity)),
      unitPrice,
      lineTotal,
      variantId: normalizeMaybeString(record.variantId) ?? null,
      sku: normalizeMaybeString(record.sku) ?? null,
      productSlug: normalizeMaybeString(record.productSlug) ?? null,
      variantLabel: normalizeMaybeString(record.variantLabel) ?? null,
      variantValue: normalizeMaybeString(record.variantValue) ?? null,
    });
  }

  return items;
}

function getNormalizedCartMetrics(payload: AnalyticsEventPayload) {
  const snapshot = normalizeCartItemsSnapshot(payload.cartItemsSnapshot) ?? [];
  const fallbackItemCount = snapshot.reduce(
    (accumulator, item) => accumulator + Math.max(0, Math.trunc(item.quantity)),
    0,
  );
  const fallbackSubtotal = snapshot.reduce(
    (accumulator, item) => accumulator + Math.max(0, item.lineTotal),
    0,
  );
  const cartItemCount = normalizeNumber(payload.cartItemCount);
  const cartSubtotal = normalizeNumber(payload.cartSubtotal);

  return {
    cartId: normalizeUuid(payload.cartId),
    itemCount: cartItemCount !== null ? Math.max(0, Math.trunc(cartItemCount)) : fallbackItemCount,
    subtotal: cartSubtotal !== null ? Math.max(0, cartSubtotal) : fallbackSubtotal,
    itemsSnapshot: snapshot,
  };
}

function buildLandingPage(payload: AnalyticsEventPayload) {
  return (
    normalizeMaybeString(payload.landingPage) ??
    normalizeMaybeString(payload.url) ??
    normalizeMaybeString(payload.path) ??
    "/"
  );
}

function buildEventMetadata(payload: AnalyticsEventPayload) {
  const metadata = normalizeMetadata(payload.metadata);
  const cartMetrics = getNormalizedCartMetrics(payload);
  const eventMetadata: Record<string, unknown> = {
    ...(metadata ?? {}),
  };

  if (cartMetrics.cartId) {
    eventMetadata.cartId = cartMetrics.cartId;
  }

  if (payload.orderId) {
    eventMetadata.orderId = payload.orderId;
  }

  if (payload.quantity !== null && payload.quantity !== undefined) {
    eventMetadata.quantity = Math.max(0, Math.trunc(payload.quantity));
  }

  if (payload.quantityRemoved !== null && payload.quantityRemoved !== undefined) {
    eventMetadata.quantityRemoved = Math.max(0, Math.trunc(payload.quantityRemoved));
  }

  if (payload.unitPrice !== null && payload.unitPrice !== undefined) {
    eventMetadata.unitPrice = payload.unitPrice;
  }

  if (payload.lineTotal !== null && payload.lineTotal !== undefined) {
    eventMetadata.lineTotal = payload.lineTotal;
  }

  if (payload.sku) {
    eventMetadata.sku = payload.sku;
  }

  if (payload.title) {
    eventMetadata.title = payload.title;
  }

  if (payload.productSlug) {
    eventMetadata.productSlug = payload.productSlug;
  }

  if (cartMetrics.itemsSnapshot.length > 0) {
    eventMetadata.cartItemCount = cartMetrics.itemCount;
    eventMetadata.cartSubtotal = cartMetrics.subtotal;
    eventMetadata.cartItemsSnapshot = cartMetrics.itemsSnapshot;
  } else if (
    cartMetrics.cartId &&
    (payload.type === "CART_VIEWED" ||
      payload.type === "ADD_TO_CART" ||
      payload.type === "REMOVE_FROM_CART" ||
      payload.type === "CHECKOUT_STARTED" ||
      payload.type === "CHECKOUT_INFO_COMPLETED" ||
      payload.type === "ORDER_CREATED" ||
      payload.type === "PURCHASE_COMPLETED" ||
      payload.type === "CART_ABANDONED" ||
      payload.type === "CHECKOUT_ABANDONED")
  ) {
    eventMetadata.cartItemCount = cartMetrics.itemCount;
    eventMetadata.cartSubtotal = cartMetrics.subtotal;
    eventMetadata.cartItemsSnapshot = [];
  }

  if (payload.type === "CHECKOUT_STARTED" || payload.type === "CHECKOUT_INFO_COMPLETED") {
    const shippingMethod = normalizeMaybeString(payload.metadata?.shippingMethod);
    const paymentMethod = normalizeMaybeString(payload.metadata?.paymentMethod);

    if (shippingMethod) {
      eventMetadata.shippingMethod = shippingMethod;
    }

    if (paymentMethod) {
      eventMetadata.paymentMethod = paymentMethod;
    }
  }

  return Object.keys(eventMetadata).length > 0 ? eventMetadata : null;
}

function isCartEvent(type: AnalyticsEventType) {
  return [
    "CART_VIEWED",
    "ADD_TO_CART",
    "REMOVE_FROM_CART",
    "CHECKOUT_STARTED",
    "CHECKOUT_INFO_COMPLETED",
    "ORDER_CREATED",
    "PURCHASE_COMPLETED",
    "CART_ABANDONED",
    "CHECKOUT_ABANDONED",
  ].includes(type);
}

function getCartStatusForEvent(
  currentStatus:
    | "ACTIVE"
    | "CHECKOUT_STARTED"
    | "ORDER_CREATED"
    | "PURCHASED"
    | "CART_ABANDONED"
    | "CHECKOUT_ABANDONED"
    | null,
  type: AnalyticsEventType,
) {
  if (currentStatus === "PURCHASED") {
    return "PURCHASED" as const;
  }

  if (type === "PURCHASE_COMPLETED") {
    return "PURCHASED" as const;
  }

  if (type === "ORDER_CREATED") {
    return "ORDER_CREATED" as const;
  }

  if (currentStatus === "ORDER_CREATED") {
    return "ORDER_CREATED" as const;
  }

  if (currentStatus === "CART_ABANDONED") {
    return "CART_ABANDONED" as const;
  }

  if (type === "CART_ABANDONED") {
    return "CART_ABANDONED" as const;
  }

  if (currentStatus === "CHECKOUT_ABANDONED") {
    return "CHECKOUT_ABANDONED" as const;
  }

  if (type === "CHECKOUT_ABANDONED") {
    return "CHECKOUT_ABANDONED" as const;
  }

  if (type === "CHECKOUT_STARTED" || type === "CHECKOUT_INFO_COMPLETED") {
    return "CHECKOUT_STARTED" as const;
  }

  if (currentStatus === "CHECKOUT_STARTED") {
    return "CHECKOUT_STARTED" as const;
  }

  return "ACTIVE" as const;
}

async function resolveVisitor(visitorCookieId: string | null, now: Date) {
  const visitorId = visitorCookieId ?? crypto.randomUUID();

  return prisma.analyticsVisitor.upsert({
    where: {
      visitorId,
    },
    create: {
      visitorId,
      lastSeenAt: now,
    },
    update: {
      lastSeenAt: now,
    },
  });
}

async function resolveSession(params: {
  visitorId: string;
  sessionCookieId: string | null;
  landingPage: string;
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  now: Date;
}) {
  const existingSession = params.sessionCookieId
    ? await prisma.analyticsSession.findUnique({
        where: {
          sessionId: params.sessionCookieId,
        },
      })
    : null;

  if (
    existingSession &&
    existingSession.visitorId === params.visitorId &&
    params.now.getTime() - existingSession.lastSeenAt.getTime() <= ANALYTICS_SESSION_INACTIVITY_MS
  ) {
    return {
      session: await prisma.analyticsSession.update({
        where: {
          sessionId: existingSession.sessionId,
        },
        data: {
          lastSeenAt: params.now,
        },
      }),
      isNew: false,
    };
  }

  return {
    session: await prisma.analyticsSession.create({
      data: {
        sessionId: crypto.randomUUID(),
        visitorId: params.visitorId,
        startedAt: params.now,
        lastSeenAt: params.now,
        landingPage: params.landingPage,
        referrer: params.referrer,
        utmSource: params.utmSource,
        utmMedium: params.utmMedium,
        utmCampaign: params.utmCampaign,
        utmTerm: params.utmTerm,
        utmContent: params.utmContent,
      },
    }),
    isNew: true,
  };
}

async function persistCartState(
  tx: PrismaTransactionClient,
  params: {
    cartId: string;
    visitorId: string;
    sessionId: string;
    payload: AnalyticsEventPayload;
    now: Date;
  },
) {
  const currentCart = await tx.analyticsCart.findUnique({
    where: {
      cartId: params.cartId,
    },
    select: {
      convertedOrderId: true,
      status: true,
      abandonedAt: true,
      purchaseCompletedAt: true,
      checkoutStartedAt: true,
      checkoutInfoCompletedAt: true,
      itemCount: true,
      subtotal: true,
      itemsSnapshot: true,
    },
  });

  if (
    currentCart?.convertedOrderId &&
    params.payload.type !== "ORDER_CREATED" &&
    params.payload.type !== "PURCHASE_COMPLETED"
  ) {
    return;
  }

  if (
    currentCart?.abandonedAt &&
    params.payload.type !== "ORDER_CREATED" &&
    params.payload.type !== "PURCHASE_COMPLETED"
  ) {
    return;
  }

  const cartMetrics = getNormalizedCartMetrics(params.payload);
  const nextStatus = getCartStatusForEvent(currentCart?.status ?? null, params.payload.type);
  const existingSnapshot = Array.isArray(currentCart?.itemsSnapshot)
    ? (currentCart.itemsSnapshot as AnalyticsCartItemSnapshot[])
    : [];
  const itemsSnapshot =
    cartMetrics.itemsSnapshot.length > 0 ? cartMetrics.itemsSnapshot : existingSnapshot;
  const itemCount =
    cartMetrics.itemsSnapshot.length > 0 ? cartMetrics.itemCount : currentCart?.itemCount ?? 0;
  const subtotal =
    cartMetrics.itemsSnapshot.length > 0 ? cartMetrics.subtotal : Number(currentCart?.subtotal ?? 0);
  const checkoutStartedAt =
    params.payload.type === "CHECKOUT_STARTED" && !currentCart?.checkoutStartedAt
      ? params.now
      : params.payload.type === "CHECKOUT_INFO_COMPLETED" && !currentCart?.checkoutStartedAt
        ? params.now
        : undefined;
  const checkoutInfoCompletedAt =
    params.payload.type === "CHECKOUT_INFO_COMPLETED" && !currentCart?.checkoutInfoCompletedAt
      ? params.now
      : undefined;
  const abandonedAt =
    (params.payload.type === "CART_ABANDONED" || params.payload.type === "CHECKOUT_ABANDONED") &&
    !currentCart?.abandonedAt
      ? params.now
      : undefined;
  const purchaseCompletedAt =
    params.payload.type === "PURCHASE_COMPLETED" && !currentCart?.purchaseCompletedAt
      ? params.now
      : undefined;

  await tx.analyticsCart.upsert({
    where: {
      cartId: params.cartId,
    },
    create: {
      cartId: params.cartId,
      visitorId: params.visitorId,
      sessionId: params.sessionId,
      status: nextStatus,
      itemCount,
      subtotal: new Prisma.Decimal(subtotal),
      itemsSnapshot,
      lastActivityAt: params.now,
      checkoutStartedAt,
      checkoutInfoCompletedAt,
      abandonedAt,
      purchaseCompletedAt,
    },
    update: {
      visitorId: params.visitorId,
      sessionId: params.sessionId,
      status: nextStatus,
      itemCount,
      subtotal: new Prisma.Decimal(subtotal),
      itemsSnapshot,
      lastActivityAt: params.now,
      checkoutStartedAt,
      checkoutInfoCompletedAt,
      abandonedAt,
      purchaseCompletedAt,
    },
  });
}

async function insertAnalyticsEvent(
  tx: PrismaTransactionClient,
  params: {
    payload: AnalyticsEventPayload;
    visitorId: string;
    sessionId: string;
    now: Date;
  },
) {
  await tx.analyticsEvent.create({
    data: {
      eventId: params.payload.eventId,
      type: params.payload.type,
      visitorId: params.visitorId,
      sessionId: params.sessionId,
      cartId: normalizeUuid(params.payload.cartId),
      orderId: normalizeUuid(params.payload.orderId),
      productId: normalizeMaybeString(params.payload.productId),
      variantId: normalizeMaybeString(params.payload.variantId),
      path: normalizeMaybeString(params.payload.path),
      url: normalizeMaybeString(params.payload.url),
      metadata: toJsonValue(buildEventMetadata(params.payload)),
      createdAt: params.now,
    },
  });
}

async function ensureSessionStartedEvent(
  tx: PrismaTransactionClient,
  params: {
    visitorId: string;
    sessionId: string;
    payload: AnalyticsEventPayload;
    now: Date;
  },
) {
  if (params.payload.type === "SESSION_STARTED") {
    return;
  }

  await tx.analyticsEvent.create({
    data: {
      eventId: crypto.randomUUID(),
      type: "SESSION_STARTED",
      visitorId: params.visitorId,
      sessionId: params.sessionId,
      path: normalizeMaybeString(params.payload.path),
      url: normalizeMaybeString(params.payload.url),
      metadata: undefined,
      createdAt: params.now,
    },
  });
}

export async function ingestAnalyticsPayload(
  request: Request,
): Promise<IngestAnalyticsSuccess | Response> {
  if (!isSameOriginRequest(request)) {
    return jsonError(["Solicitud no permitida."], 403);
  }

  let rawPayload: unknown;

  try {
    rawPayload = await request.json();
  } catch {
    return jsonError(["El cuerpo de la solicitud no es un JSON valido."], 400);
  }

  if (!rawPayload || typeof rawPayload !== "object" || Array.isArray(rawPayload)) {
    return jsonError(["El cuerpo de la solicitud no es un JSON valido."], 400);
  }

  const rawRecord = rawPayload as Record<string, unknown>;
  const eventType = normalizeEventType(rawRecord.type);
  const eventId = normalizeUuid(rawRecord.eventId);

  if (!eventType) {
    return jsonError(["El tipo de evento no es valido."], 400);
  }

  if (!eventId) {
    return jsonError(["El identificador del evento no es valido."], 400);
  }

  const payload: AnalyticsEventPayload = {
    eventId,
    type: eventType,
    productId: normalizeMaybeString(rawRecord.productId),
    variantId: normalizeMaybeString(rawRecord.variantId),
    path: normalizeMaybeString(rawRecord.path),
    url: normalizeMaybeString(rawRecord.url),
    landingPage: normalizeMaybeString(rawRecord.landingPage),
    referrer: normalizeMaybeString(rawRecord.referrer),
    utmSource: normalizeMaybeString(rawRecord.utmSource),
    utmMedium: normalizeMaybeString(rawRecord.utmMedium),
    utmCampaign: normalizeMaybeString(rawRecord.utmCampaign),
    utmTerm: normalizeMaybeString(rawRecord.utmTerm),
    utmContent: normalizeMaybeString(rawRecord.utmContent),
    cartId: normalizeUuid(rawRecord.cartId),
    orderId: normalizeUuid(rawRecord.orderId),
    cartItemCount: normalizeNumber(rawRecord.cartItemCount),
    cartSubtotal: normalizeNumber(rawRecord.cartSubtotal),
    cartItemsSnapshot: normalizeCartItemsSnapshot(rawRecord.cartItemsSnapshot),
    quantity: normalizeNumber(rawRecord.quantity),
    quantityRemoved: normalizeNumber(rawRecord.quantityRemoved),
    unitPrice: normalizeNumber(rawRecord.unitPrice),
    lineTotal: normalizeNumber(rawRecord.lineTotal),
    sku: normalizeMaybeString(rawRecord.sku),
    title: normalizeMaybeString(rawRecord.title),
    productSlug: normalizeMaybeString(rawRecord.productSlug),
    metadata: normalizeMetadata(rawRecord.metadata),
  };

  const existingEvent = await prisma.analyticsEvent.findUnique({
    where: {
      eventId: payload.eventId,
    },
    select: {
      visitorId: true,
      sessionId: true,
    },
  });

  if (existingEvent) {
    return existingEvent;
  }

  const cookieStore = await cookies();
  const now = new Date();
  const visitorCookieId = normalizeUuid(cookieStore.get(ANALYTICS_VISITOR_COOKIE_NAME)?.value);
  const sessionCookieId = normalizeUuid(cookieStore.get(ANALYTICS_SESSION_COOKIE_NAME)?.value);

  const visitor = await resolveVisitor(visitorCookieId, now);
  const { session, isNew: isNewSession } = await resolveSession({
    visitorId: visitor.visitorId,
    sessionCookieId,
    landingPage: buildLandingPage(payload),
    referrer: normalizeMaybeString(payload.referrer),
    utmSource: normalizeMaybeString(payload.utmSource),
    utmMedium: normalizeMaybeString(payload.utmMedium),
    utmCampaign: normalizeMaybeString(payload.utmCampaign),
    utmTerm: normalizeMaybeString(payload.utmTerm),
    utmContent: normalizeMaybeString(payload.utmContent),
    now,
  });

  await prisma.$transaction(async (tx) => {
    if (isNewSession && payload.type !== "SESSION_STARTED") {
      await ensureSessionStartedEvent(tx, {
        visitorId: visitor.visitorId,
        sessionId: session.sessionId,
        payload,
        now,
      });
    }

    if (payload.cartId && isCartEvent(payload.type)) {
      await persistCartState(tx, {
        cartId: payload.cartId,
        visitorId: visitor.visitorId,
        sessionId: session.sessionId,
        payload,
        now,
      });
    }

    await insertAnalyticsEvent(tx, {
      payload,
      visitorId: visitor.visitorId,
      sessionId: session.sessionId,
      now,
    });
  });

  return {
    visitorId: visitor.visitorId,
    sessionId: session.sessionId,
  };
}
