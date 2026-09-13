import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  DASHBOARD_PERIODS,
  normalizeDashboardPeriodValue,
  type DashboardPeriod,
} from "@/features/admin/dashboard/server/dashboard-service";
import {
  getAdminPaymentMethodLabel,
  getAdminPaymentStatusLabel,
} from "@/features/admin/lib/admin-order-labels";

const ARGENTINA_TIME_ZONE = "America/Argentina/Buenos_Aires";
const ARGENTINA_UTC_OFFSET_MS = 3 * 60 * 60 * 1000;

/**
 * Deluar has no Payment table: a payment is the payment side of an order, so
 * every figure here is read off Order. One order is one payment attempt.
 */
export type PaymentDelta = {
  direction: "up" | "down" | "flat" | "unmeasurable";
  changePercent: number;
  previous: number;
};

export type PaymentStatusRow = {
  status: string;
  label: string;
  count: number;
  share: number;
};

export type PaymentMethodRow = {
  method: string;
  label: string;
  payments: number;
  approved: number;
  revenue: number;
  share: number;
  /** Null when the method had no resolved attempt to divide by. */
  approvalRate: number | null;
};

export type PaymentDailyPoint = {
  date: string;
  label: string;
  amount: number;
  payments: number;
};

export type PaymentWeekdayRow = {
  key: string;
  label: string;
  payments: number;
};

export type PaymentRecordRow = {
  id: string;
  orderNumber: string;
  createdAt: Date;
  customerName: string;
  method: string;
  methodLabel: string;
  amount: number;
  status: string;
  statusLabel: string;
};

export type PaymentsQuery = {
  period: DashboardPeriod;
  method: string;
};

export type PaymentsPageData = {
  query: PaymentsQuery;
  periodLabel: string;
  generatedAt: Date;
  summary: {
    collected: number;
    payments: number;
    approved: number;
    failed: number;
    pending: number;
    refunded: number;
    averageTicket: number;
    approvalRate: number | null;
  };
  deltas: {
    collected: PaymentDelta;
    payments: PaymentDelta;
    approved: PaymentDelta;
    failed: PaymentDelta;
  };
  kpiSeries: {
    collected: number[];
    payments: number[];
    approved: number[];
    failed: number[];
  };
  daily: PaymentDailyPoint[];
  statusBreakdown: PaymentStatusRow[];
  methods: PaymentMethodRow[];
  weekdays: PaymentWeekdayRow[];
  recent: PaymentRecordRow[];
  totalPayments: number;
  methodOptions: { value: string; label: string }[];
};

/** A payment that never left NOT_STARTED was never actually attempted. */
const ATTEMPTED = (status: string) => status !== "NOT_STARTED";
const APPROVED = (status: string) => status === "APPROVED";
const FAILED = (status: string) => status === "REJECTED" || status === "CHARGED_BACK";
const PENDING = (status: string) => status === "PENDING";
const REFUNDED = (status: string) => status === "REFUNDED";
/** Resolved = the provider gave a final answer, so a rate has a denominator. */
const RESOLVED = (status: string) => APPROVED(status) || FAILED(status);

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

/** Argentina's own weekday for the date, so the bars match the store's clock. */
function argentinaWeekday(date: Date) {
  const name = new Intl.DateTimeFormat("en-US", {
    timeZone: ARGENTINA_TIME_ZONE,
    weekday: "short",
  }).format(date);

  return name.toLowerCase();
}

const WEEKDAYS = [
  { key: "mon", label: "Lun" },
  { key: "tue", label: "Mar" },
  { key: "wed", label: "Mié" },
  { key: "thu", label: "Jue" },
  { key: "fri", label: "Vie" },
  { key: "sat", label: "Sáb" },
  { key: "sun", label: "Dom" },
] as const;

/**
 * A delta only exists when the previous window had something to compare to.
 * With no base the direction is "unmeasurable" and the page says so, rather
 * than printing a percentage that stands for nothing.
 */
function buildDelta(current: number, previous: number): PaymentDelta {
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

export function normalizePaymentsQuery(
  searchParams: Record<string, string | string[] | undefined> = {},
): PaymentsQuery {
  const read = (value: string | string[] | undefined) =>
    (Array.isArray(value) ? value[0] : value)?.trim() || "all";

  return {
    period: normalizeDashboardPeriodValue(
      Array.isArray(searchParams.period) ? searchParams.period[0] : searchParams.period,
    ),
    method: read(searchParams.method),
  };
}

const ORDER_SELECT = {
  id: true,
  orderNumber: true,
  createdAt: true,
  total: true,
  paymentMethod: true,
  paymentStatus: true,
  customer: { select: { fullName: true } },
} satisfies Prisma.OrderSelect;

type PaymentOrder = Prisma.OrderGetPayload<{ select: typeof ORDER_SELECT }>;

export async function getPaymentsPageData(query: PaymentsQuery): Promise<PaymentsPageData> {
  const now = new Date();
  const days = DASHBOARD_PERIODS[query.period].days;
  const start = getPeriodStart(query.period, now);
  const previousStart = new Date(start);
  previousStart.setUTCDate(previousStart.getUTCDate() - days);

  const [currentOrders, previousOrders] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: start, lt: now } },
      select: ORDER_SELECT,
      orderBy: { createdAt: "desc" },
    }),
    prisma.order.findMany({
      where: { createdAt: { gte: previousStart, lt: start } },
      select: ORDER_SELECT,
    }),
  ]);

  // ── Method options come from the period's own data, never from the enum ──
  const methodLabels = new Map<string, string>();

  for (const order of currentOrders) {
    methodLabels.set(order.paymentMethod, getAdminPaymentMethodLabel(order.paymentMethod));
  }

  const inMethod = (order: PaymentOrder) =>
    query.method === "all" || order.paymentMethod === query.method;

  /** Only attempted payments are payments. The rest never reached a provider. */
  const attempted = currentOrders.filter((order) => ATTEMPTED(order.paymentStatus));
  const scoped = attempted.filter(inMethod);
  const previousAttempted = previousOrders.filter(
    (order) => ATTEMPTED(order.paymentStatus) && inMethod(order),
  );

  const tally = (orders: PaymentOrder[]) => {
    const approved = orders.filter((order) => APPROVED(order.paymentStatus));

    return {
      payments: orders.length,
      approved: approved.length,
      failed: orders.filter((order) => FAILED(order.paymentStatus)).length,
      pending: orders.filter((order) => PENDING(order.paymentStatus)).length,
      refunded: orders.filter((order) => REFUNDED(order.paymentStatus)).length,
      resolved: orders.filter((order) => RESOLVED(order.paymentStatus)).length,
      collected: approved.reduce((sum, order) => sum + toNumber(order.total), 0),
    };
  };

  const current = tally(scoped);
  const previous = tally(previousAttempted);

  // ── Daily series, one bucket per day of the period ───────────────────────
  const buckets = Array.from({ length: days }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);

    return { key: formatDateKey(date), label: formatDateLabel(date) };
  });
  const bucketIndex = new Map(buckets.map((bucket, index) => [bucket.key, index]));
  const blank = () => buckets.map(() => 0);
  const series = {
    collected: blank(),
    payments: blank(),
    approved: blank(),
    failed: blank(),
  };

  const weekdayTally = new Map<string, number>(WEEKDAYS.map((day) => [day.key, 0]));

  for (const order of scoped) {
    const index = bucketIndex.get(formatDateKey(order.createdAt));

    if (index !== undefined) {
      series.payments[index] += 1;

      if (APPROVED(order.paymentStatus)) {
        series.approved[index] += 1;
        series.collected[index] += toNumber(order.total);
      }

      if (FAILED(order.paymentStatus)) {
        series.failed[index] += 1;
      }
    }

    const weekday = argentinaWeekday(order.createdAt);
    weekdayTally.set(weekday, (weekdayTally.get(weekday) ?? 0) + 1);
  }

  const daily: PaymentDailyPoint[] = buckets.map((bucket, index) => ({
    date: bucket.key,
    label: bucket.label,
    amount: series.collected[index],
    payments: series.payments[index],
  }));

  // ── Status breakdown, built only from the statuses actually present ──────
  const statusTally = new Map<string, number>();

  for (const order of scoped) {
    statusTally.set(order.paymentStatus, (statusTally.get(order.paymentStatus) ?? 0) + 1);
  }

  const statusBreakdown: PaymentStatusRow[] = [...statusTally.entries()]
    .map(([status, count]) => ({
      status,
      label: getAdminPaymentStatusLabel(status),
      count,
      share: safeRate(count, scoped.length),
    }))
    .sort((a, b) => b.count - a.count);

  // ── Methods: volume, revenue and a rate only where one is legitimate ─────
  const methodTally = new Map<
    string,
    { payments: number; approved: number; resolved: number; revenue: number }
  >();

  for (const order of attempted) {
    const entry = methodTally.get(order.paymentMethod) ?? {
      payments: 0,
      approved: 0,
      resolved: 0,
      revenue: 0,
    };

    entry.payments += 1;

    if (RESOLVED(order.paymentStatus)) {
      entry.resolved += 1;
    }

    if (APPROVED(order.paymentStatus)) {
      entry.approved += 1;
      entry.revenue += toNumber(order.total);
    }

    methodTally.set(order.paymentMethod, entry);
  }

  const methodRevenueTotal = [...methodTally.values()].reduce(
    (sum, entry) => sum + entry.revenue,
    0,
  );

  const methods: PaymentMethodRow[] = [...methodTally.entries()]
    .map(([method, entry]) => ({
      method,
      label: getAdminPaymentMethodLabel(method),
      payments: entry.payments,
      approved: entry.approved,
      revenue: entry.revenue,
      share: safeRate(entry.revenue, methodRevenueTotal),
      approvalRate: entry.resolved > 0 ? safeRate(entry.approved, entry.resolved) : null,
    }))
    .sort((a, b) => b.revenue - a.revenue || b.payments - a.payments);

  return {
    query,
    periodLabel: DASHBOARD_PERIODS[query.period].label,
    generatedAt: now,
    summary: {
      collected: current.collected,
      payments: current.payments,
      approved: current.approved,
      failed: current.failed,
      pending: current.pending,
      refunded: current.refunded,
      averageTicket: current.approved > 0 ? current.collected / current.approved : 0,
      approvalRate: current.resolved > 0 ? safeRate(current.approved, current.resolved) : null,
    },
    deltas: {
      collected: buildDelta(current.collected, previous.collected),
      payments: buildDelta(current.payments, previous.payments),
      approved: buildDelta(current.approved, previous.approved),
      failed: buildDelta(current.failed, previous.failed),
    },
    kpiSeries: series,
    daily,
    statusBreakdown,
    methods,
    weekdays: WEEKDAYS.map((day) => ({
      key: day.key,
      label: day.label,
      payments: weekdayTally.get(day.key) ?? 0,
    })),
    recent: scoped.slice(0, 8).map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      customerName: order.customer?.fullName ?? "—",
      method: order.paymentMethod,
      methodLabel: getAdminPaymentMethodLabel(order.paymentMethod),
      amount: toNumber(order.total),
      status: order.paymentStatus,
      statusLabel: getAdminPaymentStatusLabel(order.paymentStatus),
    })),
    totalPayments: scoped.length,
    methodOptions: [
      { value: "all", label: "Todos los métodos" },
      ...[...methodLabels.entries()]
        .map(([value, label]) => ({ value, label }))
        .sort((a, b) => a.label.localeCompare(b.label, "es-AR")),
    ],
  };
}
