import { prisma } from "@/lib/prisma";
import type {
  Prisma,
  OrderStatus as PrismaOrderStatus,
  PaymentStatus as PrismaPaymentStatus,
} from "@/generated/prisma/client";

const orderInclude = {
  customer: true,
  shippingAddress: true,
  items: {
    include: {
      productSnapshot: true,
    },
  },
} satisfies Prisma.OrderInclude;

export async function getMercadoPagoOrderById(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: orderInclude,
  });
}

export async function getMercadoPagoOrderByPreferenceId(preferenceId: string) {
  return prisma.order.findUnique({
    where: { providerPreferenceId: preferenceId },
    include: orderInclude,
  });
}

export async function getMercadoPagoOrderByExternalReference(externalReference: string) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    externalReference,
  );

  return prisma.order.findFirst({
    where: {
      OR: [
        { orderNumber: externalReference },
        ...(isUuid ? [{ id: externalReference }] : []),
      ],
    },
    include: orderInclude,
  });
}

export async function markOrderWithMercadoPagoPreference(params: {
  orderId: string;
  preferenceId: string;
}) {
  return prisma.order.update({
    where: { id: params.orderId },
    data: {
      paymentProvider: "MERCADO_PAGO",
      providerPreferenceId: params.preferenceId,
      paymentStatus: "PENDING",
    },
    include: orderInclude,
  });
}

export async function markOrderWithMercadoPagoPaymentId(params: {
  orderId: string;
  paymentId: string;
}) {
  return prisma.order.update({
    where: { id: params.orderId },
    data: {
      providerPaymentId: params.paymentId,
    },
    include: orderInclude,
  });
}

export async function updateMercadoPagoOrderPaymentStatus(params: {
  tx: Prisma.TransactionClient;
  orderId: string;
  paymentId: string;
  orderStatus: PrismaOrderStatus;
  paymentStatus: PrismaPaymentStatus;
}) {
  return params.tx.order.update({
    where: { id: params.orderId },
    data: {
      paymentProvider: "MERCADO_PAGO",
      providerPaymentId: params.paymentId,
      status: params.orderStatus,
      paymentStatus: params.paymentStatus,
    },
    include: orderInclude,
  });
}
