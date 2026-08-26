import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { DASHBOARD_PERIODS, type DashboardPeriod } from "@/features/admin/dashboard/server/dashboard-service";

const ARGENTINA_UTC_OFFSET_MS = 3 * 60 * 60 * 1000;
const DEFAULT_PAGE_SIZE = 10;
const MAX_TABLE_PAGE_SIZE = 50;
const MIN_SESSIONLESS_MATCHES = 0;

export type CustomerAnalyticsSortKey = "revenue" | "orders" | "averageTicket" | "ltv";

export type CustomerAnalyticsFilters = {
  period: DashboardPeriod;
  sort: CustomerAnalyticsSortKey;
  q: string;
  page: number;
  pageSize: number;
};

export type CustomerAnalyticsSummary = {
  uniqueBuyers: number;
  newCustomers: number;
  recurrentCustomers: number;
  repurchaseRate: number;
  orders: number;
  revenue: number;
  averageTicket: number;
  ordersPerCustomer: number;
  ltvObservedTotal: number;
  ltvObservedAverage: number;
  unidentifiedOrders: number;
  unidentifiedRevenue: number;
};

export type CustomerEvolutionPoint = {
  date: string;
  label: string;
  newCustomers: number;
  recurrentCustomers: number;
  newRevenue: number;
  recurrentRevenue: number;
};

export type CustomerFrequencyBucket = {
  label: string;
  customers: number;
  share: number;
};

export type CustomerCohortRow = {
  cohort: string;
  acquired: number;
  secondPurchase: number;
  secondPurchaseRate: number;
};

export type CustomerInsight = {
  label: string;
  value: string;
  tone: "neutral" | "success" | "warning" | "accent";
};

export type CustomerAnalyticsRow = {
  key: string;
  displayName: string;
  email: string;
  phone?: string;
  periodOrders: number;
  periodUnits: number;
  periodRevenue: number;
  periodAverageTicket: number;
  firstPurchaseAt: string;
  lastPurchaseAt: string;
  daysBetweenPurchases: number | null;
  lifetimeOrders: number;
  lifetimeUnits: number;
  lifetimeRevenue: number;
  ltvObserved: number;
  status: "Nuevo" | "Recurrente";
};

type CustomerAnalyticsInternalRow = Omit<CustomerAnalyticsRow, "firstPurchaseAt" | "lastPurchaseAt"> & {
  firstPurchaseAt: Date;
  lastPurchaseAt: Date;
  secondPurchaseAt: Date | null;
};

type CustomerAnalyticsSortableRow = Pick<
  CustomerAnalyticsInternalRow,
  "key" | "displayName" | "periodOrders" | "periodRevenue" | "periodAverageTicket" | "ltvObserved" | "status"
>;

export type CustomerAnalyticsPageData = {
  period: DashboardPeriod;
  dateRange: {
    start: Date;
    end: Date;
  };
  summary: CustomerAnalyticsSummary;
  split: {
    newCustomers: number;
    recurrentCustomers: number;
    newCustomerShare: number;
    recurrentCustomerShare: number;
    newRevenue: number;
    recurrentRevenue: number;
    newRevenueShare: number;
    recurrentRevenueShare: number;
  };
  evolution: CustomerEvolutionPoint[];
  topCustomers: CustomerAnalyticsRow[];
  table: {
    rows: CustomerAnalyticsRow[];
    totalCount: number;
    page: number;
    pageCount: number;
    pageSize: number;
  };
  frequency: CustomerFrequencyBucket[];
  secondPurchase: {
    customers: number;
    averageDays: number | null;
    medianDays: number | null;
  };
  cohorts: CustomerCohortRow[];
  insights: CustomerInsight[];
  notes: {
    identityStrategy: string;
    purchaseTimestamp: string;
    repurchaseRateDefinition: string;
    ltvDefinition: string;
    dataQualityNote: string;
  };
};

type OrderRow = Prisma.OrderGetPayload<{
  select: {
    id: true;
    createdAt: true;
    total: true;
    status: true;
    paymentStatus: true;
    customerId: true;
    customer: {
      select: {
        id: true;
        fullName: true;
        email: true;
        phone: true;
      };
    };
    items: {
      select: {
        quantity: true;
      };
    };
    analyticsCart: {
      select: {
        purchaseCompletedAt: true;
      };
    };
  };
}>;

type CustomerBucket = {
  key: string;
  displayName: string;
  email: string;
  phone?: string;
  orders: Array<{
    orderId: string;
    purchaseAt: Date;
    createdAt: Date;
    total: number;
    units: number;
  }>;
};

function toNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value instanceof Prisma.Decimal) {
    return value.toNumber();
  }

  return typeof value === "number" ? value : 0;
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
    timeZone: "America/Argentina/Buenos_Aires",
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

function formatMonthKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
  }).format(date);
}

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    month: "short",
    year: "numeric",
  }).format(date);
}

function trimOrUndefined(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeEmail(value: string | null | undefined) {
  return trimOrUndefined(value)?.toLowerCase();
}

function normalizePhone(value: string | null | undefined) {
  const raw = trimOrUndefined(value);

  if (!raw) {
    return undefined;
  }

  const digits = raw.replace(/[^\d+]/g, "");
  return digits.length > MIN_SESSIONLESS_MATCHES ? digits : undefined;
}

function maskEmail(email: string) {
  const [localPart, domain = ""] = email.split("@");

  if (!domain) {
    return email;
  }

  const visible = localPart.slice(0, Math.min(2, localPart.length));
  return `${visible}***@${domain}`;
}

function buildCustomerKey(email: string | null | undefined, phone: string | null | undefined) {
  const normalizedEmail = normalizeEmail(email);

  if (normalizedEmail) {
    return `email:${normalizedEmail}`;
  }

  const normalizedPhone = normalizePhone(phone);

  if (normalizedPhone) {
    return `phone:${normalizedPhone}`;
  }

  return null;
}

function getPurchaseTimestamp(order: OrderRow) {
  return order.analyticsCart?.purchaseCompletedAt ?? order.createdAt;
}

function getOrderUnits(order: OrderRow) {
  return order.items.reduce((accumulator, item) => accumulator + item.quantity, 0);
}

function safeRate(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return 0;
  }

  return (numerator / denominator) * 100;
}

function createCustomerBucket(order: OrderRow): CustomerBucket {
  const key = buildCustomerKey(order.customer.email, order.customer.phone) ?? `order:${order.id}`;
  const displayName = order.customer.fullName.trim() || maskEmail(normalizeEmail(order.customer.email) ?? order.customer.email);

  return {
    key,
    displayName,
    email: normalizeEmail(order.customer.email) ?? order.customer.email.trim(),
    phone: normalizePhone(order.customer.phone),
    orders: [],
  };
}

function getPeriodPurchaseCount(orders: CustomerBucket["orders"], start: Date, end: Date) {
  return orders.filter((order) => order.purchaseAt >= start && order.purchaseAt <= end).length;
}

function getPeriodRevenue(orders: CustomerBucket["orders"], start: Date, end: Date) {
  return orders
    .filter((order) => order.purchaseAt >= start && order.purchaseAt <= end)
    .reduce((accumulator, order) => accumulator + order.total, 0);
}

function getPeriodUnits(orders: CustomerBucket["orders"], start: Date, end: Date) {
  return orders
    .filter((order) => order.purchaseAt >= start && order.purchaseAt <= end)
    .reduce((accumulator, order) => accumulator + order.units, 0);
}

function parseSortKey(value: string | undefined): CustomerAnalyticsSortKey {
  if (value === "orders" || value === "averageTicket" || value === "ltv") {
    return value;
  }

  return "revenue";
}

function parsePageSize(value: string | undefined) {
  const parsed = Number.parseInt(value ?? "", 10);
  const valid = [10, 25, 50];

  return valid.includes(parsed) ? parsed : DEFAULT_PAGE_SIZE;
}

function parsePage(value: string | undefined) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function normalizeCustomerAnalyticsQuery(searchParams: Record<string, string | string[] | undefined>) {
  const period = (searchParams.period as DashboardPeriod | undefined) ?? "30d";
  const q = (Array.isArray(searchParams.q) ? searchParams.q[0] : searchParams.q) ?? "";

  return {
    period: period in DASHBOARD_PERIODS ? period : "30d",
    sort: parseSortKey(Array.isArray(searchParams.sort) ? searchParams.sort[0] : searchParams.sort),
    q: q.trim().slice(0, 120),
    page: parsePage(Array.isArray(searchParams.page) ? searchParams.page[0] : searchParams.page),
    pageSize: parsePageSize(Array.isArray(searchParams.pageSize) ? searchParams.pageSize[0] : searchParams.pageSize),
  } satisfies CustomerAnalyticsFilters;
}

function sortRows<T extends CustomerAnalyticsSortableRow>(rows: T[], sort: CustomerAnalyticsSortKey) {
  return [...rows].sort((left, right) => {
    switch (sort) {
      case "orders":
        return right.periodOrders - left.periodOrders || right.periodRevenue - left.periodRevenue || left.displayName.localeCompare(right.displayName);
      case "averageTicket":
        return right.periodAverageTicket - left.periodAverageTicket || right.periodRevenue - left.periodRevenue || left.displayName.localeCompare(right.displayName);
      case "ltv":
        return right.ltvObserved - left.ltvObserved || right.periodRevenue - left.periodRevenue || left.displayName.localeCompare(right.displayName);
      case "revenue":
      default:
        return right.periodRevenue - left.periodRevenue || right.periodOrders - left.periodOrders || left.displayName.localeCompare(right.displayName);
    }
  });
}

function formatCohortLabel(date: Date) {
  return formatMonthLabel(date);
}

export async function getCustomerAnalyticsPageData(filters: CustomerAnalyticsFilters): Promise<CustomerAnalyticsPageData> {
  const now = new Date();
  const start = getPeriodStart(filters.period, now);
  const end = now;

  const paidOrders = await prisma.order.findMany({
    where: {
      createdAt: {
        lte: end,
      },
      OR: [
        { status: "PAID" },
        { status: "FULFILLED" },
        { paymentStatus: "APPROVED" },
      ],
    },
    select: {
      id: true,
      createdAt: true,
      total: true,
      status: true,
      paymentStatus: true,
      customerId: true,
      customer: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
        },
      },
      items: {
        select: {
          quantity: true,
        },
      },
      analyticsCart: {
        select: {
          purchaseCompletedAt: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const buckets = new Map<string, CustomerBucket>();
  let unidentifiedOrders = 0;
  let unidentifiedRevenue = 0;

  for (const order of paidOrders) {
    const purchaseAt = getPurchaseTimestamp(order);
    const total = toNumber(order.total);
    const units = getOrderUnits(order);
    const key = buildCustomerKey(order.customer.email, order.customer.phone);

    if (!key) {
      unidentifiedOrders += 1;
      unidentifiedRevenue += total;
      continue;
    }

    const bucket = buckets.get(key) ?? createCustomerBucket(order);
    bucket.orders.push({
      orderId: order.id,
      purchaseAt,
      createdAt: order.createdAt,
      total,
      units,
    });
    buckets.set(key, bucket);
  }

  const customerBuckets = [...buckets.values()];
  const bucketByKey = new Map(customerBuckets.map((bucket) => [bucket.key, bucket] as const));

  const allCustomers = customerBuckets.map((bucket) => {
    const sortedOrders = [...bucket.orders].sort((left, right) => left.purchaseAt.getTime() - right.purchaseAt.getTime());
    const firstPurchase = sortedOrders[0];
    const secondPurchase = sortedOrders[1];
    const lastPurchase = sortedOrders[sortedOrders.length - 1];
    const lifetimeOrders = sortedOrders.length;
    const lifetimeUnits = sortedOrders.reduce((accumulator, order) => accumulator + order.units, 0);
    const lifetimeRevenue = sortedOrders.reduce((accumulator, order) => accumulator + order.total, 0);
    const periodOrders = getPeriodPurchaseCount(sortedOrders, start, end);
    const periodUnits = getPeriodUnits(sortedOrders, start, end);
    const periodRevenue = getPeriodRevenue(sortedOrders, start, end);
    const periodAverageTicket = periodOrders > 0 ? periodRevenue / periodOrders : 0;
    const isNew = firstPurchase.purchaseAt >= start && firstPurchase.purchaseAt <= end;
    const daysBetweenPurchases =
      secondPurchase && firstPurchase
        ? Math.max(0, Math.round((secondPurchase.purchaseAt.getTime() - firstPurchase.purchaseAt.getTime()) / (1000 * 60 * 60 * 24)))
        : null;

    return {
      key: bucket.key,
      displayName: bucket.displayName,
      email: bucket.email,
      phone: bucket.phone,
      periodOrders,
      periodUnits,
      periodRevenue,
      periodAverageTicket,
      firstPurchaseAt: firstPurchase.purchaseAt,
      lastPurchaseAt: lastPurchase.purchaseAt,
      daysBetweenPurchases,
      lifetimeOrders,
      lifetimeUnits,
      lifetimeRevenue,
      ltvObserved: lifetimeRevenue,
      status: isNew ? ("Nuevo" as const) : ("Recurrente" as const),
      secondPurchaseAt: secondPurchase?.purchaseAt ?? null,
    } satisfies CustomerAnalyticsInternalRow;
  });

  function toPublicRow(row: CustomerAnalyticsInternalRow): CustomerAnalyticsRow {
    return {
      key: row.key,
      displayName: row.displayName,
      email: row.email,
      phone: row.phone,
      periodOrders: row.periodOrders,
      periodUnits: row.periodUnits,
      periodRevenue: row.periodRevenue,
      periodAverageTicket: row.periodAverageTicket,
      firstPurchaseAt: row.firstPurchaseAt.toISOString(),
      lastPurchaseAt: row.lastPurchaseAt.toISOString(),
      daysBetweenPurchases: row.daysBetweenPurchases,
      lifetimeOrders: row.lifetimeOrders,
      lifetimeUnits: row.lifetimeUnits,
      lifetimeRevenue: row.lifetimeRevenue,
      ltvObserved: row.ltvObserved,
      status: row.status,
    };
  }

  const periodRows = allCustomers.filter((customer) => customer.periodOrders > 0);
  const matchingRows = filters.q
    ? periodRows.filter((customer) => {
        const searchable = `${customer.displayName} ${customer.email} ${customer.phone ?? ""}`.toLowerCase();
        return searchable.includes(filters.q.toLowerCase());
      })
    : periodRows;

  const totalBuyers = periodRows.length;
  const newCustomers = periodRows.filter((customer) => customer.status === "Nuevo");
  const recurrentCustomers = periodRows.filter((customer) => customer.status === "Recurrente");
  const orders = periodRows.reduce((accumulator, customer) => accumulator + customer.periodOrders, 0);
  const revenue = periodRows.reduce((accumulator, customer) => accumulator + customer.periodRevenue, 0);
  const averageTicket = orders > 0 ? revenue / orders : 0;
  const ordersPerCustomer = totalBuyers > 0 ? orders / totalBuyers : 0;
  const repurchaseRate = safeRate(recurrentCustomers.length, totalBuyers);
  const ltvObservedTotal = allCustomers.reduce((accumulator, customer) => accumulator + customer.ltvObserved, 0);
  const ltvObservedAverage = allCustomers.length > 0 ? ltvObservedTotal / allCustomers.length : 0;

  const summary: CustomerAnalyticsSummary = {
    uniqueBuyers: totalBuyers,
    newCustomers: newCustomers.length,
    recurrentCustomers: recurrentCustomers.length,
    repurchaseRate,
    orders,
    revenue,
    averageTicket,
    ordersPerCustomer,
    ltvObservedTotal,
    ltvObservedAverage,
    unidentifiedOrders,
    unidentifiedRevenue,
  };

  const periodDays = new Map<string, {
    date: string;
    label: string;
    newCustomers: Set<string>;
    recurrentCustomers: Set<string>;
    newRevenue: number;
    recurrentRevenue: number;
  }>();

  const dateBuckets = Array.from({ length: DASHBOARD_PERIODS[filters.period].days }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    return {
      date,
      key: formatDateKey(date),
      label: new Intl.DateTimeFormat("es-AR", {
        timeZone: "America/Argentina/Buenos_Aires",
        day: "2-digit",
        month: "2-digit",
      }).format(date),
    };
  });

  for (const bucket of dateBuckets) {
    periodDays.set(bucket.key, {
      date: bucket.key,
      label: bucket.label,
      newCustomers: new Set<string>(),
      recurrentCustomers: new Set<string>(),
      newRevenue: 0,
      recurrentRevenue: 0,
    });
  }

  for (const customer of periodRows) {
    const bucket = bucketByKey.get(customer.key);

    for (const order of bucket?.orders ?? []) {
      if (order.purchaseAt < start || order.purchaseAt > end) {
        continue;
      }

      const bucketKey = formatDateKey(order.purchaseAt);
      const bucket = periodDays.get(bucketKey);

      if (!bucket) {
        continue;
      }

      if (customer.status === "Nuevo") {
        bucket.newCustomers.add(customer.key);
        bucket.newRevenue += order.total;
      } else {
        bucket.recurrentCustomers.add(customer.key);
        bucket.recurrentRevenue += order.total;
      }
    }
  }

  const evolution: CustomerEvolutionPoint[] = [...periodDays.values()].map((bucket) => ({
    date: bucket.date,
    label: bucket.label,
    newCustomers: bucket.newCustomers.size,
    recurrentCustomers: bucket.recurrentCustomers.size,
    newRevenue: bucket.newRevenue,
    recurrentRevenue: bucket.recurrentRevenue,
  }));

  const frequencyMap = new Map<string, number>([
    ["1 compra", 0],
    ["2 compras", 0],
    ["3 compras", 0],
    ["4+ compras", 0],
  ]);

  const lifetimeCustomers = allCustomers.filter((customer) => customer.lifetimeOrders > 0);
  for (const customer of lifetimeCustomers) {
    if (customer.lifetimeOrders === 1) {
      frequencyMap.set("1 compra", (frequencyMap.get("1 compra") ?? 0) + 1);
    } else if (customer.lifetimeOrders === 2) {
      frequencyMap.set("2 compras", (frequencyMap.get("2 compras") ?? 0) + 1);
    } else if (customer.lifetimeOrders === 3) {
      frequencyMap.set("3 compras", (frequencyMap.get("3 compras") ?? 0) + 1);
    } else if (customer.lifetimeOrders >= 4) {
      frequencyMap.set("4+ compras", (frequencyMap.get("4+ compras") ?? 0) + 1);
    }
  }

  const totalLifetimeCustomers = lifetimeCustomers.length;
  const frequency: CustomerFrequencyBucket[] = [...frequencyMap.entries()].map(([label, customers]) => ({
    label,
    customers,
    share: safeRate(customers, totalLifetimeCustomers),
  }));

  const cohortMap = new Map<string, { cohort: string; acquired: number; secondPurchase: number }>();
  for (const customer of lifetimeCustomers) {
    const cohortDate = new Date(customer.firstPurchaseAt);
    const cohortKey = formatMonthKey(cohortDate);
    const current = cohortMap.get(cohortKey) ?? {
      cohort: formatCohortLabel(cohortDate),
      acquired: 0,
      secondPurchase: 0,
    };

    current.acquired += 1;
    if (customer.secondPurchaseAt) {
      current.secondPurchase += 1;
    }
    cohortMap.set(cohortKey, current);
  }

  const cohorts: CustomerCohortRow[] = [...cohortMap.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, value]) => ({
      cohort: value.cohort,
      acquired: value.acquired,
      secondPurchase: value.secondPurchase,
      secondPurchaseRate: safeRate(value.secondPurchase, value.acquired),
    }));

  const sortedRows = sortRows(matchingRows, filters.sort);
  const pageSize = Math.min(Math.max(filters.pageSize, 1), MAX_TABLE_PAGE_SIZE);
  const pageCount = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const page = Math.min(Math.max(filters.page, 1), pageCount);
  const startIndex = (page - 1) * pageSize;
  const pagedRows = sortedRows.slice(startIndex, startIndex + pageSize).map(toPublicRow);

  const topCustomers = sortRows(periodRows, "revenue").slice(0, 10).map(toPublicRow);

  const totalNewRevenue = periodRows
    .filter((customer) => customer.status === "Nuevo")
    .reduce((accumulator, customer) => accumulator + customer.periodRevenue, 0);
  const totalRecurrentRevenue = periodRows
    .filter((customer) => customer.status === "Recurrente")
    .reduce((accumulator, customer) => accumulator + customer.periodRevenue, 0);
  const totalNewCustomers = newCustomers.length;
  const totalRecurrentCustomers = recurrentCustomers.length;
  const totalRevenue = revenue;
  const averagePeriodTicketRecurrent =
    recurrentCustomers.length > 0
      ? totalRecurrentRevenue /
        recurrentCustomers.reduce((accumulator, customer) => accumulator + customer.periodOrders, 0)
      : 0;
  const averagePeriodTicketNew =
    newCustomers.length > 0
      ? totalNewRevenue / newCustomers.reduce((accumulator, customer) => accumulator + customer.periodOrders, 0)
      : 0;
  const newRevenueShare = safeRate(totalNewRevenue, totalRevenue);
  const recurrentRevenueShare = safeRate(totalRecurrentRevenue, totalRevenue);

  const insights: CustomerInsight[] = [];
  if (totalNewCustomers > totalRecurrentCustomers) {
    insights.push({
      label: "Base impulsada por adquisicion",
      value: "Hay mas compradores nuevos que recurrentes en el periodo.",
      tone: "accent",
    });
  } else if (totalRecurrentCustomers > totalNewCustomers) {
    insights.push({
      label: "Base impulsada por recompra",
      value: "Los compradores recurrentes superan a los nuevos en el periodo.",
      tone: "success",
    });
  }

  if (recurrentRevenueShare > newRevenueShare) {
    insights.push({
      label: "Revenue recurrente dominante",
      value: "La mayor parte de la facturacion del periodo viene de clientes recurrentes.",
      tone: "success",
    });
  } else if (newRevenueShare > recurrentRevenueShare) {
    insights.push({
      label: "Revenue de adquisicion",
      value: "La mayor parte de la facturacion del periodo viene de clientes nuevos.",
      tone: "warning",
    });
  }

  const top20Share = (() => {
    const sorted = [...lifetimeCustomers].sort((left, right) => right.ltvObserved - left.ltvObserved);
    const topCount = Math.max(1, Math.ceil(sorted.length * 0.2));
    const topRevenue = sorted.slice(0, topCount).reduce((accumulator, customer) => accumulator + customer.ltvObserved, 0);
    return safeRate(topRevenue, ltvObservedTotal);
  })();

  if (top20Share >= 60) {
    insights.push({
      label: "Alta concentracion",
      value: `El 20% superior explica ${top20Share.toFixed(1)}% del LTV observado.`,
      tone: "warning",
    });
  }

  const secondPurchaseCustomers = lifetimeCustomers.filter((customer) => customer.secondPurchaseAt !== null);
  const secondPurchaseDays = secondPurchaseCustomers
    .map((customer) => customer.daysBetweenPurchases)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const secondPurchaseAverage =
    secondPurchaseDays.length > 0
      ? secondPurchaseDays.reduce((accumulator, value) => accumulator + value, 0) / secondPurchaseDays.length
      : 0;
  const secondPurchaseMedian =
    secondPurchaseDays.length > 0
      ? [...secondPurchaseDays].sort((a, b) => a - b)[Math.floor(secondPurchaseDays.length / 2)]
      : 0;

  if (secondPurchaseCustomers.length > 0 && secondPurchaseDays.length > 0) {
    insights.push({
      label: "Segunda compra",
      value: `Promedio ${Math.round(secondPurchaseAverage)} dias y mediana ${Math.round(secondPurchaseMedian)} dias entre primera y segunda compra.`,
      tone: "neutral",
    });
  }

  if (
    recurrentCustomers.length > 0 &&
    newCustomers.length > 0 &&
    averagePeriodTicketRecurrent > averagePeriodTicketNew
  ) {
    insights.push({
      label: "Ticket recurrente superior",
      value: `Los clientes recurrentes muestran un ticket promedio mayor (${Math.round(averagePeriodTicketRecurrent)} vs ${Math.round(averagePeriodTicketNew)}).`,
      tone: "accent",
    });
  }

  const noteCount = unidentifiedOrders > 0
    ? `${unidentifiedOrders} compras pagadas no pudieron identificarse por email/telefono y se excluyeron del nivel cliente.`
    : "Todas las compras pagadas de la base actual tienen un identificador de cliente utilizable.";

  return {
    period: filters.period,
    dateRange: {
      start,
      end,
    },
    summary,
    split: {
      newCustomers: totalNewCustomers,
      recurrentCustomers: totalRecurrentCustomers,
      newCustomerShare: safeRate(totalNewCustomers, totalBuyers),
      recurrentCustomerShare: safeRate(totalRecurrentCustomers, totalBuyers),
      newRevenue: totalNewRevenue,
      recurrentRevenue: totalRecurrentRevenue,
      newRevenueShare,
      recurrentRevenueShare,
    },
    evolution,
    topCustomers,
    table: {
      rows: pagedRows,
      totalCount: sortedRows.length,
      page,
      pageCount,
      pageSize,
    },
    frequency,
    secondPurchase: {
      customers: secondPurchaseCustomers.length,
      averageDays: secondPurchaseDays.length > 0 ? secondPurchaseAverage : null,
      medianDays: secondPurchaseDays.length > 0 ? secondPurchaseMedian : null,
    },
    cohorts,
    insights,
    notes: {
      identityStrategy:
        "Los clientes se agrupan por email normalizado (trim + lowercase). Si el email faltara, se usa telefono normalizado como fallback. customerId no se usa como identidad longitudinal porque se crea un Customer nuevo por cada orden en el checkout.",
      purchaseTimestamp:
        "Se usa analyticsCart.purchaseCompletedAt cuando existe; si no, se usa order.createdAt como fallback.",
      repurchaseRateDefinition:
        "Tasa de recompra = clientes recurrentes del periodo / compradores unicos del periodo. Es una lectura de cohorte coherente con el filtro activo.",
      ltvDefinition:
        "LTV observado = suma historica real de revenue pagado por cliente identificado, no un modelo predictivo.",
      dataQualityNote: noteCount,
    },
  };
}
