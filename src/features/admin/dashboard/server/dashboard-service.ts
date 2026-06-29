import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { PAYMENT_METHODS } from "@/features/payments/types";
import {
  SHIPPING_METHODS,
  type ShippingMethod,
} from "@/features/shipping/shipping";

const ARGENTINA_TIME_ZONE = "America/Argentina/Buenos_Aires";
const ARGENTINA_UTC_OFFSET_MS = 3 * 60 * 60 * 1000;
const LOW_STOCK_THRESHOLD = 5;

export const DASHBOARD_PERIODS = {
  today: { label: "Hoy", days: 1 },
  "7d": { label: "Ultimos 7 dias", days: 7 },
  "30d": { label: "Ultimos 30 dias", days: 30 },
  "90d": { label: "Ultimos 90 dias", days: 90 },
} as const;

export type DashboardPeriod = keyof typeof DASHBOARD_PERIODS;

type DashboardOrder = {
  status: string;
  paymentStatus: string;
  createdAt: Date;
  total: Prisma.Decimal;
  shippingCost: Prisma.Decimal;
  paymentMethod: string;
  shippingMethod: string;
  customer: {
    fullName: string;
    email: string;
  };
  shippingAddress: {
    province: string;
    city: string;
  } | null;
  items: {
    productId: string;
    productName: string;
    productSlug: string;
    quantity: number;
    unitPrice: Prisma.Decimal;
  }[];
};

type InventoryProduct = {
  sanityProductId: string;
  title: string;
  slug: string;
  stock: number;
  trackInventory: boolean;
};

export type DashboardMetrics = {
  period: DashboardPeriod;
  dateRange: {
    start: Date;
    end: Date;
  };
  summary: {
    billingTotal: number;
    paidOrders: number;
    createdOrders: number;
    averageTicket: number;
    unitsSold: number;
    distinctProductsSold: number;
    lowStockProducts: number;
    outOfStockProducts: number;
  };
  sales: {
    daily: {
      date: string;
      label: string;
      createdOrders: number;
      paidOrders: number;
      unitsSold: number;
      revenue: number;
    }[];
  };
  conversion: {
    checkoutOrders: number;
    paidOrders: number;
    approvalRate: number;
    pendingOrders: number;
    failedOrders: number;
    cancelledOrders: number;
    fulfilledOrders: number;
    paidPendingPreparationOrders: number;
    paymentStatusBreakdown: {
      status: string;
      label: string;
      orders: number;
    }[];
  };
  products: {
    topSold: {
      productId: string;
      productName: string;
      productSlug: string;
      unitsSold: number;
      revenue: number;
      stock?: number;
    }[];
    topRevenue: {
      productId: string;
      productName: string;
      productSlug: string;
      unitsSold: number;
      revenue: number;
      stock?: number;
    }[];
    lowStock: {
      productId: string;
      productName: string;
      productSlug: string;
      stock: number;
    }[];
    outOfStock: {
      productId: string;
      productName: string;
      productSlug: string;
      stock: number;
    }[];
  };
  customers: {
    uniqueCustomers: number;
    recurrentCustomers: number;
    newCustomers: number;
    allCustomers: {
      email: string;
      displayName: string;
      orders: number;
      revenue: number;
      firstOrderAt: string;
      isNewCustomer: boolean;
    }[];
    topCustomers: {
      email: string;
      displayName: string;
      orders: number;
      revenue: number;
      firstOrderAt: string;
      isNewCustomer: boolean;
    }[];
  };
  location: {
    provinces: {
      province: string;
      orders: number;
      revenue: number;
    }[];
    cities: {
      province: string;
      city: string;
      orders: number;
      revenue: number;
    }[];
  };
  payments: {
    methods: {
      method: string;
      label: string;
      orders: number;
      revenue: number;
    }[];
    statusBreakdown: {
      status: string;
      label: string;
      orders: number;
    }[];
    failedByMethod: {
      method: string;
      label: string;
      failedOrders: number;
      pendingOrders: number;
      revenue: number;
    }[];
  };
  shipping: {
    methods: {
      method: ShippingMethod;
      label: string;
      orders: number;
      revenue: number;
      shippingCostTotal: number;
    }[];
    totalShippingCost: number;
    averageShippingCost: number;
    shippingOrders: number;
    freeShippingOrders: number;
    paidShippingOrders: number;
    pickupOrders: number;
    homeDeliveryOrders: number;
    cityBranchOrders: number;
  };
  alerts: {
    pendingPaymentOrders: number;
    paidPendingPreparationOrders: number;
  };
  marketing: {
    missingTracking: string[];
  };
};

const dashboardOrderSelect = {
  status: true,
  paymentStatus: true,
  createdAt: true,
  total: true,
  shippingCost: true,
  paymentMethod: true,
  shippingMethod: true,
  customer: {
    select: {
      fullName: true,
      email: true,
    },
  },
  shippingAddress: {
    select: {
      province: true,
      city: true,
    },
  },
  items: {
    select: {
      productId: true,
      productName: true,
      productSlug: true,
      quantity: true,
      unitPrice: true,
    },
  },
} satisfies Prisma.OrderSelect;

const customerOrderSelect = {
  createdAt: true,
  total: true,
  customer: {
    select: {
      fullName: true,
      email: true,
    },
  },
} satisfies Prisma.OrderSelect;

const productSelect = {
  sanityProductId: true,
  title: true,
  slug: true,
  stock: true,
  trackInventory: true,
} satisfies Prisma.ProductSelect;

function toNumber(value: Prisma.Decimal | number) {
  return typeof value === "number" ? value : value.toNumber();
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

function normalizeDashboardPeriod(value: string | undefined): DashboardPeriod {
  if (!value) {
    return "30d";
  }

  return value in DASHBOARD_PERIODS ? (value as DashboardPeriod) : "30d";
}

function isPaidOrder(order: DashboardOrder) {
  return (
    order.status === "PAID" ||
    order.status === "FULFILLED" ||
    order.paymentStatus === "APPROVED"
  );
}

function isPendingPaymentOrder(order: DashboardOrder) {
  return order.status === "PENDING_PAYMENT" || order.paymentStatus === "PENDING";
}

function isFailedOrder(order: DashboardOrder) {
  return (
    order.status === "PAYMENT_FAILED" ||
    order.paymentStatus === "REJECTED" ||
    order.paymentStatus === "CHARGED_BACK"
  );
}

function isCancelledOrder(order: DashboardOrder) {
  return order.status === "CANCELLED" || order.paymentStatus === "CANCELLED";
}

function isFulfilledOrder(order: DashboardOrder) {
  return order.status === "FULFILLED";
}

function normalizeShippingMethod(method: string): ShippingMethod {
  if (
    method === SHIPPING_METHODS.HOME_DELIVERY ||
    method === SHIPPING_METHODS.CITY_BRANCH ||
    method === SHIPPING_METHODS.RESISTANCE_PICKUP
  ) {
    return method;
  }

  return SHIPPING_METHODS.HOME_DELIVERY;
}

function getShippingMethodLabel(method: ShippingMethod) {
  switch (method) {
    case SHIPPING_METHODS.CITY_BRANCH:
      return "Envío a sucursal";
    case SHIPPING_METHODS.RESISTANCE_PICKUP:
      return "Retiro en Resistencia";
    case SHIPPING_METHODS.HOME_DELIVERY:
    default:
      return "Envío a domicilio";
  }
}

function getPaymentMethodLabel(method: string) {
  switch (method) {
    case PAYMENT_METHODS.TRANSFER:
      return "Transferencia";
    case PAYMENT_METHODS.GETNET:
      return "Getnet";
    case PAYMENT_METHODS.GOCUOTAS:
      return "GoCuotas";
    case "MERCADO_PAGO":
    case "mercado_pago":
      return "Mercado Pago";
    default:
      return method;
  }
}

function getPaymentStatusLabel(status: string) {
  switch (status) {
    case "APPROVED":
      return "Aprobado";
    case "PENDING":
      return "Pendiente";
    case "REJECTED":
      return "Fallido";
    case "CANCELLED":
      return "Cancelado";
    case "REFUNDED":
      return "Reintegrado";
    case "CHARGED_BACK":
      return "Contracargo";
    case "NOT_STARTED":
      return "No iniciado";
    default:
      return status;
  }
}

function maskEmail(email: string) {
  const [localPart, domain = ""] = email.split("@");

  if (!domain) {
    return email;
  }

  const visible = localPart.slice(0, Math.min(2, localPart.length));
  return `${visible}***@${domain}`;
}

function findProductInventory(
  products: InventoryProduct[],
  productId: string,
  productSlug: string,
) {
  return (
    products.find((product) => product.sanityProductId === productId) ??
    products.find((product) => product.slug === productSlug)
  );
}

function createOrderPeriodFilter(start: Date, end: Date) {
  return {
    createdAt: {
      gte: start,
      lte: end,
    },
  };
}

export function normalizeDashboardPeriodValue(value: string | undefined) {
  return normalizeDashboardPeriod(value);
}

export async function getDashboardMetrics(
  period: DashboardPeriod,
): Promise<DashboardMetrics> {
  const now = new Date();
  const start = getPeriodStart(period, now);
  const end = now;

  const [ordersInPeriod, customersLifetime, currentProducts] = await Promise.all([
    prisma.order.findMany({
      where: createOrderPeriodFilter(start, end),
      select: dashboardOrderSelect,
      orderBy: { createdAt: "asc" },
    }),
    prisma.order.findMany({
      select: customerOrderSelect,
      orderBy: { createdAt: "asc" },
    }),
    prisma.product.findMany({
      select: productSelect,
      orderBy: [{ trackInventory: "desc" }, { stock: "asc" }, { title: "asc" }],
    }),
  ]);

  const ordersCreated = ordersInPeriod.length;
  const paidOrdersList = ordersInPeriod.filter(isPaidOrder);
  const paidOrders = paidOrdersList.length;
  const pendingPaymentOrders = ordersInPeriod.filter(isPendingPaymentOrder).length;
  const failedOrders = ordersInPeriod.filter(isFailedOrder).length;
  const cancelledOrders = ordersInPeriod.filter(isCancelledOrder).length;
  const fulfilledOrders = ordersInPeriod.filter(isFulfilledOrder).length;
  const paidPendingPreparationOrders = paidOrdersList.filter(
    (order) => order.status !== "FULFILLED",
  ).length;

  const billingTotal = paidOrdersList.reduce(
    (accumulator, order) => accumulator + toNumber(order.total),
    0,
  );
  const shippingCostTotal = paidOrdersList.reduce(
    (accumulator, order) => accumulator + toNumber(order.shippingCost),
    0,
  );
  const averageTicket = paidOrders > 0 ? billingTotal / paidOrders : 0;
  const totalUnitsSold = paidOrdersList.reduce(
    (accumulator, order) =>
      accumulator + order.items.reduce((sum, item) => sum + item.quantity, 0),
    0,
  );

  const dateBuckets = buildDateBuckets(period, now);
  const createdByDate = new Map(dateBuckets.map((bucket) => [bucket.key, 0]));
  const paidByDate = new Map(dateBuckets.map((bucket) => [bucket.key, 0]));
  const revenueByDate = new Map(dateBuckets.map((bucket) => [bucket.key, 0]));
  const unitsByDate = new Map(dateBuckets.map((bucket) => [bucket.key, 0]));

  const productStats = new Map<
    string,
    {
      productId: string;
      productName: string;
      productSlug: string;
      unitsSold: number;
      revenue: number;
      stock?: number;
    }
  >();
  const customerStats = new Map<
    string,
    {
      email: string;
      displayName: string;
      orders: number;
      revenue: number;
      firstOrderAt: Date;
      isNewCustomer: boolean;
    }
  >();
  const provinceStats = new Map<string, { province: string; orders: number; revenue: number }>();
  const cityStats = new Map<
    string,
    { province: string; city: string; orders: number; revenue: number }
  >();
  const paymentMethodStats = new Map<
    string,
    { method: string; label: string; orders: number; revenue: number }
  >();
  const paymentStatusStats = new Map<
    string,
    { status: string; label: string; orders: number }
  >();
  const shippingMethodStats = new Map<
    ShippingMethod,
    {
      method: ShippingMethod;
      label: string;
      orders: number;
      revenue: number;
      shippingCostTotal: number;
    }
  >();
  const paymentMethodFailureStats = new Map<
    string,
    {
      method: string;
      label: string;
      failedOrders: number;
      pendingOrders: number;
      revenue: number;
    }
  >();
  let freeShippingOrders = 0;

  for (const order of ordersInPeriod) {
    const paidOrder = isPaidOrder(order);

    const key = formatDateKey(order.createdAt);
    createdByDate.set(key, (createdByDate.get(key) ?? 0) + 1);

    if (paidOrder) {
      paidByDate.set(key, (paidByDate.get(key) ?? 0) + 1);
      const orderRevenue = toNumber(order.total);
      const orderUnits = order.items.reduce((sum, item) => sum + item.quantity, 0);

      revenueByDate.set(key, (revenueByDate.get(key) ?? 0) + orderRevenue);
      unitsByDate.set(key, (unitsByDate.get(key) ?? 0) + orderUnits);
    }

    const customerEmail = order.customer.email.toLowerCase();
    const existingCustomer = customerStats.get(customerEmail);
    const currentFirstOrderAt = existingCustomer?.firstOrderAt ?? order.createdAt;
    const firstOrderAt = order.createdAt < currentFirstOrderAt ? order.createdAt : currentFirstOrderAt;
    const customerEntry = existingCustomer ?? {
      email: order.customer.email,
      displayName: order.customer.fullName.trim() || maskEmail(order.customer.email),
      orders: 0,
      revenue: 0,
      firstOrderAt,
      isNewCustomer: false,
    };
    customerEntry.orders += 1;
    customerEntry.firstOrderAt = firstOrderAt;
    customerStats.set(customerEmail, customerEntry);

    const paymentStatus = paymentStatusStats.get(order.paymentStatus) ?? {
      status: order.paymentStatus,
      label: getPaymentStatusLabel(order.paymentStatus),
      orders: 0,
    };
    paymentStatus.orders += 1;
    paymentStatusStats.set(order.paymentStatus, paymentStatus);

    if (paidOrder) {
      const orderRevenue = toNumber(order.total);
      const orderShippingCost = toNumber(order.shippingCost);

      customerEntry.revenue += orderRevenue;

      const province = order.shippingAddress?.province.trim() || "Sin provincia";
      const city = order.shippingAddress?.city.trim() || "Sin localidad";

      const provinceEntry = provinceStats.get(province) ?? {
        province,
        orders: 0,
        revenue: 0,
      };
      provinceEntry.orders += 1;
      provinceEntry.revenue += orderRevenue;
      provinceStats.set(province, provinceEntry);

      const cityKey = `${province}::${city}`;
      const cityEntry = cityStats.get(cityKey) ?? {
        province,
        city,
        orders: 0,
        revenue: 0,
      };
      cityEntry.orders += 1;
      cityEntry.revenue += orderRevenue;
      cityStats.set(cityKey, cityEntry);

      const paymentMethod = order.paymentMethod ?? "GOCUOTAS";
      const paymentMethodLabel = getPaymentMethodLabel(paymentMethod);
      const paymentMethodEntry = paymentMethodStats.get(paymentMethod) ?? {
        method: paymentMethod,
        label: paymentMethodLabel,
        orders: 0,
        revenue: 0,
      };
      paymentMethodEntry.orders += 1;
      paymentMethodEntry.revenue += orderRevenue;
      paymentMethodStats.set(paymentMethod, paymentMethodEntry);

      const paymentFailureEntry = paymentMethodFailureStats.get(paymentMethod) ?? {
        method: paymentMethod,
        label: paymentMethodLabel,
        failedOrders: 0,
        pendingOrders: 0,
        revenue: 0,
      };
      if (isFailedOrder(order)) {
        paymentFailureEntry.failedOrders += 1;
      }
      if (isPendingPaymentOrder(order)) {
        paymentFailureEntry.pendingOrders += 1;
      }
      paymentFailureEntry.revenue += orderRevenue;
      paymentMethodFailureStats.set(paymentMethod, paymentFailureEntry);

      const shippingMethod = normalizeShippingMethod(order.shippingMethod);
      const shippingMethodEntry = shippingMethodStats.get(shippingMethod) ?? {
        method: shippingMethod,
        label: getShippingMethodLabel(shippingMethod),
        orders: 0,
        revenue: 0,
        shippingCostTotal: 0,
      };
      shippingMethodEntry.orders += 1;
      shippingMethodEntry.revenue += orderRevenue;
      shippingMethodEntry.shippingCostTotal += orderShippingCost;
      shippingMethodStats.set(shippingMethod, shippingMethodEntry);

      if (orderShippingCost === 0) {
        freeShippingOrders += 1;
      }

      for (const item of order.items) {
        const productEntry = productStats.get(item.productId) ?? {
          productId: item.productId,
          productName: item.productName,
          productSlug: item.productSlug,
          unitsSold: 0,
          revenue: 0,
        };
        productEntry.unitsSold += item.quantity;
        productEntry.revenue += toNumber(item.unitPrice) * item.quantity;
        productStats.set(item.productId, productEntry);
      }
    }
  }

  const firstOrderByEmail = new Map<string, Date>();
  for (const order of customersLifetime) {
    const email = order.customer.email.toLowerCase();
    const current = firstOrderByEmail.get(email);
    if (!current || order.createdAt < current) {
      firstOrderByEmail.set(email, order.createdAt);
    }
  }

  for (const customer of customerStats.values()) {
    const firstOrder = firstOrderByEmail.get(customer.email.toLowerCase());
    customer.isNewCustomer = Boolean(firstOrder && firstOrder >= start && firstOrder <= end);
  }

  const customerValues = [...customerStats.values()];
  const recurrentCustomers = customerValues.filter((customer) => customer.orders > 1).length;
  const newCustomers = customerValues.filter((customer) => customer.isNewCustomer).length;
  const sortedCustomers = customerValues.sort((left, right) => {
    if (right.revenue !== left.revenue) {
      return right.revenue - left.revenue;
    }

    return right.orders - left.orders;
  });

  const topCustomers = sortedCustomers
    .filter((customer) => customer.revenue > 0)
    .slice(0, 10);

  const topSold = [...productStats.values()]
    .sort((left, right) => {
      if (right.unitsSold !== left.unitsSold) {
        return right.unitsSold - left.unitsSold;
      }

      return right.revenue - left.revenue;
    })
    .slice(0, 50)
    .map((product) => ({
      ...product,
      stock:
        findProductInventory(currentProducts, product.productId, product.productSlug)?.stock ??
        undefined,
    }));

  const topRevenue = [...productStats.values()]
    .sort((left, right) => {
      if (right.revenue !== left.revenue) {
        return right.revenue - left.revenue;
      }

      return right.unitsSold - left.unitsSold;
    })
    .slice(0, 50)
    .map((product) => ({
      ...product,
      stock:
        findProductInventory(currentProducts, product.productId, product.productSlug)?.stock ??
        undefined,
    }));

  const lowStockAll = currentProducts
    .filter((product) => product.trackInventory && product.stock > 0 && product.stock <= LOW_STOCK_THRESHOLD)
    .map((product) => ({
      productId: product.sanityProductId,
      productName: product.title,
      productSlug: product.slug,
      stock: product.stock,
    }))
    .sort((left, right) => left.stock - right.stock || left.productName.localeCompare(right.productName));

  const outOfStockAll = currentProducts
    .filter((product) => product.trackInventory && product.stock <= 0)
    .map((product) => ({
      productId: product.sanityProductId,
      productName: product.title,
      productSlug: product.slug,
      stock: product.stock,
    }))
    .sort((left, right) => left.productName.localeCompare(right.productName));

  const lowStock = lowStockAll.slice(0, 10);
  const outOfStock = outOfStockAll.slice(0, 10);

  const paymentStatusBreakdown = [...paymentStatusStats.values()].sort(
    (left, right) => right.orders - left.orders || left.label.localeCompare(right.label),
  );

  const shippingMethodValues = [...shippingMethodStats.values()].sort(
    (left, right) => right.orders - left.orders || left.label.localeCompare(right.label),
  );
  const totalShippingOrders = shippingMethodValues.reduce((accumulator, item) => accumulator + item.orders, 0);
  const paidShippingOrders = Math.max(totalShippingOrders - freeShippingOrders, 0);
  const paymentFailedByMethod = [...paymentMethodFailureStats.values()].sort(
    (left, right) =>
      right.failedOrders - left.failedOrders ||
      right.pendingOrders - left.pendingOrders ||
      left.label.localeCompare(right.label),
  );

  const missingTracking = [
    "Visitas",
    "Vistas de producto",
    "Carritos",
    "Checkout iniciado real",
    "Abandono de checkout",
    "UTM source / medium / campaign",
    "Dispositivo",
  ];

  const daily = dateBuckets.map((bucket) => ({
    date: bucket.key,
    label: bucket.label,
    createdOrders: createdByDate.get(bucket.key) ?? 0,
    paidOrders: paidByDate.get(bucket.key) ?? 0,
    unitsSold: unitsByDate.get(bucket.key) ?? 0,
    revenue: revenueByDate.get(bucket.key) ?? 0,
  }));

  return {
    period,
    dateRange: {
      start,
      end,
    },
    summary: {
      billingTotal,
      paidOrders,
      createdOrders: ordersCreated,
      averageTicket,
      unitsSold: totalUnitsSold,
      distinctProductsSold: productStats.size,
      lowStockProducts: lowStockAll.length,
      outOfStockProducts: outOfStockAll.length,
    },
    sales: {
      daily,
    },
    conversion: {
      checkoutOrders: ordersCreated,
      paidOrders,
      approvalRate: ordersCreated > 0 ? (paidOrders / ordersCreated) * 100 : 0,
      pendingOrders: pendingPaymentOrders,
      failedOrders,
      cancelledOrders,
      fulfilledOrders,
      paidPendingPreparationOrders,
      paymentStatusBreakdown,
    },
    products: {
      topSold,
      topRevenue,
      lowStock,
      outOfStock,
    },
    customers: {
      uniqueCustomers: customerStats.size,
      recurrentCustomers,
      newCustomers,
      allCustomers: sortedCustomers
        .filter((customer) => customer.orders > 0)
        .map((customer) => ({
          ...customer,
          firstOrderAt: customer.firstOrderAt.toISOString(),
        })),
      topCustomers: topCustomers.map((customer) => ({
        ...customer,
        firstOrderAt: customer.firstOrderAt.toISOString(),
      })),
    },
    location: {
      provinces: [...provinceStats.values()].sort(
        (left, right) => right.revenue - left.revenue || right.orders - left.orders,
      ),
      cities: [...cityStats.values()].sort(
        (left, right) => right.revenue - left.revenue || right.orders - left.orders,
      ),
    },
    payments: {
      methods: paymentMethodStats.size
        ? [...paymentMethodStats.values()].sort(
            (left, right) => right.orders - left.orders || right.revenue - left.revenue,
          )
        : [],
      statusBreakdown: paymentStatusBreakdown,
      failedByMethod: paymentFailedByMethod,
    },
    shipping: {
      methods: shippingMethodValues,
      totalShippingCost: shippingCostTotal,
      averageShippingCost: totalShippingOrders > 0 ? shippingCostTotal / totalShippingOrders : 0,
      shippingOrders: totalShippingOrders,
      freeShippingOrders,
      paidShippingOrders,
      pickupOrders: shippingMethodStats.get(SHIPPING_METHODS.RESISTANCE_PICKUP)?.orders ?? 0,
      homeDeliveryOrders: shippingMethodStats.get(SHIPPING_METHODS.HOME_DELIVERY)?.orders ?? 0,
      cityBranchOrders: shippingMethodStats.get(SHIPPING_METHODS.CITY_BRANCH)?.orders ?? 0,
    },
    alerts: {
      pendingPaymentOrders,
      paidPendingPreparationOrders,
    },
    marketing: {
      missingTracking,
    },
  };
}
