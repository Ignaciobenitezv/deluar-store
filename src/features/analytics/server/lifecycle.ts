import crypto from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import type { AnalyticsCartItemSnapshot } from "@/features/analytics/shared";
import { isPaidOrder } from "@/features/orders/server/order-state-helpers";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

type AnalyticsCartSnapshotRecord = {
  cartId: string;
  visitorId: string;
  sessionId: string | null;
  itemCount: number;
  subtotal: Prisma.Decimal;
  itemsSnapshot: Prisma.JsonValue;
};

type AnalyticsOrderSnapshotRecord = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  paymentProvider: string | null;
  total: Prisma.Decimal;
  subtotal: Prisma.Decimal;
  analyticsCart: AnalyticsCartSnapshotRecord | null;
};

type AbandonmentKind = "CART_ABANDONED" | "CHECKOUT_ABANDONED";

const CART_ABANDONMENT_THRESHOLD_MS = 24 * 60 * 60 * 1000;
const CHECKOUT_ABANDONMENT_THRESHOLD_MS = 30 * 60 * 1000;

function toNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value instanceof Prisma.Decimal) {
    return value.toNumber();
  }

  return typeof value === "number" ? value : 0;
}

function asSnapshotItems(value: Prisma.JsonValue | null | undefined) {
  if (!Array.isArray(value)) {
    return [] as AnalyticsCartItemSnapshot[];
  }

  return value as AnalyticsCartItemSnapshot[];
}

async function upsertLifecycleEvent(params: {
  dedupeKey: string;
  type: AbandonmentKind | "ORDER_CREATED" | "PURCHASE_COMPLETED";
  visitorId: string;
  sessionId: string;
  cartId: string;
  orderId: string | null;
  metadata: Record<string, unknown>;
  now: Date;
}) {
  await prisma.analyticsEvent.upsert({
    where: {
      dedupeKey: params.dedupeKey,
    },
    create: {
      eventId: crypto.randomUUID(),
      dedupeKey: params.dedupeKey,
      type: params.type,
      visitorId: params.visitorId,
      sessionId: params.sessionId,
      cartId: params.cartId,
      orderId: params.orderId ?? undefined,
      metadata: params.metadata as never,
      createdAt: params.now,
    },
    update: {},
  });
}

export async function recordAnalyticsOrderCreated(params: {
  cartId: string;
  orderId: string;
  now?: Date;
}) {
  try {
    const now = params.now ?? new Date();
    const cart = await prisma.analyticsCart.findUnique({
      where: {
        cartId: params.cartId,
      },
      select: {
        cartId: true,
        visitorId: true,
        sessionId: true,
        itemCount: true,
        subtotal: true,
        itemsSnapshot: true,
      },
    });

    if (!cart || !cart.sessionId) {
      logger.debug("analytics.order_created.skipped_missing_cart", {
        cartId: params.cartId,
        orderId: params.orderId,
      });
      return;
    }

    await upsertLifecycleEvent({
      dedupeKey: `ORDER_CREATED:${params.orderId}`,
      type: "ORDER_CREATED",
      visitorId: cart.visitorId,
      sessionId: cart.sessionId,
      cartId: cart.cartId,
      orderId: params.orderId,
      metadata: {
        itemCount: cart.itemCount,
        subtotal: toNumber(cart.subtotal),
        itemsSnapshot: asSnapshotItems(cart.itemsSnapshot),
      },
      now,
    });
  } catch (error) {
    logger.warn("analytics.order_created.failed", {
      cartId: params.cartId,
      orderId: params.orderId,
      error: error instanceof Error ? error.message : "unknown_error",
    });
  }
}

export async function recordAnalyticsPurchaseCompleted(params: {
  orderId: string;
  now?: Date;
}) {
  try {
    const now = params.now ?? new Date();
    const order = await prisma.order.findUnique({
      where: {
        id: params.orderId,
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
        paymentProvider: true,
        total: true,
        subtotal: true,
        analyticsCart: {
          select: {
            cartId: true,
            visitorId: true,
            sessionId: true,
            itemCount: true,
            subtotal: true,
            itemsSnapshot: true,
          },
        },
      },
    }) as AnalyticsOrderSnapshotRecord | null;

    if (!order || !isPaidOrder(order)) {
      logger.debug("analytics.purchase_completed.skipped_not_paid", {
        orderId: params.orderId,
      });
      return;
    }

    if (!order.analyticsCart || !order.analyticsCart.sessionId) {
      logger.debug("analytics.purchase_completed.skipped_missing_cart", {
        orderId: params.orderId,
        orderNumber: order.orderNumber,
      });
      return;
    }

    await upsertLifecycleEvent({
      dedupeKey: `PURCHASE_COMPLETED:${order.id}`,
      type: "PURCHASE_COMPLETED",
      visitorId: order.analyticsCart.visitorId,
      sessionId: order.analyticsCart.sessionId,
      cartId: order.analyticsCart.cartId,
      orderId: order.id,
      metadata: {
        orderNumber: order.orderNumber,
        paymentMethod: order.paymentMethod,
        paymentProvider: order.paymentProvider,
        orderStatus: order.status,
        paymentStatus: order.paymentStatus,
        subtotal: toNumber(order.subtotal),
        total: toNumber(order.total),
        itemCount: order.analyticsCart.itemCount,
        cartSubtotal: toNumber(order.analyticsCart.subtotal),
        cartItemsSnapshot: asSnapshotItems(order.analyticsCart.itemsSnapshot),
      },
      now,
    });

    await prisma.analyticsCart.updateMany({
      where: {
        cartId: order.analyticsCart.cartId,
        convertedOrderId: order.id,
      },
      data: {
        status: "PURCHASED",
        purchaseCompletedAt: now,
        abandonedAt: null,
        lastActivityAt: now,
      },
    });
  } catch (error) {
    logger.warn("analytics.purchase_completed.failed", {
      orderId: params.orderId,
      error: error instanceof Error ? error.message : "unknown_error",
    });
  }
}

async function markCartAsAbandoned(params: {
  cart: {
    cartId: string;
    visitorId: string;
    sessionId: string | null;
    itemCount: number;
    subtotal: Prisma.Decimal;
    itemsSnapshot: Prisma.JsonValue;
    status: string;
  };
  type: AbandonmentKind;
  cutoffAt: Date;
  now: Date;
}) {
  if (!params.cart.sessionId) {
    return false;
  }

  const updated = await prisma.analyticsCart.updateMany({
    where: {
      cartId: params.cart.cartId,
      status: params.type === "CART_ABANDONED" ? "ACTIVE" : "CHECKOUT_STARTED",
      convertedOrderId: null,
      abandonedAt: null,
      lastActivityAt: {
        lt: params.cutoffAt,
      },
    },
    data: {
      status: params.type,
      abandonedAt: params.now,
    },
  });

  if (!updated.count) {
    return false;
  }

  await upsertLifecycleEvent({
    dedupeKey: `${params.type}:${params.cart.cartId}`,
    type: params.type,
    visitorId: params.cart.visitorId,
    sessionId: params.cart.sessionId,
    cartId: params.cart.cartId,
    orderId: null,
    metadata: {
      itemCount: params.cart.itemCount,
      subtotal: toNumber(params.cart.subtotal),
      itemsSnapshot: asSnapshotItems(params.cart.itemsSnapshot),
      cartStatus: params.cart.status,
      abandonedAt: params.now.toISOString(),
      cutoffAt: params.cutoffAt.toISOString(),
    },
    now: params.now,
  });

  return true;
}

export async function processAnalyticsCartAbandonments(params?: {
  now?: Date;
  limit?: number;
}) {
  const now = params?.now ?? new Date();
  const limit = params?.limit ?? 250;
  const cartCutoff = new Date(now.getTime() - CART_ABANDONMENT_THRESHOLD_MS);
  const checkoutCutoff = new Date(now.getTime() - CHECKOUT_ABANDONMENT_THRESHOLD_MS);

  const cartCandidates = await prisma.analyticsCart.findMany({
    where: {
      status: "ACTIVE",
      convertedOrderId: null,
      abandonedAt: null,
      itemCount: {
        gt: 0,
      },
      lastActivityAt: {
        lt: cartCutoff,
      },
    },
    orderBy: [{ lastActivityAt: "asc" }, { createdAt: "asc" }],
    take: limit,
    select: {
      cartId: true,
      visitorId: true,
      sessionId: true,
      itemCount: true,
      subtotal: true,
      itemsSnapshot: true,
      status: true,
    },
  });

  const checkoutCandidates = await prisma.analyticsCart.findMany({
    where: {
      status: "CHECKOUT_STARTED",
      convertedOrderId: null,
      abandonedAt: null,
      itemCount: {
        gt: 0,
      },
      lastActivityAt: {
        lt: checkoutCutoff,
      },
    },
    orderBy: [{ lastActivityAt: "asc" }, { createdAt: "asc" }],
    take: limit,
    select: {
      cartId: true,
      visitorId: true,
      sessionId: true,
      itemCount: true,
      subtotal: true,
      itemsSnapshot: true,
      status: true,
    },
  });

  let cartAbandoned = 0;
  let checkoutAbandoned = 0;

  for (const cart of cartCandidates) {
    if (
      await markCartAsAbandoned({
        cart,
        type: "CART_ABANDONED",
        cutoffAt: cartCutoff,
        now,
      })
    ) {
      cartAbandoned += 1;
    }
  }

  for (const cart of checkoutCandidates) {
    if (
      await markCartAsAbandoned({
        cart,
        type: "CHECKOUT_ABANDONED",
        cutoffAt: checkoutCutoff,
        now,
      })
    ) {
      checkoutAbandoned += 1;
    }
  }

  return {
    now,
    cartCutoff,
    checkoutCutoff,
    cartCandidates: cartCandidates.length,
    checkoutCandidates: checkoutCandidates.length,
    cartAbandoned,
    checkoutAbandoned,
  };
}
