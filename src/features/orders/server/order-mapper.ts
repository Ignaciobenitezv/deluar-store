import type { Order as CheckoutOrder, OrderStatus as CheckoutOrderStatus } from "@/features/order/types";
import type { Prisma } from "@/generated/prisma/client";
import { PAYMENT_METHODS, type PaymentMethod } from "@/features/payments/types";

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

export function mapPersistedOrderToCheckoutOrder(order: PersistedOrder): CheckoutOrder {
  const customerName = splitFullName(order.customer.fullName);

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: toCheckoutStatus(order.status),
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
      quantity: item.quantity,
      unitPrice: toNumber(item.unitPrice),
      transferPrice: item.transferPrice ? toNumber(item.transferPrice) : undefined,
      lineTotal: toNumber(item.unitPrice) * item.quantity,
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
      address: order.shippingAddress?.address ?? "",
      city: order.shippingAddress?.city ?? "",
      province: order.shippingAddress?.province ?? "",
      postalCode: order.shippingAddress?.postalCode ?? "",
    },
    createdAt: order.createdAt.toISOString(),
  };
}
