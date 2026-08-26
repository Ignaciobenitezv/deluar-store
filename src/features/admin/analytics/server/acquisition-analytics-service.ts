import { AnalyticsEventType, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import {
  DASHBOARD_PERIODS,
  type DashboardPeriod,
} from "@/features/admin/dashboard/server/dashboard-service";

const ARGENTINA_UTC_OFFSET_MS = 3 * 60 * 60 * 1000;
const MIN_SESSIONS_FOR_CONVERSION_RANK = 10;
const SOURCE_ROW_LIMIT = 12;
const CAMPAIGN_ROW_LIMIT = 10;
const LANDING_ROW_LIMIT = 10;
const REFERRER_ROW_LIMIT = 10;

export type AcquisitionSortKey = "revenue" | "sessions" | "purchases" | "conversion" | "abandonments";

export type AcquisitionFilters = {
  period: DashboardPeriod;
  sort: AcquisitionSortKey;
};

export type AcquisitionSummary = {
  sessions: number;
  uniqueVisitors: number;
  addToCartSessions: number;
  checkoutStartedSessions: number;
  orders: number;
  purchases: number;
  conversionRate: number;
  billingTotal: number;
  averageTicket: number;
  cartAbandoned: number;
  checkoutAbandoned: number;
  cartAbandonmentRate: number;
  checkoutAbandonmentRate: number;
};

export type AcquisitionSourceRow = {
  source: string;
  medium: string;
  sessions: number;
  visitors: number;
  addToCart: number;
  checkoutStarted: number;
  orders: number;
  purchases: number;
  conversionRate: number;
  billingTotal: number;
  averageTicket: number;
  abandonments: number;
  cartAbandoned: number;
  checkoutAbandoned: number;
  cartAbandonmentRate: number;
  checkoutAbandonmentRate: number;
  cartOpportunityCount: number;
  checkoutOpportunityCount: number;
};

export type AcquisitionCampaignRow = {
  campaign: string;
  source: string;
  medium: string;
  sessions: number;
  addToCart: number;
  checkoutStarted: number;
  orders: number;
  purchases: number;
  conversionRate: number;
  billingTotal: number;
  averageTicket: number;
};

export type AcquisitionLandingPageRow = {
  landingPage: string;
  sessions: number;
  addToCart: number;
  purchases: number;
  conversionRate: number;
  billingTotal: number;
};

export type AcquisitionReferrerRow = {
  referrer: string;
  sessions: number;
  purchases: number;
  billingTotal: number;
};

export type AcquisitionHighlight = {
  label: string;
  subtitle: string;
  value: string;
  href?: string;
};

export type AcquisitionAnalyticsMetrics = {
  period: DashboardPeriod;
  dateRange: {
    start: Date;
    end: Date;
  };
  summary: AcquisitionSummary;
  sources: AcquisitionSourceRow[];
  campaigns: AcquisitionCampaignRow[];
  landingPages: AcquisitionLandingPageRow[];
  referrers: AcquisitionReferrerRow[];
  highlights: {
    traffic: AcquisitionHighlight | null;
    purchases: AcquisitionHighlight | null;
    conversion: AcquisitionHighlight | null;
    revenue: AcquisitionHighlight | null;
  };
  sampleSizeRule: {
    minSessionsForConversionRank: number;
  };
  notes: {
    attributionModel: string;
    conversionDefinition: string;
    abandonmentDefinition: string;
    limitation: string;
  };
};

type SessionRow = Prisma.AnalyticsSessionGetPayload<{
  select: {
    sessionId: true;
    visitorId: true;
    startedAt: true;
    landingPage: true;
    referrer: true;
    utmSource: true;
    utmMedium: true;
    utmCampaign: true;
  };
}>;

type EventRow = Prisma.AnalyticsEventGetPayload<{
  select: {
    type: true;
    sessionId: true;
  };
}>;

type CartRow = Prisma.AnalyticsCartGetPayload<{
  select: {
    cartId: true;
    sessionId: true;
    status: true;
    itemCount: true;
    subtotal: true;
    checkoutStartedAt: true;
    convertedOrderId: true;
    purchaseCompletedAt: true;
    convertedOrder: {
      select: {
        total: true;
      };
    };
  };
}>;

type AcquisitionBucket = {
  source: string;
  medium: string;
  campaign: string;
  landingPage: string;
  referrer: string;
  sessions: number;
  visitors: Set<string>;
  addToCartSessions: Set<string>;
  checkoutStartedSessions: Set<string>;
  orderIds: Set<string>;
  purchaseOrderIds: Set<string>;
  purchaseSessionIds: Set<string>;
  billingTotal: number;
  cartOpportunityIds: Set<string>;
  checkoutOpportunityIds: Set<string>;
  cartAbandonedIds: Set<string>;
  checkoutAbandonedIds: Set<string>;
  cartAbandonedValue: number;
  checkoutAbandonedValue: number;
  cartAbandonedUnits: number;
  checkoutAbandonedUnits: number;
};

type BucketKey = {
  sourceKey: string;
  campaignKey: string;
  landingPageKey: string;
  referrerKey: string;
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

function trimOrUndefined(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function titleCase(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((word) => word.slice(0, 1).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function normalizeSourceLabel(source: string | null | undefined, referrer: string | null | undefined) {
  const utmSource = trimOrUndefined(source);

  if (utmSource) {
    return titleCase(utmSource);
  }

  const referrerHost = normalizeReferrerHost(referrer);

  if (referrerHost) {
    return referrerHost;
  }

  return "Directo";
}

function normalizeMediumLabel(value: string | null | undefined) {
  return trimOrUndefined(value) ? titleCase(trimOrUndefined(value) as string) : "";
}

function normalizeCampaignLabel(value: string | null | undefined) {
  return trimOrUndefined(value) ? titleCase(trimOrUndefined(value) as string) : "Sin campaña";
}

function normalizeLandingPageLabel(value: string | null | undefined) {
  const raw = trimOrUndefined(value);

  if (!raw) {
    return "/";
  }

  try {
    const url = new URL(raw, env.siteUrl);

    if (url.origin === new URL(env.siteUrl).origin) {
      return url.pathname.replace(/\/+$/, "") || "/";
    }

    return `${url.hostname.replace(/^www\./, "")}${url.pathname.replace(/\/+$/, "") || "/"}`;
  } catch {
    return raw.length > 80 ? `${raw.slice(0, 77)}...` : raw;
  }
}

function normalizeReferrerHost(value: string | null | undefined) {
  const raw = trimOrUndefined(value);

  if (!raw) {
    return undefined;
  }

  try {
    const url = new URL(raw);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

function normalizeReferrerLabel(value: string | null | undefined) {
  return normalizeReferrerHost(value) ?? "Directo";
}

function createBucket(params: {
  source: string;
  medium: string;
  campaign: string;
  landingPage: string;
  referrer: string;
}): AcquisitionBucket {
  return {
    ...params,
    sessions: 0,
    visitors: new Set<string>(),
    addToCartSessions: new Set<string>(),
    checkoutStartedSessions: new Set<string>(),
    orderIds: new Set<string>(),
    purchaseOrderIds: new Set<string>(),
    purchaseSessionIds: new Set<string>(),
    billingTotal: 0,
    cartOpportunityIds: new Set<string>(),
    checkoutOpportunityIds: new Set<string>(),
    cartAbandonedIds: new Set<string>(),
    checkoutAbandonedIds: new Set<string>(),
    cartAbandonedValue: 0,
    checkoutAbandonedValue: 0,
    cartAbandonedUnits: 0,
    checkoutAbandonedUnits: 0,
  };
}

function bucketKeyForSession(session: SessionRow): BucketKey {
  const source = normalizeSourceLabel(session.utmSource, session.referrer);
  const medium = normalizeMediumLabel(session.utmMedium);
  const campaign = normalizeCampaignLabel(session.utmCampaign);
  const landingPage = normalizeLandingPageLabel(session.landingPage);
  const referrer = normalizeReferrerLabel(session.referrer);

  return {
    sourceKey: `${source}::${medium}`,
    campaignKey: `${campaign}::${source}::${medium}`,
    landingPageKey: landingPage,
    referrerKey: referrer,
  };
}

function compareNumbersDesc(left: number, right: number) {
  return right - left;
}

function compareStringsAsc(left: string, right: string) {
  return left.localeCompare(right);
}

function finalizeBucket(bucket: AcquisitionBucket) {
  const sessions = bucket.sessions;
  const visitors = bucket.visitors.size;
  const addToCart = bucket.addToCartSessions.size;
  const checkoutStarted = bucket.checkoutStartedSessions.size;
  const orders = bucket.orderIds.size;
  const purchases = bucket.purchaseOrderIds.size;
  const conversionRate = safeRate(bucket.purchaseSessionIds.size, sessions);
  const averageTicket = purchases > 0 ? bucket.billingTotal / purchases : 0;
  const cartAbandoned = bucket.cartAbandonedIds.size;
  const checkoutAbandoned = bucket.checkoutAbandonedIds.size;
  const cartAbandonmentRate = safeRate(cartAbandoned, bucket.cartOpportunityIds.size);
  const checkoutAbandonmentRate = safeRate(checkoutAbandoned, bucket.checkoutOpportunityIds.size);

  return {
    source: bucket.source,
    medium: bucket.medium,
    campaign: bucket.campaign,
    landingPage: bucket.landingPage,
    referrer: bucket.referrer,
    sessions,
    visitors,
    addToCart,
    checkoutStarted,
    orders,
    purchases,
    conversionRate,
    billingTotal: bucket.billingTotal,
    averageTicket,
    abandonments: cartAbandoned + checkoutAbandoned,
    cartAbandoned,
    checkoutAbandoned,
    cartAbandonmentRate,
    checkoutAbandonmentRate,
    cartOpportunityCount: bucket.cartOpportunityIds.size,
    checkoutOpportunityCount: bucket.checkoutOpportunityIds.size,
  };
}

function sortSourceRows(rows: AcquisitionSourceRow[], sort: AcquisitionSortKey) {
  return [...rows].sort((left, right) => {
    switch (sort) {
      case "sessions":
        return compareNumbersDesc(left.sessions, right.sessions) || compareNumbersDesc(left.billingTotal, right.billingTotal) || compareStringsAsc(left.source, right.source);
      case "purchases":
        return compareNumbersDesc(left.purchases, right.purchases) || compareNumbersDesc(left.sessions, right.sessions) || compareStringsAsc(left.source, right.source);
      case "conversion":
        if (left.sessions >= MIN_SESSIONS_FOR_CONVERSION_RANK && right.sessions < MIN_SESSIONS_FOR_CONVERSION_RANK) {
          return -1;
        }

        if (right.sessions >= MIN_SESSIONS_FOR_CONVERSION_RANK && left.sessions < MIN_SESSIONS_FOR_CONVERSION_RANK) {
          return 1;
        }

        return compareNumbersDesc(left.conversionRate, right.conversionRate) || compareNumbersDesc(left.sessions, right.sessions) || compareNumbersDesc(left.purchases, right.purchases) || compareStringsAsc(left.source, right.source);
      case "abandonments":
        return compareNumbersDesc(left.abandonments, right.abandonments) || compareNumbersDesc(left.billingTotal, right.billingTotal) || compareStringsAsc(left.source, right.source);
      case "revenue":
      default:
        return compareNumbersDesc(left.billingTotal, right.billingTotal) || compareNumbersDesc(left.sessions, right.sessions) || compareStringsAsc(left.source, right.source);
    }
  });
}

function toSourceRow(row: ReturnType<typeof finalizeBucket>): AcquisitionSourceRow {
  return {
    source: row.source,
    medium: row.medium,
    sessions: row.sessions,
    visitors: row.visitors,
    addToCart: row.addToCart,
    checkoutStarted: row.checkoutStarted,
    orders: row.orders,
    purchases: row.purchases,
    conversionRate: row.conversionRate,
    billingTotal: row.billingTotal,
    averageTicket: row.averageTicket,
    abandonments: row.abandonments,
    cartAbandoned: row.cartAbandoned,
    checkoutAbandoned: row.checkoutAbandoned,
    cartAbandonmentRate: row.cartAbandonmentRate,
    checkoutAbandonmentRate: row.checkoutAbandonmentRate,
    cartOpportunityCount: row.cartOpportunityCount,
    checkoutOpportunityCount: row.checkoutOpportunityCount,
  };
}

function toCampaignRow(row: ReturnType<typeof finalizeBucket>): AcquisitionCampaignRow {
  return {
    campaign: row.campaign,
    source: row.source,
    medium: row.medium,
    sessions: row.sessions,
    addToCart: row.addToCart,
    checkoutStarted: row.checkoutStarted,
    orders: row.orders,
    purchases: row.purchases,
    conversionRate: row.conversionRate,
    billingTotal: row.billingTotal,
    averageTicket: row.averageTicket,
  };
}

function toLandingPageRow(row: ReturnType<typeof finalizeBucket>): AcquisitionLandingPageRow {
  return {
    landingPage: row.landingPage,
    sessions: row.sessions,
    addToCart: row.addToCart,
    purchases: row.purchases,
    conversionRate: row.conversionRate,
    billingTotal: row.billingTotal,
  };
}

function toReferrerRow(row: ReturnType<typeof finalizeBucket>): AcquisitionReferrerRow {
  return {
    referrer: row.referrer,
    sessions: row.sessions,
    purchases: row.purchases,
    billingTotal: row.billingTotal,
  };
}

function getTopWithMinimumSample(rows: AcquisitionSourceRow[]) {
  const eligible = rows.filter((row) => row.sessions >= MIN_SESSIONS_FOR_CONVERSION_RANK);

  return {
    traffic: [...rows].sort((left, right) => compareNumbersDesc(left.sessions, right.sessions) || compareNumbersDesc(left.billingTotal, right.billingTotal))[0] ?? null,
    purchases: [...rows].sort((left, right) => compareNumbersDesc(left.purchases, right.purchases) || compareNumbersDesc(left.sessions, right.sessions))[0] ?? null,
    conversion: eligible
      .sort((left, right) => compareNumbersDesc(left.conversionRate, right.conversionRate) || compareNumbersDesc(left.sessions, right.sessions))[0] ?? null,
    revenue: [...rows].sort((left, right) => compareNumbersDesc(left.billingTotal, right.billingTotal) || compareNumbersDesc(left.sessions, right.sessions))[0] ?? null,
  };
}

export function normalizeAcquisitionSortKey(value: string | undefined): AcquisitionSortKey {
  if (value === "sessions" || value === "purchases" || value === "conversion" || value === "abandonments") {
    return value;
  }

  return "revenue";
}

export function normalizeAcquisitionQuery(searchParams: Record<string, string | string[] | undefined>) {
  const period = (searchParams.period as DashboardPeriod | undefined) ?? "30d";

  return {
    period: period in DASHBOARD_PERIODS ? period : "30d",
    sort: normalizeAcquisitionSortKey(Array.isArray(searchParams.sort) ? searchParams.sort[0] : searchParams.sort),
  } satisfies AcquisitionFilters;
}

export async function getAcquisitionAnalyticsPageData(filters: AcquisitionFilters): Promise<AcquisitionAnalyticsMetrics> {
  const now = new Date();
  const start = getPeriodStart(filters.period, now);
  const end = now;

  const sessions = await prisma.analyticsSession.findMany({
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
      landingPage: true,
      referrer: true,
      utmSource: true,
      utmMedium: true,
      utmCampaign: true,
    },
  });

  const sessionIds = sessions.map((session) => session.sessionId);

  const [events, carts] = await Promise.all([
    sessionIds.length > 0
      ? prisma.analyticsEvent.findMany({
          where: {
            sessionId: {
              in: sessionIds,
            },
            type: {
              in: [AnalyticsEventType.ADD_TO_CART, AnalyticsEventType.CHECKOUT_STARTED],
            },
          },
          select: {
            type: true,
            sessionId: true,
          },
        })
      : Promise.resolve([] as EventRow[]),
    sessionIds.length > 0
      ? prisma.analyticsCart.findMany({
          where: {
            sessionId: {
              in: sessionIds,
            },
          },
          select: {
            cartId: true,
            sessionId: true,
            status: true,
            itemCount: true,
            subtotal: true,
            checkoutStartedAt: true,
            convertedOrderId: true,
            purchaseCompletedAt: true,
            convertedOrder: {
              select: {
                total: true,
              },
            },
          },
        })
      : Promise.resolve([] as CartRow[]),
  ]);

  const sessionById = new Map<string, SessionRow>();
  const sourceBuckets = new Map<string, AcquisitionBucket>();
  const campaignBuckets = new Map<string, AcquisitionBucket>();
  const landingPageBuckets = new Map<string, AcquisitionBucket>();
  const referrerBuckets = new Map<string, AcquisitionBucket>();

  for (const session of sessions) {
    sessionById.set(session.sessionId, session);

    const labels = bucketKeyForSession(session);
    const source = normalizeSourceLabel(session.utmSource, session.referrer);
    const medium = normalizeMediumLabel(session.utmMedium);
    const campaign = normalizeCampaignLabel(session.utmCampaign);
    const landingPage = normalizeLandingPageLabel(session.landingPage);
    const referrer = normalizeReferrerLabel(session.referrer);

    const sourceBucket = sourceBuckets.get(labels.sourceKey) ?? createBucket({ source, medium, campaign: "", landingPage: "", referrer: "" });
    sourceBucket.sessions += 1;
    sourceBucket.visitors.add(session.visitorId);
    sourceBuckets.set(labels.sourceKey, sourceBucket);

    const campaignBucket = campaignBuckets.get(labels.campaignKey) ?? createBucket({ source, medium, campaign, landingPage: "", referrer: "" });
    campaignBucket.sessions += 1;
    campaignBucket.visitors.add(session.visitorId);
    campaignBuckets.set(labels.campaignKey, campaignBucket);

    const landingBucket = landingPageBuckets.get(labels.landingPageKey) ?? createBucket({ source: "", medium: "", campaign: "", landingPage, referrer: "" });
    landingBucket.sessions += 1;
    landingBucket.visitors.add(session.visitorId);
    landingPageBuckets.set(labels.landingPageKey, landingBucket);

    const referrerBucket = referrerBuckets.get(labels.referrerKey) ?? createBucket({ source: "", medium: "", campaign: "", landingPage: "", referrer });
    referrerBucket.sessions += 1;
    referrerBucket.visitors.add(session.visitorId);
    referrerBuckets.set(labels.referrerKey, referrerBucket);
  }

  for (const event of events) {
    const session = sessionById.get(event.sessionId);

    if (!session) {
      continue;
    }

    const labels = bucketKeyForSession(session);
    const sourceBucket = sourceBuckets.get(labels.sourceKey);
    const campaignBucket = campaignBuckets.get(labels.campaignKey);
    const landingBucket = landingPageBuckets.get(labels.landingPageKey);
    const referrerBucket = referrerBuckets.get(labels.referrerKey);

    if (event.type === AnalyticsEventType.ADD_TO_CART) {
      sourceBucket?.addToCartSessions.add(event.sessionId);
      campaignBucket?.addToCartSessions.add(event.sessionId);
      landingBucket?.addToCartSessions.add(event.sessionId);
      referrerBucket?.addToCartSessions.add(event.sessionId);
    }

    if (event.type === AnalyticsEventType.CHECKOUT_STARTED) {
      sourceBucket?.checkoutStartedSessions.add(event.sessionId);
      campaignBucket?.checkoutStartedSessions.add(event.sessionId);
      landingBucket?.checkoutStartedSessions.add(event.sessionId);
      referrerBucket?.checkoutStartedSessions.add(event.sessionId);
    }
  }

  for (const cart of carts) {
    if (!cart.sessionId) {
      continue;
    }

    const session = sessionById.get(cart.sessionId);

    if (!session) {
      continue;
    }

    const labels = bucketKeyForSession(session);
    const sourceBucket = sourceBuckets.get(labels.sourceKey);
    const campaignBucket = campaignBuckets.get(labels.campaignKey);
    const landingBucket = landingPageBuckets.get(labels.landingPageKey);
    const referrerBucket = referrerBuckets.get(labels.referrerKey);
    const subtotal = toNumber(cart.subtotal);
    const orderId = cart.convertedOrderId ?? undefined;
    const isPurchased = Boolean(cart.purchaseCompletedAt && orderId);
    const isAbandonedCart = cart.status === "CART_ABANDONED";
    const isCheckoutAbandoned = cart.status === "CHECKOUT_ABANDONED";
    const hasCartOpportunity = cart.itemCount > 0;
    const hasCheckoutOpportunity = Boolean(cart.checkoutStartedAt);

    if (hasCartOpportunity) {
      sourceBucket?.cartOpportunityIds.add(cart.cartId);
      campaignBucket?.cartOpportunityIds.add(cart.cartId);
      landingBucket?.cartOpportunityIds.add(cart.cartId);
      referrerBucket?.cartOpportunityIds.add(cart.cartId);
    }

    if (hasCheckoutOpportunity) {
      sourceBucket?.checkoutOpportunityIds.add(cart.cartId);
      campaignBucket?.checkoutOpportunityIds.add(cart.cartId);
      landingBucket?.checkoutOpportunityIds.add(cart.cartId);
      referrerBucket?.checkoutOpportunityIds.add(cart.cartId);
    }

    if (orderId) {
      sourceBucket?.orderIds.add(orderId);
      campaignBucket?.orderIds.add(orderId);
      landingBucket?.orderIds.add(orderId);
      referrerBucket?.orderIds.add(orderId);
    }

    if (isPurchased && orderId) {
      sourceBucket?.purchaseOrderIds.add(orderId);
      campaignBucket?.purchaseOrderIds.add(orderId);
      landingBucket?.purchaseOrderIds.add(orderId);
      referrerBucket?.purchaseOrderIds.add(orderId);
      sourceBucket?.purchaseSessionIds.add(cart.sessionId);
      campaignBucket?.purchaseSessionIds.add(cart.sessionId);
      landingBucket?.purchaseSessionIds.add(cart.sessionId);
      referrerBucket?.purchaseSessionIds.add(cart.sessionId);
      const orderTotal = toNumber(cart.convertedOrder?.total);
      if (sourceBucket) {
        sourceBucket.billingTotal += orderTotal;
      }
      if (campaignBucket) {
        campaignBucket.billingTotal += orderTotal;
      }
      if (landingBucket) {
        landingBucket.billingTotal += orderTotal;
      }
      if (referrerBucket) {
        referrerBucket.billingTotal += orderTotal;
      }
    }

    if (isAbandonedCart) {
      sourceBucket?.cartAbandonedIds.add(cart.cartId);
      campaignBucket?.cartAbandonedIds.add(cart.cartId);
      landingBucket?.cartAbandonedIds.add(cart.cartId);
      referrerBucket?.cartAbandonedIds.add(cart.cartId);
      if (sourceBucket) {
        sourceBucket.cartAbandonedValue += subtotal;
        sourceBucket.cartAbandonedUnits += cart.itemCount;
      }
      if (campaignBucket) {
        campaignBucket.cartAbandonedValue += subtotal;
        campaignBucket.cartAbandonedUnits += cart.itemCount;
      }
      if (landingBucket) {
        landingBucket.cartAbandonedValue += subtotal;
        landingBucket.cartAbandonedUnits += cart.itemCount;
      }
      if (referrerBucket) {
        referrerBucket.cartAbandonedValue += subtotal;
        referrerBucket.cartAbandonedUnits += cart.itemCount;
      }
    }

    if (isCheckoutAbandoned) {
      sourceBucket?.checkoutAbandonedIds.add(cart.cartId);
      campaignBucket?.checkoutAbandonedIds.add(cart.cartId);
      landingBucket?.checkoutAbandonedIds.add(cart.cartId);
      referrerBucket?.checkoutAbandonedIds.add(cart.cartId);
      if (sourceBucket) {
        sourceBucket.checkoutAbandonedValue += subtotal;
        sourceBucket.checkoutAbandonedUnits += cart.itemCount;
      }
      if (campaignBucket) {
        campaignBucket.checkoutAbandonedValue += subtotal;
        campaignBucket.checkoutAbandonedUnits += cart.itemCount;
      }
      if (landingBucket) {
        landingBucket.checkoutAbandonedValue += subtotal;
        landingBucket.checkoutAbandonedUnits += cart.itemCount;
      }
      if (referrerBucket) {
        referrerBucket.checkoutAbandonedValue += subtotal;
        referrerBucket.checkoutAbandonedUnits += cart.itemCount;
      }
    }
  }

  const finalizedSources = [...sourceBuckets.values()].map(finalizeBucket);
  const finalizedCampaigns = [...campaignBuckets.values()].map(finalizeBucket);
  const finalizedLandingPages = [...landingPageBuckets.values()].map(finalizeBucket);
  const finalizedReferrers = [...referrerBuckets.values()].map(finalizeBucket);

  finalizedSources.sort((left, right) => compareNumbersDesc(left.billingTotal, right.billingTotal) || compareNumbersDesc(left.sessions, right.sessions) || compareStringsAsc(left.source, right.source));
  finalizedCampaigns.sort((left, right) => compareNumbersDesc(left.billingTotal, right.billingTotal) || compareNumbersDesc(left.sessions, right.sessions) || compareStringsAsc(left.campaign, right.campaign));
  finalizedLandingPages.sort((left, right) => compareNumbersDesc(left.billingTotal, right.billingTotal) || compareNumbersDesc(left.sessions, right.sessions) || compareStringsAsc(left.landingPage, right.landingPage));
  finalizedReferrers.sort((left, right) => compareNumbersDesc(left.sessions, right.sessions) || compareNumbersDesc(left.billingTotal, right.billingTotal) || compareStringsAsc(left.referrer, right.referrer));

  const allSourceRows = finalizedSources.map(toSourceRow);
  const sourceRows = sortSourceRows(allSourceRows, filters.sort).slice(0, SOURCE_ROW_LIMIT);
  const campaignRows = finalizedCampaigns.map(toCampaignRow).slice(0, CAMPAIGN_ROW_LIMIT);
  const landingPages = finalizedLandingPages.map(toLandingPageRow).slice(0, LANDING_ROW_LIMIT);
  const referrers = finalizedReferrers.map(toReferrerRow).slice(0, REFERRER_ROW_LIMIT);
  const highlights = getTopWithMinimumSample(allSourceRows);

  const totalSessions = sessions.length;
  const uniqueVisitors = new Set(sessions.map((session) => session.visitorId)).size;
  const addToCartSessions = allSourceRows.reduce((accumulator, row) => accumulator + row.addToCart, 0);
  const checkoutStartedSessions = allSourceRows.reduce((accumulator, row) => accumulator + row.checkoutStarted, 0);
  const orders = allSourceRows.reduce((accumulator, row) => accumulator + row.orders, 0);
  const purchases = allSourceRows.reduce((accumulator, row) => accumulator + row.purchases, 0);
  const billingTotal = allSourceRows.reduce((accumulator, row) => accumulator + row.billingTotal, 0);
  const cartAbandoned = allSourceRows.reduce((accumulator, row) => accumulator + row.cartAbandoned, 0);
  const checkoutAbandoned = allSourceRows.reduce((accumulator, row) => accumulator + row.checkoutAbandoned, 0);
  const cartOpportunityCount = allSourceRows.reduce((accumulator, row) => accumulator + row.cartOpportunityCount, 0);
  const checkoutOpportunityCount = allSourceRows.reduce((accumulator, row) => accumulator + row.checkoutOpportunityCount, 0);

  const summary: AcquisitionSummary = {
    sessions: totalSessions,
    uniqueVisitors,
    addToCartSessions,
    checkoutStartedSessions,
    orders,
    purchases,
    conversionRate: safeRate(purchases, totalSessions),
    billingTotal,
    averageTicket: purchases > 0 ? billingTotal / purchases : 0,
    cartAbandoned,
    checkoutAbandoned,
    cartAbandonmentRate: safeRate(cartAbandoned, cartOpportunityCount),
    checkoutAbandonmentRate: safeRate(checkoutAbandoned, checkoutOpportunityCount),
  };

  return {
    period: filters.period,
    dateRange: {
      start,
      end,
    },
    summary,
    sources: sourceRows,
    campaigns: campaignRows,
    landingPages,
    referrers,
    highlights: {
      traffic: highlights.traffic
        ? {
            label: "Fuente con más tráfico",
            subtitle: `${highlights.traffic.sessions} sesiones`,
            value: highlights.traffic.source,
          }
        : null,
      purchases: highlights.purchases
        ? {
            label: "Fuente con más compras",
            subtitle: `${highlights.purchases.purchases} compras`,
            value: highlights.purchases.source,
          }
        : null,
      conversion: highlights.conversion
        ? {
            label: "Mejor conversión",
            subtitle: `${highlights.conversion.sessions} sesiones mínimas`,
            value: highlights.conversion.source,
          }
        : null,
      revenue: highlights.revenue
        ? {
            label: "Fuente con más facturación",
            subtitle: `${highlights.revenue.billingTotal.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 })}`,
            value: highlights.revenue.source,
          }
        : null,
    },
    sampleSizeRule: {
      minSessionsForConversionRank: MIN_SESSIONS_FOR_CONVERSION_RANK,
    },
    notes: {
      attributionModel:
        "Session attribution: cada sesión conserva su utmSource/utmMedium/utmCampaign/referrer/landingPage y toda conversión posterior de esa sesión se atribuye a ese origen.",
      conversionDefinition:
        "Conversión = sesiones con PURCHASE_COMPLETED / sesiones totales de la cohorte del período. Las compras y la facturación se atribuyen vía AnalyticsSession -> AnalyticsCart -> Order.",
      abandonmentDefinition:
        "Abandono por fuente = carritos abandonados y checkouts abandonados vinculados a la sesión atribuida. La tasa de carrito usa cartIds con itemCount > 0 como oportunidad y la tasa de checkout usa cartIds con checkoutStartedAt.",
      limitation:
        "No hay atribución multi-touch ni inferencia de canal. Si falta sessionId en un carrito/orden, ese dato no se atribuye a una fuente, campaña o landing page.",
    },
  };
}
