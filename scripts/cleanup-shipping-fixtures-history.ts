import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env.production.local" });
loadEnv({ path: ".env" });

type PrismaModule = typeof import("../src/lib/prisma");

const FIXTURE_ORDER_NUMBERS = [
  "E2E-SHIP-A-20260629",
  "E2E-SHIP-B-20260629",
  "SHIPQA-HOME-20260831-01",
  "SHIPQA-BADRECIP-20260831-01",
  "SHIPQA-BRANCH-20260831-01",
  "E2E-SHIP-CORRIENTES-20260901-01",
  "E2E-SHIP-CORDOBA-20260901-01",
  "E2E-SHIP-SANTAFE-20260901-01",
] as const;

let prisma: PrismaModule["prisma"];

async function main() {
  ({ prisma } = await import("../src/lib/prisma"));

  const orders = await prisma.order.findMany({
    where: {
      orderNumber: {
        in: [...FIXTURE_ORDER_NUMBERS],
      },
    },
    select: {
      id: true,
      orderNumber: true,
      customerId: true,
      shippingAddressId: true,
    },
  });

  if (orders.length === 0) {
    console.log("No confirmed historical shipping fixtures found.");
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

  const fixtureSet = new Set<string>(FIXTURE_ORDER_NUMBERS);
  const batchIds = batches
    .filter((batch) => batch.shipments.length > 0 && batch.shipments.every((shipment) => fixtureSet.has(shipment.order.orderNumber)))
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
          _count: { select: { orders: true } },
        },
      });

      const deletableCustomerIds = customers.filter((customer) => customer._count.orders === 0).map((customer) => customer.id);
      if (deletableCustomerIds.length > 0) {
        await tx.customer.deleteMany({ where: { id: { in: deletableCustomerIds } } });
      }
    }
  });

  console.log(
    JSON.stringify(
      {
        removedOrders: orders.map((order) => order.orderNumber),
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
