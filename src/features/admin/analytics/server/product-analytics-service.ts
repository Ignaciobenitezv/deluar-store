import { Prisma } from "@/generated/prisma/client";
import { getSanityImageUrl } from "@/integrations/sanity/image";
import { adminProductsInventoryQuery } from "@/integrations/sanity/admin-queries";
import { sanityFreshFetch } from "@/integrations/sanity/client";
import { DASHBOARD_PERIODS, type DashboardPeriod } from "@/features/admin/dashboard/server/dashboard-service";
import { isPaidOrder } from "@/features/orders/server/order-state-helpers";
import type { ProductDocument } from "@/types/cms";
import { prisma } from "@/lib/prisma";

const ARGENTINA_UTC_OFFSET_MS = 3 * 60 * 60 * 1000;

export const PRODUCT_ANALYTICS_PAGE_SIZES = [10, 25, 50] as const;

export const PRODUCT_ANALYTICS_SORT_OPTIONS = [
  { value: "revenue", label: "Facturación" },
  { value: "views", label: "Vistas" },
  { value: "addToCart", label: "Al carrito" },
  { value: "purchases", label: "Compras" },
  { value: "abandonments", label: "Abandonos" },
] as const;

export type ProductAnalyticsSortKey = (typeof PRODUCT_ANALYTICS_SORT_OPTIONS)[number]["value"];

export type ProductAnalyticsFilters = {
  period: DashboardPeriod;
  sort: ProductAnalyticsSortKey;
  page: number;
  pageSize: number;
};

export type ProductAnalyticsVariantRow = {
  variantId: string | null;
  variantLabel: string;
  variantValue: string | null;
  sku: string | null;
  views: number;
  viewSessions: number;
  addToCart: number;
  addSessions: number;
  addCarts: number;
  removals: number;
  purchases: number;
  unitsSold: number;
  revenue: number;
  abandonedCarts: number;
  abandonedUnits: number;
  abandonedRevenue: number;
};

export type ProductOpportunityKey =
  | "many_views_low_cart"
  | "high_cart_low_purchase"
  | "many_abandons"
  | "good_conversion";

export type ProductAnalyticsRow = {
  productId: string;
  productName: string;
  productSlug: string;
  imageUrl: string | null;
  views: number;
  viewSessions: number;
  addToCart: number;
  addSessions: number;
  addCarts: number;
  removals: number;
  purchases: number;
  unitsSold: number;
  revenue: number;
  abandonedCarts: number;
  abandonedUnits: number;
  abandonedRevenue: number;
  viewToCartRate: number | null;
  cartToPurchaseRate: number | null;
  addToPurchaseRate: number | null;
  abandonmentRate: number | null;
  opportunityTags: ProductOpportunityKey[];
  variants: ProductAnalyticsVariantRow[];
};

export type ProductAnalyticsMetricSeriesPoint = {
  productId: string;
  productName: string;
  productSlug: string;
  value: number;
};

export type ProductAnalyticsPageData = {
  filters: ProductAnalyticsFilters;
  dateRange: {
    start: Date;
    end: Date;
  };
  sortKey: ProductAnalyticsSortKey;
  totals: {
    products: number;
    views: number;
    addToCart: number;
    removals: number;
    purchases: number;
    unitsSold: number;
    revenue: number;
    abandonedCarts: number;
    abandonedUnits: number;
    abandonedRevenue: number;
    viewToCartRate: number | null;
    cartToPurchaseRate: number | null;
  };
  page: number;
  pageSize: number;
  pageCount: number;
  products: ProductAnalyticsRow[];
  charts: {
    topViewed: ProductAnalyticsMetricSeriesPoint[];
    topAdded: ProductAnalyticsMetricSeriesPoint[];
    topSold: ProductAnalyticsMetricSeriesPoint[];
    topAbandoned: ProductAnalyticsMetricSeriesPoint[];
  };
  opportunities: {
    manyViewsLowCart: ProductAnalyticsRow[];
    highCartLowPurchase: ProductAnalyticsRow[];
    manyAbandons: ProductAnalyticsRow[];
    goodConversion: ProductAnalyticsRow[];
  };
};

type ProductInventoryItem = Pick<ProductDocument, "_id" | "title" | "slug" | "images">;

type ProductNameSeed = {
  productName?: string | null;
  productSlug?: string | null;
  imageUrl?: string | null;
};

type RawProductStats = {
  productId: string;
  productName: string | null;
  productSlug: string | null;
  imageUrl: string | null;
  views: number;
  viewSessions: Set<string>;
  addToCart: number;
  addSessions: Set<string>;
  addCarts: Set<string>;
  removals: number;
  purchases: number;
  purchaseOrders: Set<string>;
  unitsSold: number;
  revenue: number;
  abandonedCarts: number;
  abandonedCartIds: Set<string>;
  abandonedUnits: number;
  abandonedRevenue: number;
  variants: Map<string, RawVariantStats>;
};

type RawVariantStats = {
  variantId: string | null;
  variantLabel: string | null;
  variantValue: string | null;
  sku: string | null;
  views: number;
  viewSessions: Set<string>;
  addToCart: number;
  addSessions: Set<string>;
  addCarts: Set<string>;
  removals: number;
  purchases: number;
  purchaseOrders: Set<string>;
  unitsSold: number;
  revenue: number;
  abandonedCarts: number;
  abandonedCartIds: Set<string>;
  abandonedUnits: number;
  abandonedRevenue: number;
};

type ProductEventRow = Prisma.AnalyticsEventGetPayload<{
  select: {
    type: true;
    sessionId: true;
    cartId: true;
    productId: true;
    variantId: true;
    metadata: true;
    createdAt: true;
  };
}>;

type ProductOrderRow = Prisma.OrderGetPayload<{
  select: {
    id: true;
    createdAt: true;
    total: true;
    subtotal: true;
    status: true;
    paymentStatus: true;
    analyticsCart: {
      select: {
        purchaseCompletedAt: true;
      };
    };
    items: {
      select: {
        productId: true;
        productName: true;
        productSlug: true;
        variantId: true;
        variantValue: true;
        variantLabel: true;
        variantSku: true;
        quantity: true;
        unitPrice: true;
        productSnapshot: {
          select: {
            title: true;
            slug: true;
            imageUrl: true;
          };
        };
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

function normalizePageSize(value: string | undefined) {
  const parsed = Number.parseInt(value ?? "", 10);

  return PRODUCT_ANALYTICS_PAGE_SIZES.includes(parsed as (typeof PRODUCT_ANALYTICS_PAGE_SIZES)[number])
    ? parsed
    : 25;
}

function normalizeSort(value: string | undefined): ProductAnalyticsSortKey {
  if (value === "views" || value === "addToCart" || value === "purchases" || value === "abandonments") {
    return value;
  }

  return "revenue";
}

function percentFromSets(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return null;
  }

  return numerator / denominator;
}

function safeSnapshotText(value: unknown) {
  return trimOrUndefined(value) ?? null;
}

function extractNameSeed(source: {
  productName?: string | null;
  productSlug?: string | null;
  imageUrl?: string | null;
}): ProductNameSeed {
  return {
    productName: source.productName ?? null,
    productSlug: source.productSlug ?? null,
    imageUrl: source.imageUrl ?? null,
  };
}

function createEmptyVariantStats(variantId: string | null): RawVariantStats {
  return {
    variantId,
    variantLabel: null,
    variantValue: null,
    sku: null,
    views: 0,
    viewSessions: new Set<string>(),
    addToCart: 0,
    addSessions: new Set<string>(),
    addCarts: new Set<string>(),
    removals: 0,
    purchases: 0,
    purchaseOrders: new Set<string>(),
    unitsSold: 0,
    revenue: 0,
    abandonedCarts: 0,
    abandonedCartIds: new Set<string>(),
    abandonedUnits: 0,
    abandonedRevenue: 0,
  };
}

function createEmptyProductStats(productId: string): RawProductStats {
  return {
    productId,
    productName: null,
    productSlug: null,
    imageUrl: null,
    views: 0,
    viewSessions: new Set<string>(),
    addToCart: 0,
    addSessions: new Set<string>(),
    addCarts: new Set<string>(),
    removals: 0,
    purchases: 0,
    purchaseOrders: new Set<string>(),
    unitsSold: 0,
    revenue: 0,
    abandonedCarts: 0,
    abandonedCartIds: new Set<string>(),
    abandonedUnits: 0,
    abandonedRevenue: 0,
    variants: new Map<string, RawVariantStats>(),
  };
}

function ensureProductStats(products: Map<string, RawProductStats>, productId: string) {
  let entry = products.get(productId);

  if (!entry) {
    entry = createEmptyProductStats(productId);
    products.set(productId, entry);
  }

  return entry;
}

function ensureVariantStats(product: RawProductStats, variantId: string | null) {
  const key = variantId ?? "__null__";
  let entry = product.variants.get(key);

  if (!entry) {
    entry = createEmptyVariantStats(variantId);
    product.variants.set(key, entry);
  }

  return entry;
}

function mergeProductSeed(product: RawProductStats, seed: ProductNameSeed) {
  if (!product.productName && seed.productName) {
    product.productName = seed.productName;
  }

  if (!product.productSlug && seed.productSlug) {
    product.productSlug = seed.productSlug;
  }

  if (!product.imageUrl && seed.imageUrl) {
    product.imageUrl = seed.imageUrl;
  }
}

function mergeVariantSeed(variant: RawVariantStats, seed: {
  variantLabel?: string | null;
  variantValue?: string | null;
  sku?: string | null;
}) {
  if (!variant.variantLabel && seed.variantLabel) {
    variant.variantLabel = seed.variantLabel;
  }

  if (!variant.variantValue && seed.variantValue) {
    variant.variantValue = seed.variantValue;
  }

  if (!variant.sku && seed.sku) {
    variant.sku = seed.sku;
  }
}

function getEventProductSeed(event: ProductEventRow) {
  const metadata = isRecord(event.metadata) ? event.metadata : null;

  return extractNameSeed({
    productName:
      safeSnapshotText(metadata?.title) ??
      safeSnapshotText(metadata?.productName) ??
      safeSnapshotText(metadata?.name),
    productSlug: safeSnapshotText(metadata?.productSlug),
  });
}

function getOrderItemProductSeed(item: ProductOrderRow["items"][number]) {
  return extractNameSeed({
    productName: item.productName ?? item.productSnapshot?.title ?? null,
    productSlug: item.productSlug ?? item.productSnapshot?.slug ?? null,
    imageUrl: item.productSnapshot?.imageUrl ?? null,
  });
}

function getAbandonedItemSeed(item: Record<string, unknown>) {
  return extractNameSeed({
    productName: safeSnapshotText(item.title) ?? safeSnapshotText(item.productSlug),
    productSlug: safeSnapshotText(item.productSlug),
  });
}

function getItemQuantity(value: unknown) {
  return Number.isFinite(Number(value)) ? Math.max(0, Math.trunc(Number(value))) : 0;
}

function getItemUnitPrice(value: unknown) {
  return Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
}

function normalizeProductInventory(items: ProductInventoryItem[]) {
  return new Map(
    items.map((item) => [
      item._id,
      {
        productName: item.title,
        productSlug: item.slug.current,
        imageUrl: getSanityImageUrl(item.images?.[0], 160, 160),
      },
    ]),
  );
}

function compareNumbersDesc(left: number, right: number) {
  return right - left;
}

function percentile(values: number[], fraction: number) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(0, Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * fraction)));

  return sorted[index] ?? 0;
}

function median(values: number[]) {
  return percentile(values, 0.5);
}

function buildVariantRows(product: RawProductStats): ProductAnalyticsVariantRow[] {
  return [...product.variants.values()]
    .map((variant) => ({
      variantId: variant.variantId,
      variantLabel: variant.variantLabel ?? (variant.variantValue ? variant.variantValue : "Sin variante"),
      variantValue: variant.variantValue,
      sku: variant.sku,
      views: variant.views,
      viewSessions: variant.viewSessions.size,
      addToCart: variant.addToCart,
      addSessions: variant.addSessions.size,
      addCarts: variant.addCarts.size,
      removals: variant.removals,
      purchases: variant.purchaseOrders.size,
      unitsSold: variant.unitsSold,
      revenue: variant.revenue,
      abandonedCarts: variant.abandonedCartIds.size,
      abandonedUnits: variant.abandonedUnits,
      abandonedRevenue: variant.abandonedRevenue,
    }))
    .sort((left, right) => compareNumbersDesc(left.revenue, right.revenue) || compareNumbersDesc(left.unitsSold, right.unitsSold) || left.variantLabel.localeCompare(right.variantLabel));
}

function buildProductRow(product: RawProductStats): ProductAnalyticsRow {
  const variants = buildVariantRows(product);
  const purchases = product.purchaseOrders.size;
  const addCarts = product.addCarts.size;
  const cartToPurchaseRate = percentFromSets(purchases, addCarts);
  const viewToCartRate = percentFromSets(product.addToCart, product.views);
  const addToPurchaseRate = percentFromSets(purchases, addCarts);
  const abandonmentRate = percentFromSets(product.abandonedCarts, product.addToCart);

  return {
    productId: product.productId,
    productName: product.productName ?? product.productSlug ?? product.productId,
    productSlug: product.productSlug ?? product.productId,
    imageUrl: product.imageUrl,
    views: product.views,
    viewSessions: product.viewSessions.size,
    addToCart: product.addToCart,
    addSessions: product.addSessions.size,
    addCarts,
    removals: product.removals,
    purchases,
    unitsSold: product.unitsSold,
    revenue: product.revenue,
    abandonedCarts: product.abandonedCarts,
    abandonedUnits: product.abandonedUnits,
    abandonedRevenue: product.abandonedRevenue,
    viewToCartRate,
    cartToPurchaseRate,
    addToPurchaseRate,
    abandonmentRate,
    opportunityTags: [],
    variants,
  };
}

function buildSortedRows(rows: ProductAnalyticsRow[], sortKey: ProductAnalyticsSortKey) {
  return [...rows].sort((left, right) => {
    const metricComparator = (() => {
      switch (sortKey) {
        case "views":
          return compareNumbersDesc(left.views, right.views);
        case "addToCart":
          return compareNumbersDesc(left.addToCart, right.addToCart);
        case "purchases":
          return compareNumbersDesc(left.purchases, right.purchases);
        case "abandonments":
          return compareNumbersDesc(left.abandonedCarts, right.abandonedCarts);
        case "revenue":
        default:
          return compareNumbersDesc(left.revenue, right.revenue);
      }
    })();

    return (
      metricComparator ||
      compareNumbersDesc(left.views, right.views) ||
      compareNumbersDesc(left.addToCart, right.addToCart) ||
      left.productName.localeCompare(right.productName)
    );
  });
}

function buildTopMetricSeries(rows: ProductAnalyticsRow[], key: keyof Pick<ProductAnalyticsRow, "views" | "addToCart" | "purchases" | "abandonedCarts">, limit = 10) {
  return [...rows]
    .filter((row) => row[key] > 0)
    .sort((left, right) => compareNumbersDesc(left[key], right[key]) || compareNumbersDesc(left.revenue, right.revenue) || left.productName.localeCompare(right.productName))
    .slice(0, limit)
    .map((row) => ({
      productId: row.productId,
      productName: row.productName,
      productSlug: row.productSlug,
      value: row[key],
    }));
}

function applyOpportunityTags(rows: ProductAnalyticsRow[]) {
  const views = rows.map((row) => row.views);
  const addToCart = rows.map((row) => row.addToCart);
  const abandons = rows.map((row) => row.abandonedCarts);
  const viewToCartRates = rows.map((row) => row.viewToCartRate).filter((value): value is number => typeof value === "number");
  const cartToPurchaseRates = rows.map((row) => row.cartToPurchaseRate).filter((value): value is number => typeof value === "number");

  const manyViewsThreshold = Math.max(10, percentile(views, 0.75));
  const highAddThreshold = Math.max(5, percentile(addToCart, 0.75));
  const highAbandonThreshold = Math.max(2, percentile(abandons, 0.75));
  const lowViewToCartThreshold = viewToCartRates.length > 0 ? median(viewToCartRates) : 0;
  const lowCartToPurchaseThreshold = cartToPurchaseRates.length > 0 ? median(cartToPurchaseRates) : 0;
  const goodConversionThreshold = cartToPurchaseRates.length > 0 ? Math.max(0.25, percentile(cartToPurchaseRates, 0.75)) : 0.25;

  for (const row of rows) {
    const tags: ProductOpportunityKey[] = [];

    if (row.views >= manyViewsThreshold && (row.viewToCartRate === null || row.viewToCartRate <= lowViewToCartThreshold)) {
      tags.push("many_views_low_cart");
    }

    if (row.addToCart >= highAddThreshold && (row.cartToPurchaseRate === null || row.cartToPurchaseRate <= lowCartToPurchaseThreshold)) {
      tags.push("high_cart_low_purchase");
    }

    if (row.abandonedCarts >= highAbandonThreshold && row.abandonedCarts > 0) {
      tags.push("many_abandons");
    }

    if (row.cartToPurchaseRate !== null && row.cartToPurchaseRate >= goodConversionThreshold && row.purchases > 0) {
      tags.push("good_conversion");
    }

    row.opportunityTags = tags;
  }

  return {
    manyViewsLowCart: rows
      .filter((row) => row.opportunityTags.includes("many_views_low_cart"))
      .sort((left, right) => compareNumbersDesc(left.views, right.views) || compareNumbersDesc(left.addToCart, right.addToCart))
      .slice(0, 5),
    highCartLowPurchase: rows
      .filter((row) => row.opportunityTags.includes("high_cart_low_purchase"))
      .sort((left, right) => compareNumbersDesc(left.addToCart, right.addToCart) || compareNumbersDesc(left.views, right.views))
      .slice(0, 5),
    manyAbandons: rows
      .filter((row) => row.opportunityTags.includes("many_abandons"))
      .sort((left, right) => compareNumbersDesc(left.abandonedCarts, right.abandonedCarts) || compareNumbersDesc(left.abandonedRevenue, right.abandonedRevenue))
      .slice(0, 5),
    goodConversion: rows
      .filter((row) => row.opportunityTags.includes("good_conversion"))
      .sort((left, right) => compareNumbersDesc(left.cartToPurchaseRate ?? 0, right.cartToPurchaseRate ?? 0) || compareNumbersDesc(left.revenue, right.revenue))
      .slice(0, 5),
  };
}

function mergeFallbackInventory(rows: ProductAnalyticsRow[], inventory: Map<string, { productName: string; productSlug: string; imageUrl: string | null }>) {
  for (const row of rows) {
    const fallback = inventory.get(row.productId);

    if (!fallback) {
      continue;
    }

    if (!row.productName || row.productName === row.productId) {
      row.productName = fallback.productName;
    }

    if (!row.productSlug || row.productSlug === row.productId) {
      row.productSlug = fallback.productSlug;
    }

    if (!row.imageUrl) {
      row.imageUrl = fallback.imageUrl;
    }
  }
}

function buildTotals(rows: ProductAnalyticsRow[]) {
  const totals = rows.reduce(
    (accumulator, row) => {
      accumulator.views += row.views;
      accumulator.addToCart += row.addToCart;
      accumulator.addCarts += row.addCarts;
      accumulator.removals += row.removals;
      accumulator.purchases += row.purchases;
      accumulator.unitsSold += row.unitsSold;
      accumulator.revenue += row.revenue;
      accumulator.abandonedCarts += row.abandonedCarts;
      accumulator.abandonedUnits += row.abandonedUnits;
      accumulator.abandonedRevenue += row.abandonedRevenue;
      return accumulator;
    },
    {
      views: 0,
      addToCart: 0,
      addCarts: 0,
      removals: 0,
      purchases: 0,
      unitsSold: 0,
      revenue: 0,
      abandonedCarts: 0,
      abandonedUnits: 0,
      abandonedRevenue: 0,
    },
  );

  return {
    products: rows.length,
    ...totals,
    viewToCartRate: percentFromSets(totals.addToCart, totals.views),
    cartToPurchaseRate: percentFromSets(totals.purchases, totals.addCarts),
  };
}

function getEffectivePurchaseDate(order: ProductOrderRow) {
  return order.analyticsCart?.purchaseCompletedAt ?? order.createdAt;
}

function isInPeriod(date: Date, start: Date, end: Date) {
  return date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
}

async function loadInventoryFallback() {
  try {
    const inventory = await sanityFreshFetch<ProductInventoryItem[]>(adminProductsInventoryQuery);
    return normalizeProductInventory(inventory);
  } catch {
    return new Map<string, { productName: string; productSlug: string; imageUrl: string | null }>();
  }
}

export function normalizeProductAnalyticsPageSize(value: string | undefined) {
  return normalizePageSize(value);
}

export function normalizeProductAnalyticsSort(value: string | undefined): ProductAnalyticsSortKey {
  return normalizeSort(value);
}

export function normalizeProductAnalyticsQuery(searchParams: Record<string, string | string[] | undefined>): ProductAnalyticsFilters {
  const period = (searchParams.period as DashboardPeriod | undefined) ?? "30d";
  const sort = normalizeSort(Array.isArray(searchParams.sort) ? searchParams.sort[0] : searchParams.sort);
  const page = Math.max(1, Number.parseInt(String(Array.isArray(searchParams.page) ? searchParams.page[0] : searchParams.page ?? "1"), 10) || 1);
  const pageSize = normalizePageSize(Array.isArray(searchParams.pageSize) ? searchParams.pageSize[0] : searchParams.pageSize);

  return {
    period: period in DASHBOARD_PERIODS ? period : "30d",
    sort,
    page,
    pageSize,
  };
}

export async function getProductAnalyticsPageData(filters: ProductAnalyticsFilters): Promise<ProductAnalyticsPageData> {
  const now = new Date();
  const dateRange = {
    start: getPeriodStart(filters.period, now),
    end: now,
  };
  const [events, orders, abandonedCarts, inventoryFallback] = await Promise.all([
    prisma.analyticsEvent.findMany({
      where: {
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
        type: {
          in: ["PRODUCT_VIEWED", "ADD_TO_CART", "REMOVE_FROM_CART"],
        },
      },
      select: {
        type: true,
        sessionId: true,
        cartId: true,
        productId: true,
        variantId: true,
        metadata: true,
        createdAt: true,
      },
    }),
    prisma.order.findMany({
      where: {
        OR: [
          {
            createdAt: {
              gte: dateRange.start,
              lte: dateRange.end,
            },
            OR: [
              { status: "PAID" },
              { status: "FULFILLED" },
              { paymentStatus: "APPROVED" },
            ],
          },
          {
            analyticsCart: {
              purchaseCompletedAt: {
                gte: dateRange.start,
                lte: dateRange.end,
              },
            },
            OR: [
              { status: "PAID" },
              { status: "FULFILLED" },
              { paymentStatus: "APPROVED" },
            ],
          },
        ],
      },
      select: {
        id: true,
        createdAt: true,
        total: true,
        subtotal: true,
        status: true,
        paymentStatus: true,
        analyticsCart: {
          select: {
            purchaseCompletedAt: true,
          },
        },
        items: {
          select: {
            productId: true,
            productName: true,
            productSlug: true,
            variantId: true,
            variantValue: true,
            variantLabel: true,
            variantSku: true,
            quantity: true,
            unitPrice: true,
            productSnapshot: {
              select: {
                title: true,
                slug: true,
                imageUrl: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.analyticsCart.findMany({
      where: {
        abandonedAt: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
        status: {
          in: ["CART_ABANDONED", "CHECKOUT_ABANDONED"],
        },
      },
      select: {
        cartId: true,
        abandonedAt: true,
        status: true,
        itemsSnapshot: true,
      },
      orderBy: { abandonedAt: "asc" },
    }),
    loadInventoryFallback(),
  ]);

  const productStats = new Map<string, RawProductStats>();

  for (const event of events) {
    if (!event.productId) {
      continue;
    }

    const product = ensureProductStats(productStats, event.productId);
    const seed = getEventProductSeed(event);
    mergeProductSeed(product, seed);

    const variant = ensureVariantStats(product, event.variantId ?? null);
    mergeVariantSeed(variant, {
      variantLabel: safeSnapshotText(isRecord(event.metadata) ? event.metadata.variantLabel : null),
      variantValue: safeSnapshotText(isRecord(event.metadata) ? event.metadata.variantValue : null),
      sku: safeSnapshotText(isRecord(event.metadata) ? event.metadata.sku : null),
    });

    if (event.type === "PRODUCT_VIEWED") {
      product.views += 1;
      if (event.sessionId) {
        product.viewSessions.add(event.sessionId);
        variant.viewSessions.add(event.sessionId);
      }
      variant.views += 1;
    }

    if (event.type === "ADD_TO_CART") {
      product.addToCart += 1;
      variant.addToCart += 1;
      if (event.sessionId) {
        product.addSessions.add(event.sessionId);
        variant.addSessions.add(event.sessionId);
      }
      const addCartKey = event.cartId ?? event.sessionId;
      if (addCartKey) {
        product.addCarts.add(addCartKey);
        variant.addCarts.add(addCartKey);
      }
    }

    if (event.type === "REMOVE_FROM_CART") {
      product.removals += 1;
      variant.removals += 1;
    }
  }

  for (const order of orders) {
    if (!isPaidOrder(order)) {
      continue;
    }

    const effectivePurchaseDate = getEffectivePurchaseDate(order);
    if (!isInPeriod(effectivePurchaseDate, dateRange.start, dateRange.end)) {
      continue;
    }

    for (const item of order.items) {
      const product = ensureProductStats(productStats, item.productId);
      mergeProductSeed(product, getOrderItemProductSeed(item));

      const variant = ensureVariantStats(product, item.variantId ?? null);
      mergeVariantSeed(variant, {
        variantLabel: item.variantLabel ?? item.productSnapshot?.title ?? null,
        variantValue: item.variantValue ?? null,
        sku: item.variantSku ?? null,
      });

      const unitPrice = toNumber(item.unitPrice);
      const lineRevenue = unitPrice * item.quantity;

      product.purchases += 1;
      product.unitsSold += item.quantity;
      product.revenue += lineRevenue;
      variant.purchases += 1;
      variant.unitsSold += item.quantity;
      variant.revenue += lineRevenue;
      product.purchaseOrders.add(order.id);
      variant.purchaseOrders.add(order.id);
    }
  }

  for (const cart of abandonedCarts) {
    const items = Array.isArray(cart.itemsSnapshot) ? cart.itemsSnapshot : [];

    for (const rawItem of items) {
      if (!isRecord(rawItem) || typeof rawItem.productId !== "string") {
        continue;
      }

      const product = ensureProductStats(productStats, rawItem.productId);
      mergeProductSeed(product, getAbandonedItemSeed(rawItem));

      const variantId = trimOrUndefined(rawItem.variantId) ?? null;
      const variant = ensureVariantStats(product, variantId);
      mergeVariantSeed(variant, {
        variantLabel: safeSnapshotText(rawItem.variantLabel),
        variantValue: safeSnapshotText(rawItem.variantValue),
        sku: safeSnapshotText(rawItem.sku),
      });

      const quantity = getItemQuantity(rawItem.quantity);
      const revenue = getItemUnitPrice(rawItem.lineTotal) || quantity * getItemUnitPrice(rawItem.unitPrice);

      product.abandonedCarts += product.abandonedCartIds.has(cart.cartId) ? 0 : 1;
      product.abandonedCartIds.add(cart.cartId);
      product.abandonedUnits += quantity;
      product.abandonedRevenue += revenue;
      variant.abandonedCarts += variant.abandonedCartIds.has(cart.cartId) ? 0 : 1;
      variant.abandonedCartIds.add(cart.cartId);
      variant.abandonedUnits += quantity;
      variant.abandonedRevenue += revenue;
    }
  }

  const rows = [...productStats.values()].map((product) => {
    const fallback = inventoryFallback.get(product.productId);
    if (fallback) {
      mergeProductSeed(product, fallback);
    }

    for (const variant of product.variants.values()) {
      if (variant.variantLabel === null) {
        variant.variantLabel = variant.variantValue ?? "Sin variante";
      }
    }

    return buildProductRow(product);
  });

  mergeFallbackInventory(rows, inventoryFallback);

  const totals = buildTotals(rows);
  const defaultSort: ProductAnalyticsSortKey = totals.revenue > 0 ? filters.sort : "views";
  const effectiveSort = totals.revenue > 0 || filters.sort !== "revenue" ? filters.sort : defaultSort;
  const sortedRows = buildSortedRows(rows, effectiveSort);
  const pageCount = Math.max(1, Math.ceil(sortedRows.length / filters.pageSize));
  const page = Math.min(filters.page, pageCount);
  const pageStart = (page - 1) * filters.pageSize;
  const pageProducts = sortedRows.slice(pageStart, pageStart + filters.pageSize);
  const opportunities = applyOpportunityTags(rows);

  return {
    filters: {
      ...filters,
      sort: effectiveSort,
      page,
      pageSize: filters.pageSize,
    },
    dateRange,
    sortKey: effectiveSort,
    totals,
    page,
    pageSize: filters.pageSize,
    pageCount,
    products: pageProducts,
    charts: {
      topViewed: buildTopMetricSeries(rows, "views"),
      topAdded: buildTopMetricSeries(rows, "addToCart"),
      topSold: buildTopMetricSeries(rows, "purchases"),
      topAbandoned: buildTopMetricSeries(rows, "abandonedCarts"),
    },
    opportunities,
  };
}
