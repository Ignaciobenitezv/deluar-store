import { AnalyticsEventType, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  DASHBOARD_PERIODS,
  type DashboardPeriod,
} from "@/features/admin/dashboard/server/dashboard-service";
import {
  isCancelledOrder,
  isFailedOrder,
  isPaidOrder,
  isPendingPaymentOrder,
} from "@/features/orders/server/order-state-helpers";

const ARGENTINA_TIME_ZONE = "America/Argentina/Buenos_Aires";
const ARGENTINA_UTC_OFFSET_MS = 3 * 60 * 60 * 1000;

const TRACKED_EVENT_TYPES = [
  AnalyticsEventType.PRODUCT_VIEWED,
  AnalyticsEventType.ADD_TO_CART,
  AnalyticsEventType.CHECKOUT_STARTED,
  AnalyticsEventType.ORDER_CREATED,
  AnalyticsEventType.PURCHASE_COMPLETED,
] as const;

type TrackedEventType = (typeof TRACKED_EVENT_TYPES)[number];

export type ConversionFunnelStage = {
  key: string;
  label: string;
  count: number;
  shareOfSessions: number;
  dropOffFromPrevious: number;
  kind: "session" | "order";
};

export type ConversionAbandonmentSeries = {
  key: "cart" | "checkout";
  label: string;
  count: number;
  value: number;
  units: number;
  averageTicket: number;
};

export type ConversionTimelinePoint = {
  date: string;
  label: string;
  sessions: number;
  addToCart: number;
  checkoutStarted: number;
  purchases: number;
};

export type ConversionAnalyticsMetrics = {
  period: DashboardPeriod;
  dateRange: {
    start: Date;
    end: Date;
  };
  summary: {
    sessions: number;
    uniqueVisitors: number;
    purchases: number;
    conversionRate: number;
    billingTotal: number;
    paymentCompletionRate: number;
  };
  activity: {
    addToCartSessions: number;
    checkoutStartedSessions: number;
    cartAbandoned: number;
    checkoutAbandoned: number;
  };
  funnel: ConversionFunnelStage[];
  abandonment: {
    cart: ConversionAbandonmentSeries;
    checkout: ConversionAbandonmentSeries;
  };
  payment: {
    ordersCreated: number;
    purchasesCompleted: number;
    pendingOrders: number;
    failedOrders: number;
    cancelledOrders: number;
    expiredOrders: number;
    billingTotal: number;
    completionRate: number;
  };
  timeline: ConversionTimelinePoint[];
  snapshots: {
    activeCarts: number;
    openCheckouts: number;
  };
};

function toNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value instanceof Prisma.Decimal) {
    return value.toNumber();
  }

  return typeof value === "number" ? value : 0;
}

function safeRate(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return 0;
  }

  return (numerator / denominator) * 100;
}

function getArgentinaDayStart(date = new Date()) {
  const shifted = new Date(date.getTime() - ARGENTINA_UTC_OFFSET_MS);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() + ARGENTINA_UTC_OFFSET_MS);
}

function getPeriodStart(period: DashboardPeriod, now = new Date()) {
  const start = getArgentinaDayStart(now);
  const daysBack = DASHBOARD_PERIODS[period].days - 1;
  start.setUTCDate(start.getUTCDate() - daysBack);
  return start;
}

function formatDateKey(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: ARGENTINA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  const day = parts.find((part) => part.type === "day")?.value ?? "00";

  return `${year}-${month}-${day}`;
}

function formatDateLabel(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: ARGENTINA_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

function buildDateBuckets(period: DashboardPeriod, now = new Date()) {
  const totalDays = DASHBOARD_PERIODS[period].days;
  const start = getPeriodStart(period, now);

  return Array.from({ length: totalDays }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);

    return {
      date,
      key: formatDateKey(date),
      label: formatDateLabel(date),
    };
  });
}

function createEmptyDaySetMap(buckets: ReturnType<typeof buildDateBuckets>) {
  return new Map<string, Set<string>>(buckets.map((bucket) => [bucket.key, new Set<string>()]));
}

function createEmptyDayCountMap(buckets: ReturnType<typeof buildDateBuckets>) {
  return new Map<string, number>(buckets.map((bucket) => [bucket.key, 0]));
}

function createAbandonmentSeries(params: {
  key: "cart" | "checkout";
  label: string;
  count: number;
  value: number;
  units: number;
}): ConversionAbandonmentSeries {
  return {
    ...params,
    averageTicket: params.count > 0 ? params.value / params.count : 0,
  };
}

export async function getConversionAnalyticsMetrics(
  period: DashboardPeriod,
): Promise<ConversionAnalyticsMetrics> {
  const now = new Date();
  const start = getPeriodStart(period, now);
  const end = now;
  const dateBuckets = buildDateBuckets(period, now);

  const [sessionsInPeriod, eventsInPeriod, ordersInPeriod, abandonedCartsInPeriod, activeCarts, openCheckouts] =
    await Promise.all([
      prisma.analyticsSession.findMany({
        where: {
          startedAt: {
            gte: start,
            lte: end,
          },
        },
        select: {
          sessionId: true,
          visitorId: true,
          startedAt: true,
        },
      }),
      prisma.analyticsEvent.findMany({
        where: {
          createdAt: {
            gte: start,
            lte: end,
          },
          type: {
            in: [...TRACKED_EVENT_TYPES],
          },
        },
        select: {
          type: true,
          sessionId: true,
          orderId: true,
          createdAt: true,
        },
      }),
      prisma.order.findMany({
        where: {
          createdAt: {
            gte: start,
            lte: end,
          },
        },
        select: {
          status: true,
          paymentStatus: true,
          total: true,
        },
      }),
      prisma.analyticsCart.findMany({
        where: {
          abandonedAt: {
            gte: start,
            lte: end,
          },
          status: {
            in: ["CART_ABANDONED", "CHECKOUT_ABANDONED"],
          },
          itemCount: {
            gt: 0,
          },
        },
        select: {
          status: true,
          subtotal: true,
          itemCount: true,
        },
      }),
      prisma.analyticsCart.count({
        where: {
          status: "ACTIVE",
          itemCount: {
            gt: 0,
          },
          convertedOrderId: null,
          abandonedAt: null,
        },
      }),
      prisma.analyticsCart.count({
        where: {
          status: "CHECKOUT_STARTED",
          itemCount: {
            gt: 0,
          },
          convertedOrderId: null,
          abandonedAt: null,
        },
      }),
    ]);

  const sessionIdsInPeriod = new Set(sessionsInPeriod.map((session) => session.sessionId));
  const uniqueVisitors = new Set(sessionsInPeriod.map((session) => session.visitorId));

  const productViewedSessions = new Set<string>();
  const addToCartSessions = new Set<string>();
  const checkoutStartedSessions = new Set<string>();
  const orderCreatedIds = new Set<string>();
  const purchaseCompletedSessions = new Set<string>();
  const purchaseCompletedOrderIds = new Set<string>();

  const sessionsByDay = createEmptyDayCountMap(dateBuckets);
  const addToCartByDay = createEmptyDaySetMap(dateBuckets);
  const checkoutStartedByDay = createEmptyDaySetMap(dateBuckets);
  const purchasesByDay = createEmptyDaySetMap(dateBuckets);

  for (const session of sessionsInPeriod) {
    const bucketKey = formatDateKey(session.startedAt);
    sessionsByDay.set(bucketKey, (sessionsByDay.get(bucketKey) ?? 0) + 1);
  }

  for (const event of eventsInPeriod) {
    if (!sessionIdsInPeriod.has(event.sessionId)) {
      continue;
    }

    const bucketKey = formatDateKey(event.createdAt);

    switch (event.type as TrackedEventType) {
      case AnalyticsEventType.PRODUCT_VIEWED:
        productViewedSessions.add(event.sessionId);
        break;
      case AnalyticsEventType.ADD_TO_CART:
        addToCartSessions.add(event.sessionId);
        addToCartByDay.get(bucketKey)?.add(event.sessionId);
        break;
      case AnalyticsEventType.CHECKOUT_STARTED:
        checkoutStartedSessions.add(event.sessionId);
        checkoutStartedByDay.get(bucketKey)?.add(event.sessionId);
        break;
      case AnalyticsEventType.ORDER_CREATED:
        if (event.orderId) {
          orderCreatedIds.add(event.orderId);
        }
        break;
      case AnalyticsEventType.PURCHASE_COMPLETED:
        if (event.orderId) {
          purchaseCompletedSessions.add(event.sessionId);
          purchaseCompletedOrderIds.add(event.orderId);
          purchasesByDay.get(bucketKey)?.add(event.orderId);
        }
        break;
      default:
        break;
    }
  }

  const paidOrders = ordersInPeriod.filter((order) => isPaidOrder(order));
  const pendingOrders = ordersInPeriod.filter((order) => isPendingPaymentOrder(order)).length;
  const failedOrders = ordersInPeriod.filter((order) => isFailedOrder(order)).length;
  const cancelledOrders = ordersInPeriod.filter((order) => isCancelledOrder(order)).length;
  const expiredOrders = ordersInPeriod.filter((order) => order.status === "EXPIRED").length;
  const billingTotal = paidOrders.reduce((accumulator, order) => accumulator + toNumber(order.total), 0);

  const cartAbandoned = abandonedCartsInPeriod.filter((cart) => cart.status === "CART_ABANDONED");
  const checkoutAbandoned = abandonedCartsInPeriod.filter((cart) => cart.status === "CHECKOUT_ABANDONED");

  const cartAbandonment = createAbandonmentSeries({
    key: "cart",
    label: "Carrito abandonado",
    count: cartAbandoned.length,
    value: cartAbandoned.reduce((accumulator, cart) => accumulator + toNumber(cart.subtotal), 0),
    units: cartAbandoned.reduce((accumulator, cart) => accumulator + cart.itemCount, 0),
  });

  const checkoutAbandonment = createAbandonmentSeries({
    key: "checkout",
    label: "Checkout abandonado",
    count: checkoutAbandoned.length,
    value: checkoutAbandoned.reduce((accumulator, cart) => accumulator + toNumber(cart.subtotal), 0),
    units: checkoutAbandoned.reduce((accumulator, cart) => accumulator + cart.itemCount, 0),
  });

  const sessionsCount = sessionsInPeriod.length;
  const purchasesCount = purchaseCompletedOrderIds.size;
  const conversionRate = safeRate(purchaseCompletedSessions.size, sessionsCount);
  const paymentCompletionRate = safeRate(purchaseCompletedOrderIds.size, orderCreatedIds.size);

  const funnelCounts = [
    {
      key: "sessions",
      label: "Sesiones",
      count: sessionsCount,
      kind: "session" as const,
    },
    {
      key: "product-viewed",
      label: "Vieron producto",
      count: productViewedSessions.size,
      kind: "session" as const,
    },
    {
      key: "add-to-cart",
      label: "Agregaron al carrito",
      count: addToCartSessions.size,
      kind: "session" as const,
    },
    {
      key: "checkout-started",
      label: "Iniciaron checkout",
      count: checkoutStartedSessions.size,
      kind: "session" as const,
    },
    {
      key: "order-created",
      label: "Crearon orden",
      count: orderCreatedIds.size,
      kind: "order" as const,
    },
    {
      key: "purchase-completed",
      label: "Compraron",
      count: purchasesCount,
      kind: "order" as const,
    },
  ];

  const funnel = funnelCounts.map((stage, index) => {
    const previous = index === 0 ? sessionsCount : funnelCounts[index - 1]?.count ?? 0;

    return {
      ...stage,
      shareOfSessions: safeRate(stage.count, sessionsCount),
      dropOffFromPrevious: index === 0 ? 0 : safeRate(Math.max(previous - stage.count, 0), previous),
    };
  });

  const timeline = dateBuckets.map((bucket) => ({
    date: bucket.key,
    label: bucket.label,
    sessions: sessionsByDay.get(bucket.key) ?? 0,
    addToCart: addToCartByDay.get(bucket.key)?.size ?? 0,
    checkoutStarted: checkoutStartedByDay.get(bucket.key)?.size ?? 0,
    purchases: purchasesByDay.get(bucket.key)?.size ?? 0,
  }));

  return {
    period,
    dateRange: {
      start,
      end,
    },
    summary: {
      sessions: sessionsCount,
      uniqueVisitors: uniqueVisitors.size,
      purchases: purchasesCount,
      conversionRate,
      billingTotal,
      paymentCompletionRate,
    },
    activity: {
      addToCartSessions: addToCartSessions.size,
      checkoutStartedSessions: checkoutStartedSessions.size,
      cartAbandoned: cartAbandonment.count,
      checkoutAbandoned: checkoutAbandonment.count,
    },
    funnel,
    abandonment: {
      cart: cartAbandonment,
      checkout: checkoutAbandonment,
    },
    payment: {
      ordersCreated: orderCreatedIds.size,
      purchasesCompleted: purchasesCount,
      pendingOrders,
      failedOrders,
      cancelledOrders,
      expiredOrders,
      billingTotal,
      completionRate: paymentCompletionRate,
    },
    timeline,
    snapshots: {
      activeCarts,
      openCheckouts,
    },
  };
}
