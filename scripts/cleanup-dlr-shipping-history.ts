import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env.production.local" });
loadEnv({ path: ".env" });

type PrismaModule = typeof import("../src/lib/prisma");

const TARGET_PREFIX = "DLR-";

let prisma: PrismaModule["prisma"];

async function main() {
  ({ prisma } = await import("../src/lib/prisma"));

  const orders = await prisma.order.findMany({
    where: {
      orderNumber: {
        startsWith: TARGET_PREFIX,
      },
    },
    select: {
      id: true,
      orderNumber: true,
      customerId: true,
      shippingAddressId: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (orders.length === 0) {
    console.log("No DLR fixtures found.");
    return;
  }

  const orderIds = orders.map((order) => order.id);
  const customerIds = [...new Set(orders.map((order) => order.customerId))];
  const shippingAddressIds = [...new Set(orders.map((order) => order.shippingAddressId).filter(Boolean))] as string[];

  const batches = await prisma.andreaniExportBatch.findMany({
    include: {
      shipments: {
        include: {
          order: {
            select: {
              orderNumber: true,
            },
          },
        },
      },
    },
  });

  const targetSet = new Set(orders.map((order) => order.orderNumber));
  const batchIds = batches
    .filter((batch) => batch.shipments.length > 0 && batch.shipments.every((shipment) => targetSet.has(shipment.order.orderNumber)))
    .map((batch) => batch.id);

  await prisma.$transaction(async (tx) => {
    if (batchIds.length > 0) {
      await tx.andreaniExportBatch.deleteMany({
        where: {
          id: {
            in: batchIds,
          },
        },
      });
    }

    await tx.mercadoPagoWebhookEvent.deleteMany({ where: { orderId: { in: orderIds } } });
    await tx.paymentWebhookEvent.deleteMany({ where: { orderId: { in: orderIds } } });
    await tx.emailLog.deleteMany({ where: { orderId: { in: orderIds } } });
    await tx.analyticsEvent.deleteMany({ where: { orderId: { in: orderIds } } });
    await tx.analyticsCart.deleteMany({ where: { convertedOrderId: { in: orderIds } } });
    await tx.order.deleteMany({ where: { id: { in: orderIds } } });

    if (shippingAddressIds.length > 0) {
      await tx.shippingAddress.deleteMany({ where: { id: { in: shippingAddressIds } } });
    }

    if (customerIds.length > 0) {
      const customers = await tx.customer.findMany({
        where: { id: { in: customerIds } },
        select: {
          id: true,
          _count: {
            select: {
              orders: true,
            },
          },
        },
      });

      const deletableCustomerIds = customers
        .filter((customer) => customer._count.orders === 0)
        .map((customer) => customer.id);

      if (deletableCustomerIds.length > 0) {
        await tx.customer.deleteMany({ where: { id: { in: deletableCustomerIds } } });
      }
    }
  });

  console.log(
    JSON.stringify(
      {
        removedOrders: orders.map((order) => order.orderNumber),
        removedCount: orders.length,
        removedBatches: batchIds,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
