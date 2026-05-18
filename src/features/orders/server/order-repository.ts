import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import type { Order } from "@/features/order/types";
import { mapPersistedOrderToCheckoutOrder } from "@/features/orders/server/order-mapper";

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
        shippingCost: decimal(input.shippingCost ?? 0),
        total: decimal(input.total),
        paymentMethod: "GETNET",
        paymentStatus: "PENDING",
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

export async function listOrders() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: orderInclude,
  });

  return orders.map(mapPersistedOrderToCheckoutOrder);
}
