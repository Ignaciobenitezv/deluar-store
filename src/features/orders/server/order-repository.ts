import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
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

function decimal(value: number) {
  return new Prisma.Decimal(value);
}

function toPrismaPaymentMethod(paymentMethod: EnabledCheckoutPaymentMethod) {
  switch (paymentMethod) {
    case PAYMENT_METHODS.TRANSFER:
      return "TRANSFER" as const;
    case PAYMENT_METHODS.GETNET:
      return "GETNET" as const;
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
    case PAYMENT_METHODS.GETNET:
      return "GETNET" as const;
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

export async function markOrderWithGetnetCheckout(params: {
  orderId: string;
  paymentIntentId: string;
  checkoutUrl: string;
  rawProviderStatus?: string;
  externalReference: string;
}) {
  const order = await prisma.order.update({
    where: { id: params.orderId },
    data: {
      status: "PENDING_PAYMENT",
      paymentMethod: "GETNET",
      paymentProvider: "GETNET",
      paymentStatus: "PENDING",
      externalReference: params.externalReference,
      providerPaymentId: params.paymentIntentId,
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
