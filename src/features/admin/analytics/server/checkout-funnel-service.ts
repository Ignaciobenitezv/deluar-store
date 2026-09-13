import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  DASHBOARD_PERIODS,
  normalizeDashboardPeriodValue,
  type DashboardPeriod,
} from "@/features/admin/dashboard/server/dashboard-service";
import { getAdminPaymentMethodLabel, getAdminPaymentStatusLabel, getAdminShippingMethodLabel } from "@/features/admin/lib/admin-order-labels";

const ARGENTINA_TIME_ZONE = "America/Argentina/Buenos_Aires";
const ARGENTINA_UTC_OFFSET_MS = 3 * 60 * 60 * 1000;

/**
 * Every stage below is a column Deluar already writes. Nothing here is inferred
 * from a stage that the store does not record: a missing timestamp means the
 * shopper never got there, so the stage simply counts fewer carts.
 */
export type CheckoutFunnelStage = {
  key: string;
  label: string;
  note: string;
  count: number;
  /** Share of the cohort's first stage. */
  share: number;
  /** Carts lost since the previous stage. */
  dropCount: number;
  dropShare: number;
};

export type CheckoutDelta = {
  direction: "up" | "down" | "flat" | "unmeasurable";
  changePercent: number;
  previous: number;
};

export type CheckoutDailyPoint = {
  date: string;
  label: string;
  carts: number;
  checkouts: number;
  orders: number;
  purchases: number;
};

export type CheckoutShareRow = {
  key: string;
  label: string;
  value: number;
  share: number;
};

export type CheckoutFilterOption = {
  value: string;
  label: string;
};

export type CheckoutFunnelQuery = {
  period: DashboardPeriod;
  channel: string;
  paymentMethod: string;
  shippingMethod: string;
  paymentStatus: string;
};

export type CheckoutFunnelPageData = {
  query: CheckoutFunnelQuery;
  periodLabel: string;
  generatedAt: Date;
  summary: {
    carts: number;
    checkouts: number;
    orders: number;
    payments: number;
    purchases: number;
    completionRate: number;
    notCompleted: number;
  };
  deltas: {
    carts: CheckoutDelta;
    checkouts: CheckoutDelta;
    orders: CheckoutDelta;
    purchases: CheckoutDelta;
  };
  kpiSeries: {
    carts: number[];
    checkouts: number[];
    orders: number[];
    purchases: number[];
  };
  funnel: CheckoutFunnelStage[];
  daily: CheckoutDailyPoint[];
  dropOffs: CheckoutShareRow[];
  /** Read over paid orders, which is a different population than the cohort. */
  paidOrders: {
    count: number;
    paymentMethods: CheckoutShareRow[];
    shippingMethods: CheckoutShareRow[];
    averageTicket: number;
    averageTicketDelta: CheckoutDelta;
    ticketBuckets: CheckoutShareRow[];
  };
  /** Paid orders in the period that no tracked cart converted into. */
  untrackedPaidOrders: number;
  filters: {
    channels: CheckoutFilterOption[];
    paymentMethods: CheckoutFilterOption[];
    shippingMethods: CheckoutFilterOption[];
    paymentStatuses: CheckoutFilterOption[];
  };
};

function toNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value instanceof Prisma.Decimal) {
    return value.toNumber();
  }

  return typeof value === "number" ? value : 0;
}

function safeRate(numerator: number, denominator: number) {
  return denominator > 0 ? (numerator / denominator) * 100 : 0;
}

function getArgentinaDayStart(date = new Date()) {
  const shifted = new Date(date.getTime() - ARGENTINA_UTC_OFFSET_MS);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() + ARGENTINA_UTC_OFFSET_MS);
}

function getPeriodStart(period: DashboardPeriod, now = new Date()) {
  const start = getArgentinaDayStart(now);
  start.setUTCDate(start.getUTCDate() - (DASHBOARD_PERIODS[period].days - 1));
  return start;
}

function formatDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ARGENTINA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  const day = parts.find((part) => part.type === "day")?.value ?? "00";

  return `${year}-${month}-${day}`;
}

function formatDateLabel(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: ARGENTINA_TIME_ZONE,
    day: "2-digit",
    month: "short",
  }).format(date);
}

function buildDateBuckets(start: Date, days: number) {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);

    return { key: formatDateKey(date), label: formatDateLabel(date) };
  });
}

/**
 * A delta only exists when the previous window had something to compare to.
 * With no base the direction is "unmeasurable" and the page says so, rather
 * than printing a percentage that stands for nothing.
 */
function buildDelta(current: number, previous: number): CheckoutDelta {
  if (previous <= 0) {
    return { direction: "unmeasurable", changePercent: 0, previous };
  }

  const changePercent = ((current - previous) / previous) * 100;

  if (Math.abs(changePercent) < 0.05) {
    return { direction: "flat", changePercent: 0, previous };
  }

  return {
    direction: changePercent > 0 ? "up" : "down",
    changePercent: Math.abs(changePercent),
    previous,
  };
}

function normalizeChannel(utmSource: string | null, referrer: string | null) {
  const source = utmSource?.trim();

  if (source) {
    return source.toLowerCase();
  }

  const host = referrer?.trim();

  if (!host) {
    return "directo";
  }

  try {
    return new URL(host).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return host.replace(/^www\./, "").toLowerCase();
  }
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function toShareRows(entries: Map<string, number>, label: (key: string) => string) {
  const total = [...entries.values()].reduce((sum, value) => sum + value, 0);

  return [...entries.entries()]
    .map(([key, value]) => ({
      key,
      label: label(key),
      value,
      share: safeRate(value, total),
    }))
    .sort((a, b) => b.value - a.value);
}

/**
 * Four equal-width bands across the ticket range the period actually produced.
 * The boundaries come from the data, so the bands describe this store's spread
 * instead of imposing round numbers that may sit outside it entirely.
 */
function buildTicketBuckets(totals: number[]): CheckoutShareRow[] {
  if (totals.length === 0) {
    return [];
  }

  const min = Math.min(...totals);
  const max = Math.max(...totals);
  /** Compact, because the band label shares its row with a bar and a figure. */
  const currency = (value: number) =>
    `$ ${new Intl.NumberFormat("es-AR", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value)}`;

  if (max - min < 1) {
    return [
      {
        key: "single",
        label: currency(min),
        value: totals.length,
        share: 100,
      },
    ];
  }

  const width = (max - min) / 4;

  return Array.from({ length: 4 }, (_, index) => {
    const from = min + width * index;
    const to = index === 3 ? max : min + width * (index + 1);
    const count = totals.filter((total) =>
      index === 3 ? total >= from : total >= from && total < to,
    ).length;

    return {
      key: `band-${index}`,
      label: `${currency(from)} – ${currency(to)}`,
      value: count,
      share: safeRate(count, totals.length),
    };
  });
}

export function normalizeCheckoutFunnelQuery(
  searchParams: Record<string, string | string[] | undefined> = {},
): CheckoutFunnelQuery {
  const read = (value: string | string[] | undefined) =>
    (Array.isArray(value) ? value[0] : value)?.trim() || "all";

  return {
    period: normalizeDashboardPeriodValue(
      Array.isArray(searchParams.period) ? searchParams.period[0] : searchParams.period,
    ),
    channel: read(searchParams.channel),
    paymentMethod: read(searchParams.paymentMethod),
    shippingMethod: read(searchParams.shippingMethod),
    paymentStatus: read(searchParams.paymentStatus),
  };
}

const CART_SELECT = {
  cartId: true,
  createdAt: true,
  checkoutStartedAt: true,
  checkoutInfoCompletedAt: true,
  convertedAt: true,
  purchaseCompletedAt: true,
  session: {
    select: {
      utmSource: true,
      referrer: true,
    },
  },
  convertedOrder: {
    select: {
      id: true,
      paymentStatus: true,
      paymentMethod: true,
      shippingMethod: true,
      total: true,
    },
  },
} satisfies Prisma.AnalyticsCartSelect;

type CohortCart = Prisma.AnalyticsCartGetPayload<{ select: typeof CART_SELECT }>;

export async function getCheckoutFunnelPageData(
  query: CheckoutFunnelQuery,
): Promise<CheckoutFunnelPageData> {
  const now = new Date();
  const days = DASHBOARD_PERIODS[query.period].days;
  const start = getPeriodStart(query.period, now);
  const previousStart = new Date(start);
  previousStart.setUTCDate(previousStart.getUTCDate() - days);

  const cartWhere = (from: Date, to: Date): Prisma.AnalyticsCartWhereInput => ({
    createdAt: { gte: from, lt: to },
    itemCount: { gt: 0 },
  });

  const [currentCarts, previousCarts, paidOrders, previousPaidOrders, allPeriodOrders] =
    await Promise.all([
      prisma.analyticsCart.findMany({
        where: cartWhere(start, now),
        select: CART_SELECT,
      }),
      prisma.analyticsCart.findMany({
        where: cartWhere(previousStart, start),
        select: CART_SELECT,
      }),
      prisma.order.findMany({
        where: { createdAt: { gte: start, lt: now }, paymentStatus: "APPROVED" },
        select: {
          id: true,
          total: true,
          paymentMethod: true,
          shippingMethod: true,
          analyticsCart: { select: { cartId: true } },
        },
      }),
      prisma.order.findMany({
        where: { createdAt: { gte: previousStart, lt: start }, paymentStatus: "APPROVED" },
        select: { total: true },
      }),
      prisma.order.findMany({
        where: { createdAt: { gte: start, lt: now } },
        select: { paymentMethod: true, shippingMethod: true, paymentStatus: true },
      }),
    ]);

  // ── Filter options come from the period's own data, never from the enums ──
  const channelKeys = new Map<string, string>();

  for (const cart of [...currentCarts, ...previousCarts]) {
    const key = normalizeChannel(cart.session?.utmSource ?? null, cart.session?.referrer ?? null);
    channelKeys.set(key, titleCase(key));
  }

  const paymentMethodKeys = new Map<string, string>();
  const shippingMethodKeys = new Map<string, string>();
  const paymentStatusKeys = new Map<string, string>();

  for (const order of allPeriodOrders) {
    paymentMethodKeys.set(order.paymentMethod, getAdminPaymentMethodLabel(order.paymentMethod));
    shippingMethodKeys.set(order.shippingMethod, getAdminShippingMethodLabel(order.shippingMethod));
    paymentStatusKeys.set(order.paymentStatus, getAdminPaymentStatusLabel(order.paymentStatus));
  }

  const toOptions = (entries: Map<string, string>, allLabel: string): CheckoutFilterOption[] => [
    { value: "all", label: allLabel },
    ...[...entries.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "es-AR")),
  ];

  // ── Apply the filters ────────────────────────────────────────────────────
  const orderPasses = (order: CohortCart["convertedOrder"]) => {
    if (!order) {
      return false;
    }
    if (query.paymentMethod !== "all" && order.paymentMethod !== query.paymentMethod) {
      return false;
    }
    if (query.shippingMethod !== "all" && order.shippingMethod !== query.shippingMethod) {
      return false;
    }
    if (query.paymentStatus !== "all" && order.paymentStatus !== query.paymentStatus) {
      return false;
    }
    return true;
  };

  const inChannel = (cart: CohortCart) =>
    query.channel === "all" ||
    normalizeChannel(cart.session?.utmSource ?? null, cart.session?.referrer ?? null) ===
      query.channel;

  const cohort = currentCarts.filter(inChannel);
  const previousCohort = previousCarts.filter(inChannel);

  /**
   * The six stages, each read straight off the cart or the order it converted
   * into. Stage 5 is "a payment was actually submitted" — the order left
   * NOT_STARTED — which is genuinely distinct from stage 6, "the payment was
   * approved".
   */
  const stageOf = (carts: CohortCart[]) => {
    const withOrder = carts.filter((cart) => cart.convertedOrder && orderPasses(cart.convertedOrder));

    return {
      carts: carts.length,
      checkouts: carts.filter((cart) => cart.checkoutStartedAt !== null).length,
      shippingInfo: carts.filter((cart) => cart.checkoutInfoCompletedAt !== null).length,
      orders: withOrder.length,
      payments: withOrder.filter((cart) => cart.convertedOrder?.paymentStatus !== "NOT_STARTED")
        .length,
      purchases: withOrder.filter(
        (cart) => cart.purchaseCompletedAt !== null && cart.convertedOrder?.paymentStatus === "APPROVED",
      ).length,
    };
  };

  const current = stageOf(cohort);
  const previous = stageOf(previousCohort);

  const stageDefs = [
    { key: "cart", label: "Carrito creado", note: "Carritos con al menos un producto.", count: current.carts },
    { key: "checkout", label: "Checkout iniciado", note: "Llegaron al formulario de compra.", count: current.checkouts },
    { key: "shipping", label: "Datos de envío", note: "Completaron los datos de entrega.", count: current.shippingInfo },
    { key: "order", label: "Orden creada", note: "Se generó la orden y su pago.", count: current.orders },
    { key: "payment", label: "Pago realizado", note: "Enviaron un pago al proveedor.", count: current.payments },
    { key: "purchase", label: "Compra completada", note: "El pago fue aprobado.", count: current.purchases },
  ];

  const base = stageDefs[0].count;

  const funnel: CheckoutFunnelStage[] = stageDefs.map((stage, index) => {
    const previousCount = index === 0 ? stage.count : stageDefs[index - 1].count;
    const dropCount = index === 0 ? 0 : Math.max(previousCount - stage.count, 0);

    return {
      ...stage,
      share: safeRate(stage.count, base),
      dropCount,
      dropShare: index === 0 ? 0 : safeRate(dropCount, previousCount),
    };
  });

  const dropOffs: CheckoutShareRow[] = funnel.slice(1).map((stage, index) => ({
    key: stage.key,
    label: `${funnel[index].label} → ${stage.label}`,
    value: stage.dropCount,
    share: stage.dropShare,
  }));

  // ── Daily series, one bucket per day of the period ───────────────────────
  const buckets = buildDateBuckets(start, days);
  const bucketIndex = new Map(buckets.map((bucket, index) => [bucket.key, index]));
  const blank = () => buckets.map(() => 0);
  const series = {
    carts: blank(),
    checkouts: blank(),
    orders: blank(),
    purchases: blank(),
  };

  const bump = (target: number[], date: Date | null) => {
    if (!date) {
      return;
    }
    const index = bucketIndex.get(formatDateKey(date));
    if (index !== undefined) {
      target[index] += 1;
    }
  };

  for (const cart of cohort) {
    bump(series.carts, cart.createdAt);
    bump(series.checkouts, cart.checkoutStartedAt);

    if (cart.convertedOrder && orderPasses(cart.convertedOrder)) {
      bump(series.orders, cart.convertedAt);
      bump(series.purchases, cart.purchaseCompletedAt);
    }
  }

  const daily: CheckoutDailyPoint[] = buckets.map((bucket, index) => ({
    date: bucket.key,
    label: bucket.label,
    carts: series.carts[index],
    checkouts: series.checkouts[index],
    orders: series.orders[index],
    purchases: series.purchases[index],
  }));

  // ── Paid orders: a different, well-defined population ────────────────────
  const filteredPaidOrders = paidOrders.filter((order) => {
    if (query.paymentMethod !== "all" && order.paymentMethod !== query.paymentMethod) {
      return false;
    }
    if (query.shippingMethod !== "all" && order.shippingMethod !== query.shippingMethod) {
      return false;
    }
    return true;
  });

  const paymentTally = new Map<string, number>();
  const shippingTally = new Map<string, number>();

  for (const order of filteredPaidOrders) {
    paymentTally.set(order.paymentMethod, (paymentTally.get(order.paymentMethod) ?? 0) + 1);
    shippingTally.set(order.shippingMethod, (shippingTally.get(order.shippingMethod) ?? 0) + 1);
  }

  const ticketTotals = filteredPaidOrders.map((order) => toNumber(order.total));
  const averageTicket =
    ticketTotals.length > 0
      ? ticketTotals.reduce((sum, value) => sum + value, 0) / ticketTotals.length
      : 0;
  const previousTotals = previousPaidOrders.map((order) => toNumber(order.total));
  const previousAverageTicket =
    previousTotals.length > 0
      ? previousTotals.reduce((sum, value) => sum + value, 0) / previousTotals.length
      : 0;

  return {
    query,
    periodLabel: DASHBOARD_PERIODS[query.period].label,
    generatedAt: now,
    summary: {
      carts: current.carts,
      checkouts: current.checkouts,
      orders: current.orders,
      payments: current.payments,
      purchases: current.purchases,
      completionRate: safeRate(current.purchases, current.carts),
      notCompleted: Math.max(current.carts - current.purchases, 0),
    },
    deltas: {
      carts: buildDelta(current.carts, previous.carts),
      checkouts: buildDelta(current.checkouts, previous.checkouts),
      orders: buildDelta(current.orders, previous.orders),
      purchases: buildDelta(current.purchases, previous.purchases),
    },
    kpiSeries: series,
    funnel,
    daily,
    dropOffs,
    paidOrders: {
      count: filteredPaidOrders.length,
      paymentMethods: toShareRows(paymentTally, getAdminPaymentMethodLabel),
      shippingMethods: toShareRows(shippingTally, getAdminShippingMethodLabel),
      averageTicket,
      averageTicketDelta: buildDelta(averageTicket, previousAverageTicket),
      ticketBuckets: buildTicketBuckets(ticketTotals),
    },
    untrackedPaidOrders: paidOrders.filter((order) => order.analyticsCart === null).length,
    filters: {
      channels: toOptions(channelKeys, "Todos los canales"),
      paymentMethods: toOptions(paymentMethodKeys, "Todos"),
      shippingMethods: toOptions(shippingMethodKeys, "Todos"),
      paymentStatuses: toOptions(paymentStatusKeys, "Todos"),
    },
  };
}
