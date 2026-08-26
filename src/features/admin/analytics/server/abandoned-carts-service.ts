import { Prisma } from "@/generated/prisma/client";
import type { AnalyticsCartStatus as AnalyticsCartStatusEnum } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { DASHBOARD_PERIODS, type DashboardPeriod } from "@/features/admin/dashboard/server/dashboard-service";
import type { AnalyticsCartItemSnapshot } from "@/features/analytics/shared";

const ARGENTINA_TIME_ZONE = "America/Argentina/Buenos_Aires";
const ARGENTINA_UTC_OFFSET_MS = 3 * 60 * 60 * 1000;
const PAGE_SIZE_VALUES = [25, 50, 100] as const;

export type AbandonedCartStageFilter = "all" | "CART_ABANDONED" | "CHECKOUT_ABANDONED";

export type AbandonedCartsFilters = {
  period: DashboardPeriod;
  stage: AbandonedCartStageFilter;
  source: string;
  campaign: string;
  q: string;
  page: number;
  pageSize: number;
};

export type AbandonedCartSnapshotItem = AnalyticsCartItemSnapshot & {
  titleLabel: string;
  quantityLabel: string;
  detailLabel?: string;
};

export type AbandonedCartListItem = {
  cartId: string;
  visitorId: string;
  sessionId: string | null;
  status: AnalyticsCartStatusEnum;
  abandonedAt: Date;
  lastActivityAt: Date;
  checkoutStartedAt: Date | null;
  subtotal: number;
  itemCount: number;
  timeToAbandonMinutes: number;
  timeToAbandonLabel: string;
  sourceLabel: string;
  campaignLabel: string;
  landingPageLabel: string;
  referrerLabel: string;
  stageLabel: string;
  statusAfterLabel: string;
  convertedOrderId: string | null;
  convertedOrderNumber: string | null;
  purchaseCompletedAt: Date | null;
  productSummary: string;
  productDetailsLabel: string;
  items: AbandonedCartSnapshotItem[];
};

export type AbandonedCartDetail = AbandonedCartListItem & {
  utmMediumLabel: string;
  utmTermLabel: string;
  utmContentLabel: string;
  orderStatusLabel: string;
  orderPaymentStatusLabel: string;
};

type AbandonedCartRow = Prisma.AnalyticsCartGetPayload<{
  select: {
    cartId: true;
    visitorId: true;
    sessionId: true;
    status: true;
    abandonedAt: true;
    lastActivityAt: true;
    checkoutStartedAt: true;
    itemCount: true;
    subtotal: true;
    itemsSnapshot: true;
    convertedOrderId: true;
    purchaseCompletedAt: true;
    session: {
      select: {
        utmSource: true;
        utmMedium: true;
        utmCampaign: true;
        utmTerm: true;
        utmContent: true;
        landingPage: true;
        referrer: true;
      };
    };
    convertedOrder: {
      select: {
        orderNumber: true;
        status: true;
        paymentStatus: true;
      };
    };
  };
}>;

function toNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value instanceof Prisma.Decimal) {
    return value.toNumber();
  }

  return typeof value === "number" ? value : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function trimOrUndefined(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : undefined;
}

function formatDateTimeShort(value: Date) {
  const date = new Intl.DateTimeFormat("es-AR", {
    timeZone: ARGENTINA_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
  const time = new Intl.DateTimeFormat("es-AR", {
    timeZone: ARGENTINA_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);

  return `${date} ${time}`;
}

function formatElapsedMinutes(minutes: number) {
  const safeMinutes = Math.max(0, Math.floor(minutes));
  const days = Math.floor(safeMinutes / 1440);
  const hours = Math.floor((safeMinutes % 1440) / 60);
  const remainderMinutes = safeMinutes % 60;

  if (days > 0) {
    return hours > 0 ? `${days} día${days === 1 ? "" : "s"} ${hours} h` : `${days} día${days === 1 ? "" : "s"}`;
  }

  if (hours > 0) {
    return remainderMinutes > 0 ? `${hours} h ${remainderMinutes} min` : `${hours} h`;
  }

  return `${remainderMinutes} min`;
}

function minutesBetween(later: Date, earlier: Date) {
  return Math.max(0, Math.round((later.getTime() - earlier.getTime()) / 60000));
}

function parseSnapshotItems(value: Prisma.JsonValue | null | undefined): AbandonedCartSnapshotItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item, index) => {
    if (!isRecord(item)) {
      return [];
    }

    const title = trimOrUndefined(item.title) ?? trimOrUndefined(item.productSlug) ?? `Producto ${index + 1}`;
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice);
    const lineTotal = Number(item.lineTotal);
    const productId = trimOrUndefined(item.productId) ?? `unknown-${index + 1}`;
    const variantLabel = trimOrUndefined(item.variantLabel);
    const variantValue = trimOrUndefined(item.variantValue);
    const sku = trimOrUndefined(item.sku);
    const productSlug = trimOrUndefined(item.productSlug);

    return [
      {
        productId,
        title,
        quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 0,
        unitPrice: Number.isFinite(unitPrice) && unitPrice >= 0 ? unitPrice : 0,
        lineTotal: Number.isFinite(lineTotal) && lineTotal >= 0 ? lineTotal : 0,
        variantId: trimOrUndefined(item.variantId) ?? null,
        sku: sku ?? null,
        productSlug: productSlug ?? null,
        variantLabel: variantLabel ?? null,
        variantValue: variantValue ?? null,
        titleLabel: title,
        quantityLabel: `x${Number.isFinite(quantity) && quantity > 0 ? quantity : 0}`,
        detailLabel: [variantLabel, variantValue, sku].filter(Boolean).join(" · ") || undefined,
      } satisfies AbandonedCartSnapshotItem,
    ];
  });
}

function buildProductSummary(items: AbandonedCartSnapshotItem[]) {
  if (items.length === 0) {
    return "Sin productos";
  }

  const summary = items
    .slice(0, 2)
    .map((item) => `${item.titleLabel} x${item.quantity}`)
    .join(" · ");

  if (items.length <= 2) {
    return summary;
  }

  return `${summary} +${items.length - 2} producto${items.length - 2 === 1 ? "" : "s"}`;
}

function buildProductDetailsLabel(items: AbandonedCartSnapshotItem[]) {
  const firstWithDetail = items.find((item) => item.detailLabel);

  return firstWithDetail?.detailLabel ?? "";
}

function normalizeSourceLabel(
  source: string | null | undefined,
  referrer: string | null | undefined,
): string {
  const utmSource = trimOrUndefined(source);

  if (utmSource) {
    return utmSource;
  }

  if (referrer) {
    try {
      const url = new URL(referrer);
      return url.hostname.replace(/^www\./, "");
    } catch {
      return referrer.slice(0, 32);
    }
  }

  return "Directo";
}

function normalizeCampaignLabel(value: string | null | undefined) {
  return trimOrUndefined(value) ?? "";
}

function normalizeLandingPageLabel(value: string | null | undefined) {
  return trimOrUndefined(value) ?? "";
}

function normalizeReferrerLabel(value: string | null | undefined) {
  return trimOrUndefined(value) ?? "";
}

function getStatusAfterLabel(cart: AbandonedCartRow) {
  if (!cart.convertedOrderId) {
    return "Sin orden";
  }

  if (cart.purchaseCompletedAt) {
    return "Comprado después";
  }

  return "Orden creada";
}

function getTimeToAbandonMinutes(cart: AbandonedCartRow) {
  if (cart.status === "CHECKOUT_ABANDONED" && cart.checkoutStartedAt) {
    return minutesBetween(cart.abandonedAt ?? cart.lastActivityAt, cart.checkoutStartedAt);
  }

  return minutesBetween(cart.abandonedAt ?? cart.lastActivityAt, cart.lastActivityAt);
}

function getTimeToAbandonLabel(cart: AbandonedCartRow) {
  return formatElapsedMinutes(getTimeToAbandonMinutes(cart));
}

function mapRow(cart: AbandonedCartRow): AbandonedCartListItem {
  const items = parseSnapshotItems(cart.itemsSnapshot);
  const sourceLabel = normalizeSourceLabel(cart.session?.utmSource, cart.session?.referrer);
  const campaignLabel = normalizeCampaignLabel(cart.session?.utmCampaign);
  const landingPageLabel = normalizeLandingPageLabel(cart.session?.landingPage);
  const referrerLabel = normalizeReferrerLabel(cart.session?.referrer);

  return {
    cartId: cart.cartId,
    visitorId: cart.visitorId,
    sessionId: cart.sessionId,
    status: cart.status,
    abandonedAt: cart.abandonedAt ?? cart.lastActivityAt,
    lastActivityAt: cart.lastActivityAt,
    checkoutStartedAt: cart.checkoutStartedAt,
    subtotal: toNumber(cart.subtotal),
    itemCount: cart.itemCount,
    timeToAbandonMinutes: getTimeToAbandonMinutes(cart),
    timeToAbandonLabel: getTimeToAbandonLabel(cart),
    sourceLabel,
    campaignLabel,
    landingPageLabel,
    referrerLabel,
    stageLabel: cart.status === "CHECKOUT_ABANDONED" ? "Checkout abandonado" : "Carrito abandonado",
    statusAfterLabel: getStatusAfterLabel(cart),
    convertedOrderId: cart.convertedOrderId,
    convertedOrderNumber: cart.convertedOrder?.orderNumber ?? null,
    purchaseCompletedAt: cart.purchaseCompletedAt,
    productSummary: buildProductSummary(items),
    productDetailsLabel: buildProductDetailsLabel(items),
    items,
  };
}

function matchesSearch(item: AbandonedCartListItem, q: string) {
  const term = q.trim().toLowerCase();

  if (!term) {
    return true;
  }

  const haystack = [
    item.cartId,
    item.sessionId ?? "",
    item.visitorId,
    item.sourceLabel,
    item.campaignLabel,
    item.landingPageLabel,
    item.referrerLabel,
    item.productSummary,
    item.productDetailsLabel,
    ...item.items.flatMap((snapshotItem) => [
      snapshotItem.productId,
      snapshotItem.titleLabel,
      snapshotItem.productSlug ?? "",
      snapshotItem.sku ?? "",
      snapshotItem.variantLabel ?? "",
      snapshotItem.variantValue ?? "",
    ]),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(term);
}

function buildDateRange(period: DashboardPeriod, now = new Date()) {
  const days = DASHBOARD_PERIODS[period].days;
  const end = new Date(now);
  const start = new Date(now);
  const shifted = new Date(start.getTime() - ARGENTINA_UTC_OFFSET_MS);
  shifted.setUTCHours(0, 0, 0, 0);
  start.setTime(shifted.getTime() + ARGENTINA_UTC_OFFSET_MS);
  start.setUTCDate(start.getUTCDate() - (days - 1));

  return { start, end };
}

export function normalizeAbandonedCartsPageSize(value: string | undefined) {
  const parsed = Number.parseInt(value ?? "", 10);

  return PAGE_SIZE_VALUES.includes(parsed as (typeof PAGE_SIZE_VALUES)[number]) ? parsed : 25;
}

export function normalizeAbandonedCartsStage(value: string | undefined): AbandonedCartStageFilter {
  if (value === "CART_ABANDONED" || value === "CHECKOUT_ABANDONED") {
    return value;
  }

  return "all";
}

export function normalizeAbandonedCartsQuery(searchParams: Record<string, string | string[] | undefined>) {
  const period = (searchParams.period as DashboardPeriod | undefined) ?? "30d";

  return {
    period: period in DASHBOARD_PERIODS ? period : "30d",
    stage: normalizeAbandonedCartsStage(Array.isArray(searchParams.stage) ? searchParams.stage[0] : searchParams.stage),
    source: (Array.isArray(searchParams.source) ? searchParams.source[0] : searchParams.source)?.trim() ?? "all",
    campaign: (Array.isArray(searchParams.campaign) ? searchParams.campaign[0] : searchParams.campaign)?.trim() ?? "all",
    q: (Array.isArray(searchParams.q) ? searchParams.q[0] : searchParams.q)?.trim() ?? "",
    page: Math.max(1, Number.parseInt(String(Array.isArray(searchParams.page) ? searchParams.page[0] : searchParams.page ?? "1"), 10) || 1),
    pageSize: normalizeAbandonedCartsPageSize(Array.isArray(searchParams.pageSize) ? searchParams.pageSize[0] : searchParams.pageSize),
  } satisfies AbandonedCartsFilters;
}

export type AbandonedCartsPageData = {
  filters: AbandonedCartsFilters;
  dateRange: {
    start: Date;
    end: Date;
  };
  totals: {
    totalCount: number;
    cartAbandonedCount: number;
    checkoutAbandonedCount: number;
    totalValue: number;
    averageTicket: number;
    totalUnits: number;
    averageTimeMinutes: number;
    averageTimeLabel: string;
  };
  pageCount: number;
  page: number;
  pageSize: number;
  carts: AbandonedCartListItem[];
  sourceOptions: string[];
  campaignOptions: string[];
};

export async function getAbandonedCartsPageData(filters: AbandonedCartsFilters): Promise<AbandonedCartsPageData> {
  const now = new Date();
  const dateRange = buildDateRange(filters.period, now);

  const rawCarts = await prisma.analyticsCart.findMany({
    where: {
      abandonedAt: {
        gte: dateRange.start,
        lte: dateRange.end,
      },
      itemCount: {
        gt: 0,
      },
      status:
        filters.stage === "all"
          ? { in: ["CART_ABANDONED", "CHECKOUT_ABANDONED"] }
          : filters.stage,
    },
    orderBy: [{ abandonedAt: "desc" }, { createdAt: "desc" }],
    select: {
      cartId: true,
      visitorId: true,
      sessionId: true,
      status: true,
      abandonedAt: true,
      lastActivityAt: true,
      checkoutStartedAt: true,
      itemCount: true,
      subtotal: true,
      itemsSnapshot: true,
      convertedOrderId: true,
      purchaseCompletedAt: true,
      session: {
        select: {
          utmSource: true,
          utmMedium: true,
          utmCampaign: true,
          utmTerm: true,
          utmContent: true,
          landingPage: true,
          referrer: true,
        },
      },
      convertedOrder: {
        select: {
          orderNumber: true,
          status: true,
          paymentStatus: true,
        },
      },
    },
  });

  const allRows = rawCarts.map(mapRow);
  const sourceOptions = Array.from(new Set(allRows.map((item) => item.sourceLabel))).sort((left, right) =>
    left.localeCompare(right),
  );
  const campaignOptions = Array.from(new Set(allRows.map((item) => item.campaignLabel).filter((value) => value !== "—"))).sort((left, right) =>
    left.localeCompare(right),
  );

  const filteredRows = allRows
    .filter((item) => (filters.source === "all" ? true : item.sourceLabel === filters.source))
    .filter((item) => (filters.campaign === "all" ? true : item.campaignLabel === filters.campaign))
    .filter((item) => matchesSearch(item, filters.q))
    .sort((left, right) => {
      const leftTime = left.abandonedAt.getTime();
      const rightTime = right.abandonedAt.getTime();

      return rightTime - leftTime || right.timeToAbandonMinutes - left.timeToAbandonMinutes;
    });

  const totalCount = filteredRows.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / filters.pageSize));
  const page = Math.min(filters.page, pageCount);
  const startIndex = (page - 1) * filters.pageSize;
  const carts = filteredRows.slice(startIndex, startIndex + filters.pageSize);

  const cartAbandonedCount = filteredRows.filter((item) => item.status === "CART_ABANDONED").length;
  const checkoutAbandonedCount = filteredRows.filter((item) => item.status === "CHECKOUT_ABANDONED").length;
  const totalValue = filteredRows.reduce((accumulator, item) => accumulator + item.subtotal, 0);
  const totalUnits = filteredRows.reduce((accumulator, item) => accumulator + item.itemCount, 0);
  const averageTicket = totalCount > 0 ? totalValue / totalCount : 0;
  const averageTimeMinutes =
    totalCount > 0
      ? filteredRows.reduce((accumulator, item) => accumulator + item.timeToAbandonMinutes, 0) / totalCount
      : 0;
  const averageTimeLabel = formatElapsedMinutes(averageTimeMinutes);

  return {
    filters: {
      ...filters,
      page,
      pageSize: filters.pageSize,
    },
    dateRange,
    totals: {
      totalCount,
      cartAbandonedCount,
      checkoutAbandonedCount,
      totalValue,
      averageTicket,
      totalUnits,
      averageTimeMinutes,
      averageTimeLabel,
    },
    pageCount,
    page,
    pageSize: filters.pageSize,
    carts,
    sourceOptions,
    campaignOptions,
  };
}

export async function getAbandonedCartDetail(cartId: string) {
  const cart = await prisma.analyticsCart.findUnique({
    where: { cartId },
    select: {
      cartId: true,
      visitorId: true,
      sessionId: true,
      status: true,
      abandonedAt: true,
      lastActivityAt: true,
      checkoutStartedAt: true,
      itemCount: true,
      subtotal: true,
      itemsSnapshot: true,
      convertedOrderId: true,
      purchaseCompletedAt: true,
      session: {
        select: {
          utmSource: true,
          utmMedium: true,
          utmCampaign: true,
          utmTerm: true,
          utmContent: true,
          landingPage: true,
          referrer: true,
        },
      },
      convertedOrder: {
        select: {
          orderNumber: true,
          status: true,
          paymentStatus: true,
          createdAt: true,
        },
      },
    },
  });

  if (!cart) {
    return null;
  }

  const listItem = mapRow(cart);

  return {
    ...listItem,
    utmMediumLabel: trimOrUndefined(cart.session?.utmMedium) ?? "",
    utmTermLabel: trimOrUndefined(cart.session?.utmTerm) ?? "",
    utmContentLabel: trimOrUndefined(cart.session?.utmContent) ?? "",
    orderStatusLabel: cart.convertedOrder?.status ?? "",
    orderPaymentStatusLabel: cart.convertedOrder?.paymentStatus ?? "",
  } satisfies AbandonedCartDetail;
}

export function formatAbandonedCartDateTime(value: Date) {
  return formatDateTimeShort(value);
}

export function formatAbandonedCartDuration(minutes: number) {
  return formatElapsedMinutes(minutes);
}
