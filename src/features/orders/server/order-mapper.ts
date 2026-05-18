import type { Order as CheckoutOrder, OrderStatus as CheckoutOrderStatus } from "@/features/order/types";
import type { Prisma } from "@/generated/prisma/client";

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
