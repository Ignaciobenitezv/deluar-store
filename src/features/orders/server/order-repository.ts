import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { getAdminOrderStatusLabel, getAdminPaymentMethodLabel, getAdminShippingMethodLabel } from "@/features/admin/lib/admin-order-labels";
import type { Order } from "@/features/order/types";
import { mapPersistedOrderToCheckoutOrder } from "@/features/orders/server/order-mapper";
import { PAYMENT_METHODS, type EnabledCheckoutPaymentMethod } from "@/features/payments/types";
import type { ShippingMethod } from "@/features/shipping/shipping";

type PersistOrderInput = {
  orderNumber: string;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    notes: string;
  };
  shippingAddress: {
    address: string;
    city: string;
    province: string;
    postalCode: string;
    apartment?: string;
  };
  items: {
    productId: string;
    productSlug: string;
    title: string;
    imageUrl: string | null;
    variantId?: string;
    variantValue?: string;
    variantLabel?: string;
    variantAttributes?: Prisma.InputJsonValue;
    variantSku?: string;
    quantity: number;
    unitPrice: number;
    transferPrice?: number;
    lineTotal: number;
  }[];
  shippingMethod: ShippingMethod;
  paymentMethod: EnabledCheckoutPaymentMethod;
  subtotal: number;
  shippingCost?: number;
  total: number;
};

const orderInclude = {
  customer: true,
  shippingAddress: true,
  items: {
    include: {
      productSnapshot: true,
    },
  },
} satisfies Prisma.OrderInclude;

export const ADMIN_ORDER_PAGE_SIZES = [25, 50, 100] as const;

export const ADMIN_ORDER_PERIOD_OPTIONS = [
  { value: "all", label: "Todas" },
  { value: "today", label: "Hoy" },
  { value: "7d", label: "Últimos 7 días" },
  { value: "30d", label: "Últimos 30 días" },
] as const;

export const ADMIN_ORDER_STATUS_OPTIONS = [
  { value: "all", label: "Todos los estados" },
  { value: "CREATED", label: getAdminOrderStatusLabel("CREATED") },
  { value: "PENDING_PAYMENT", label: getAdminOrderStatusLabel("PENDING_PAYMENT") },
  { value: "PAID", label: getAdminOrderStatusLabel("PAID") },
  { value: "PAYMENT_FAILED", label: getAdminOrderStatusLabel("PAYMENT_FAILED") },
  { value: "CANCELLED", label: getAdminOrderStatusLabel("CANCELLED") },
  { value: "EXPIRED", label: getAdminOrderStatusLabel("EXPIRED") },
  { value: "FULFILLED", label: getAdminOrderStatusLabel("FULFILLED") },
  { value: "REFUNDED", label: getAdminOrderStatusLabel("REFUNDED") },
] as const;

export const ADMIN_ORDER_PAYMENT_METHOD_OPTIONS = [
  { value: "all", label: "Todos los métodos" },
  { value: "GOCUOTAS", label: getAdminPaymentMethodLabel("GOCUOTAS") },
  { value: "MERCADO_PAGO", label: getAdminPaymentMethodLabel("MERCADO_PAGO") },
  { value: "TRANSFER", label: getAdminPaymentMethodLabel("TRANSFER") },
  { value: "GETNET", label: getAdminPaymentMethodLabel("GETNET") },
  { value: "UNICOBROS", label: getAdminPaymentMethodLabel("UNICOBROS") },
] as const;

export const ADMIN_ORDER_SHIPPING_METHOD_OPTIONS = [
  { value: "all", label: "Todos los envíos" },
  { value: "home_delivery", label: getAdminShippingMethodLabel("home_delivery") },
  { value: "city_branch", label: getAdminShippingMethodLabel("city_branch") },
  { value: "resistance_pickup", label: getAdminShippingMethodLabel("resistance_pickup") },
] as const;

export type AdminOrdersPeriodValue = (typeof ADMIN_ORDER_PERIOD_OPTIONS)[number]["value"];
export type AdminOrdersPageSizeValue = (typeof ADMIN_ORDER_PAGE_SIZES)[number];
export type AdminOrdersStatusValue = (typeof ADMIN_ORDER_STATUS_OPTIONS)[number]["value"];
export type AdminOrdersPaymentMethodValue = (typeof ADMIN_ORDER_PAYMENT_METHOD_OPTIONS)[number]["value"];
export type AdminOrdersShippingMethodValue = (typeof ADMIN_ORDER_SHIPPING_METHOD_OPTIONS)[number]["value"];

export type AdminOrdersFilters = {
  q: string;
  status: AdminOrdersStatusValue;
  paymentMethod: AdminOrdersPaymentMethodValue;
  shippingMethod: AdminOrdersShippingMethodValue;
  period: AdminOrdersPeriodValue;
  page: number;
  pageSize: AdminOrdersPageSizeValue;
};

export type AdminOrdersPageData = {
  filters: AdminOrdersFilters;
  totalCount: number;
  pendingCount: number;
  paidCount: number;
  billingTotal: number;
  pageCount: number;
  page: number;
  pageSize: AdminOrdersPageSizeValue;
  orders: Awaited<ReturnType<typeof listOrders>>;
};

type RawAdminOrdersSearchParams = Record<string, string | string[] | undefined>;

function readSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function normalizePageSize(value: string) {
  const parsed = Number.parseInt(value, 10);

  return ADMIN_ORDER_PAGE_SIZES.includes(parsed as AdminOrdersPageSizeValue)
    ? (parsed as AdminOrdersPageSizeValue)
    : 25;
}

function normalizePeriod(value: string) {
  return ADMIN_ORDER_PERIOD_OPTIONS.some((option) => option.value === value)
    ? (value as AdminOrdersPeriodValue)
    : "all";
}

function normalizeStatus(value: string) {
  return ADMIN_ORDER_STATUS_OPTIONS.some((option) => option.value === value)
    ? (value as AdminOrdersStatusValue)
    : "all";
}

function normalizePaymentMethod(value: string) {
  return ADMIN_ORDER_PAYMENT_METHOD_OPTIONS.some((option) => option.value === value)
    ? (value as AdminOrdersPaymentMethodValue)
    : "all";
}

function normalizeShippingMethod(value: string) {
  return ADMIN_ORDER_SHIPPING_METHOD_OPTIONS.some((option) => option.value === value)
    ? (value as AdminOrdersShippingMethodValue)
    : "all";
}

function getArgentinaDayStart(date = new Date()) {
  const offsetMs = 3 * 60 * 60 * 1000;
  const shifted = new Date(date.getTime() - offsetMs);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() + offsetMs);
}

function getPeriodStart(period: AdminOrdersPeriodValue, now = new Date()) {
  if (period === "all") {
    return null;
  }

  const daysByPeriod: Record<Exclude<AdminOrdersPeriodValue, "all">, number> = {
    today: 1,
    "7d": 7,
    "30d": 30,
  };
  const start = getArgentinaDayStart(now);
  const daysBack = daysByPeriod[period] - 1;
  start.setUTCDate(start.getUTCDate() - daysBack);
  return start;
}

function buildBaseWhere(filters: AdminOrdersFilters): Prisma.OrderWhereInput | undefined {
  const conditions: Prisma.OrderWhereInput[] = [];
  const query = filters.q.trim();

  if (query) {
    conditions.push({
      OR: [
        { orderNumber: { contains: query, mode: "insensitive" } },
        { id: query },
        { externalReference: { contains: query, mode: "insensitive" } },
        { customer: { fullName: { contains: query, mode: "insensitive" } } },
        { customer: { email: { contains: query, mode: "insensitive" } } },
      ],
    });
  }

  if (filters.status !== "all") {
    conditions.push({ status: filters.status });
  }

  if (filters.paymentMethod !== "all") {
    conditions.push({ paymentMethod: filters.paymentMethod });
  }

  if (filters.shippingMethod !== "all") {
    conditions.push({ shippingMethod: filters.shippingMethod });
  }

  const periodStart = getPeriodStart(filters.period);
  if (periodStart) {
    conditions.push({
      createdAt: {
        gte: periodStart,
        lte: new Date(),
      },
    });
  }

  return conditions.length > 0 ? { AND: conditions } : undefined;
}

function appendWhere(
  baseWhere: Prisma.OrderWhereInput | undefined,
  extraWhere: Prisma.OrderWhereInput,
): Prisma.OrderWhereInput {
  if (!baseWhere) {
    return extraWhere;
  }

  return { AND: [baseWhere, extraWhere] };
}

export function parseAdminOrdersFilters(searchParams: RawAdminOrdersSearchParams): AdminOrdersFilters {
  const q = readSearchParam(searchParams.q).trim().slice(0, 120);
  const status = normalizeStatus(readSearchParam(searchParams.status));
  const paymentMethod = normalizePaymentMethod(readSearchParam(searchParams.paymentMethod));
  const shippingMethod = normalizeShippingMethod(readSearchParam(searchParams.shippingMethod));
  const period = normalizePeriod(readSearchParam(searchParams.period));
  const page = Math.max(1, Number.parseInt(readSearchParam(searchParams.page), 10) || 1);
  const pageSize = normalizePageSize(readSearchParam(searchParams.pageSize));

  return {
    q,
    status,
    paymentMethod,
    shippingMethod,
    period,
    page,
    pageSize,
  };
}

export async function getAdminOrdersPageData(
  searchParams: RawAdminOrdersSearchParams,
): Promise<AdminOrdersPageData> {
  const filters = parseAdminOrdersFilters(searchParams);
  const baseWhere = buildBaseWhere(filters);
  const pendingWhere = appendWhere(baseWhere, {
    OR: [{ status: "CREATED" }, { status: "PENDING_PAYMENT" }],
  });
  const paidWhere = appendWhere(baseWhere, {
    OR: [{ status: "PAID" }, { status: "FULFILLED" }, { paymentStatus: "APPROVED" }],
  });

  const [totalCount, pendingCount, paidCount, billingSummary] = await prisma.$transaction([
    prisma.order.count({ where: baseWhere }),
    prisma.order.count({ where: pendingWhere }),
    prisma.order.count({ where: paidWhere }),
    prisma.order.aggregate({
      where: paidWhere,
      _sum: {
        total: true,
      },
    }),
  ]);

  const pageCount = Math.max(1, Math.ceil(totalCount / filters.pageSize));
  const page = Math.min(filters.page, pageCount);
  const skip = (page - 1) * filters.pageSize;

  const orders = await prisma.order.findMany({
    where: baseWhere,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip,
    take: filters.pageSize,
    include: orderInclude,
  });

  return {
    filters: {
      ...filters,
      page,
    },
    totalCount,
    pendingCount,
    paidCount,
    billingTotal: billingSummary._sum.total?.toNumber() ?? 0,
    pageCount,
    page,
    pageSize: filters.pageSize,
    orders: orders.map(mapPersistedOrderToCheckoutOrder),
  };
}

function decimal(value: number) {
  return new Prisma.Decimal(value);
}

function toPrismaPaymentMethod(paymentMethod: EnabledCheckoutPaymentMethod) {
  switch (paymentMethod) {
    case PAYMENT_METHODS.TRANSFER:
      return "TRANSFER" as const;
    case PAYMENT_METHODS.UNICOBROS:
      return "UNICOBROS" as const;
    case PAYMENT_METHODS.GOCUOTAS:
    default:
      return "GOCUOTAS" as const;
  }
}

function toPrismaPaymentProvider(paymentMethod: EnabledCheckoutPaymentMethod) {
  switch (paymentMethod) {
    case PAYMENT_METHODS.TRANSFER:
      return null;
    case PAYMENT_METHODS.UNICOBROS:
      return "UNICOBROS" as const;
    case PAYMENT_METHODS.GOCUOTAS:
    default:
      return "GOCUOTAS" as const;
  }
}

export async function saveOrder(input: PersistOrderInput): Promise<Order> {
  const persistedOrder = await prisma.$transaction(async (tx) => {
    const customer = await tx.customer.create({
      data: {
        fullName: `${input.customer.firstName} ${input.customer.lastName}`.trim(),
        email: input.customer.email,
        phone: input.customer.phone,
      },
    });

    const shippingAddress = await tx.shippingAddress.create({
      data: {
        customerId: customer.id,
        province: input.shippingAddress.province,
        city: input.shippingAddress.city,
        postalCode: input.shippingAddress.postalCode,
        address: input.shippingAddress.address,
        apartment: input.shippingAddress.apartment,
        notes: input.customer.notes || undefined,
      },
    });

    return tx.order.create({
      data: {
        orderNumber: input.orderNumber,
        status: "PENDING_PAYMENT",
        subtotal: decimal(input.subtotal),
        shippingMethod: input.shippingMethod,
        shippingCost: decimal(input.shippingCost ?? 0),
        total: decimal(input.total),
        paymentMethod: toPrismaPaymentMethod(input.paymentMethod),
        paymentProvider: toPrismaPaymentProvider(input.paymentMethod),
        paymentStatus: "PENDING",
        externalReference: input.orderNumber,
        customerId: customer.id,
        shippingAddressId: shippingAddress.id,
        items: {
          create: input.items.map((item) => ({
            productId: item.productId,
            productName: item.title,
            productSlug: item.productSlug,
            variantId: item.variantId,
            variantValue: item.variantValue,
            variantLabel: item.variantLabel,
            variantAttributes: item.variantAttributes,
            variantSku: item.variantSku,
            quantity: item.quantity,
            unitPrice: decimal(item.unitPrice),
            transferPrice:
              typeof item.transferPrice === "number"
                ? decimal(item.transferPrice)
                : undefined,
            imageUrl: item.imageUrl,
            productSnapshot: {
              create: {
                sanityProductId: item.productId,
                title: item.title,
                slug: item.productSlug,
                price: decimal(item.unitPrice),
                transferPrice:
                  typeof item.transferPrice === "number"
                    ? decimal(item.transferPrice)
                    : undefined,
                imageUrl: item.imageUrl,
              },
            },
          })),
        },
      },
      include: orderInclude,
    });
  });

  return mapPersistedOrderToCheckoutOrder(persistedOrder);
}

export async function getOrderById(id: string) {
  const order = await prisma.order.findUnique({
    where: { id },
    include: orderInclude,
  });

  return order ? mapPersistedOrderToCheckoutOrder(order) : null;
}

export async function markOrderWithGoCuotasCheckout(params: {
  orderId: string;
  checkoutUrl: string;
  rawProviderStatus?: string;
  externalReference: string;
}) {
  const order = await prisma.order.update({
    where: { id: params.orderId },
    data: {
      status: "PENDING_PAYMENT",
      paymentMethod: "GOCUOTAS",
      paymentProvider: "GOCUOTAS",
      paymentStatus: "PENDING",
      externalReference: params.externalReference,
      checkoutUrl: params.checkoutUrl,
      rawProviderStatus: params.rawProviderStatus,
    },
    include: orderInclude,
  });

  return mapPersistedOrderToCheckoutOrder(order);
}

export async function markOrderWithCheckout(params: {
  orderId: string;
  checkoutUrl: string;
  rawProviderStatus?: string;
  externalReference: string;
  providerPaymentId?: string;
}) {
  const order = await prisma.order.update({
    where: { id: params.orderId },
    data: {
      status: "PENDING_PAYMENT",
      paymentStatus: "PENDING",
      externalReference: params.externalReference,
      providerPaymentId: params.providerPaymentId,
      checkoutUrl: params.checkoutUrl,
      rawProviderStatus: params.rawProviderStatus,
    },
    include: orderInclude,
  });

  return mapPersistedOrderToCheckoutOrder(order);
}

export async function markTransferOrderPaid(orderId: string) {
  const order = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "PAID",
      paymentStatus: "APPROVED",
      rawProviderStatus: "manual_transfer_approved",
    },
    include: orderInclude,
  });

  return mapPersistedOrderToCheckoutOrder(order);
}

export async function markOrderProviderInitFailed(params: {
  orderId: string;
  rawProviderStatus?: string;
}) {
  const order = await prisma.order.update({
    where: { id: params.orderId },
    data: {
      status: "PAYMENT_FAILED",
      paymentStatus: "REJECTED",
      rawProviderStatus: params.rawProviderStatus ?? "provider_init_failed",
      checkoutUrl: null,
    },
    include: orderInclude,
  });

  return mapPersistedOrderToCheckoutOrder(order);
}

export async function listOrders(limit = 50) {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: orderInclude,
  });

  return orders.map(mapPersistedOrderToCheckoutOrder);
}
