import type { Order as CheckoutOrder, OrderStatus as CheckoutOrderStatus } from "@/features/order/types";
import type { Prisma } from "@/generated/prisma/client";
import { PAYMENT_METHODS, type PaymentMethod } from "@/features/payments/types";
import { normalizeShippingMethod } from "@/features/shipping/shipping";

type PersistedOrder = Prisma.OrderGetPayload<{
  include: {
    customer: true;
    shippingAddress: true;
    items: {
      include: {
        productSnapshot: true;
      };
    };
  };
}>;

function toNumber(value: Prisma.Decimal | number) {
  return typeof value === "number" ? value : value.toNumber();
}

function toCheckoutStatus(status: PersistedOrder["status"]): CheckoutOrderStatus {
  if (status === "CREATED" || status === "PENDING_PAYMENT") {
    return "pending_payment";
  }

  return status.toLowerCase() as CheckoutOrderStatus;
}

function toCheckoutPaymentMethod(method: PersistedOrder["paymentMethod"]): PaymentMethod {
  switch (method) {
    case "TRANSFER":
      return PAYMENT_METHODS.TRANSFER;
    case "GETNET":
      return PAYMENT_METHODS.GETNET;
    case "UNICOBROS":
      return PAYMENT_METHODS.UNICOBROS;
    case "GOCUOTAS":
    default:
      return PAYMENT_METHODS.GOCUOTAS;
  }
}

function toCheckoutPaymentProvider(provider: PersistedOrder["paymentProvider"]) {
  switch (provider) {
    case "GETNET":
      return "getnet" as const;
    case "MERCADO_PAGO":
      return "mercado_pago" as const;
    case "GOCUOTAS":
      return "gocuotas" as const;
    case "UNICOBROS":
      return "unicobros" as const;
    default:
      return undefined;
  }
}

function toCheckoutPaymentStatus(status: PersistedOrder["paymentStatus"]) {
  return status.toLowerCase() as CheckoutOrder["paymentStatus"];
}

function splitFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const firstName = parts.shift() ?? fullName;

  return {
    firstName,
    lastName: parts.join(" "),
  };
}

function getCustomerName(order: PersistedOrder["customer"]) {
  if (order.firstName || order.lastName) {
    return {
      firstName: order.firstName?.trim() || "",
      lastName: order.lastName?.trim() || "",
    };
  }

  return splitFullName(order.fullName);
}

function buildLegacyAddress(order: PersistedOrder["shippingAddress"] | null) {
  if (!order) {
    return "";
  }

  if (order.address?.trim()) {
    return order.address;
  }

  const streetLine = [order.street, order.streetNumber].filter(Boolean).join(" ").trim();
  const floorLine = [order.floor ? `Piso ${order.floor}` : "", order.apartment ? `Depto ${order.apartment}` : ""]
    .filter(Boolean)
    .join(", ")
    .trim();
  const locationLine = [order.city, order.province, order.postalCode].filter(Boolean).join(", ").trim();

  return [streetLine, floorLine, locationLine].filter(Boolean).join(" | ");
}

function toVariantAttributes(
  value: Prisma.JsonValue | null,
): CheckoutOrder["items"][number]["variantAttributes"] {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value as CheckoutOrder["items"][number]["variantAttributes"];
}

export function mapPersistedOrderToCheckoutOrder(order: PersistedOrder): CheckoutOrder {
  const customerName = getCustomerName(order.customer);

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: toCheckoutStatus(order.status),
    shippingMethod: normalizeShippingMethod(order.shippingMethod),
    shippingCost: toNumber(order.shippingCost),
    paymentMethod: toCheckoutPaymentMethod(order.paymentMethod),
    paymentProvider: toCheckoutPaymentProvider(order.paymentProvider),
    paymentStatus: toCheckoutPaymentStatus(order.paymentStatus),
    externalReference: order.externalReference ?? undefined,
    checkoutUrl: order.checkoutUrl ?? undefined,
    rawProviderStatus: order.rawProviderStatus ?? undefined,
    installments: order.installments ?? undefined,
    items: order.items.map((item) => ({
      productId: item.productId,
      productSlug: item.productSlug,
      title: item.productName,
      imageUrl: item.imageUrl,
      imageAlt: item.productName,
      variantId: item.variantId ?? undefined,
      variantValue: item.variantValue ?? undefined,
      variantLabel: item.variantLabel ?? undefined,
      variantAttributes: toVariantAttributes(item.variantAttributes),
      variantSku: item.variantSku ?? undefined,
      quantity: item.quantity,
      unitPrice: toNumber(item.unitPrice),
      transferPrice: item.transferPrice ? toNumber(item.transferPrice) : undefined,
      lineTotal: toNumber(item.unitPrice) * item.quantity,
      weightGrams: item.weightGrams ?? undefined,
      heightCm: item.heightCm ?? undefined,
      widthCm: item.widthCm ?? undefined,
      depthCm: item.depthCm ?? undefined,
    })),
    subtotal: toNumber(order.subtotal),
    total: toNumber(order.total),
    customer: {
      firstName: customerName.firstName,
      lastName: customerName.lastName,
      email: order.customer.email,
      phone: order.customer.phone,
      notes: order.shippingAddress?.notes ?? "",
    },
    shippingAddress: {
      firstName: order.shippingAddress?.firstName ?? customerName.firstName,
      lastName: order.shippingAddress?.lastName ?? customerName.lastName,
      dni: order.shippingAddress?.dni ?? undefined,
      email: order.shippingAddress?.email ?? order.customer.email,
      phone: order.shippingAddress?.phone ?? order.customer.phone,
      phoneAreaCode: order.shippingAddress?.phoneAreaCode ?? undefined,
      phoneNumber: order.shippingAddress?.phoneNumber ?? undefined,
      street: order.shippingAddress?.street ?? "",
      streetNumber: order.shippingAddress?.streetNumber ?? "",
      floor: order.shippingAddress?.floor ?? undefined,
      apartment: order.shippingAddress?.apartment ?? undefined,
      address: buildLegacyAddress(order.shippingAddress),
      city: order.shippingAddress?.city ?? "",
      province: order.shippingAddress?.province ?? "",
      postalCode: order.shippingAddress?.postalCode ?? "",
      notes: order.shippingAddress?.notes ?? "",
    },
    createdAt: order.createdAt.toISOString(),
  };
}
