import { prisma } from "@/lib/prisma";
import { recordAnalyticsOrderCreated } from "@/features/analytics/server/lifecycle";

type LinkAnalyticsCartToOrderInput = {
  cartId: string;
  orderId: string;
};

export async function linkAnalyticsCartToOrder({
  cartId,
  orderId,
}: LinkAnalyticsCartToOrderInput) {
  try {
    const now = new Date();

    await prisma.analyticsCart.updateMany({
      where: {
        cartId,
        convertedOrderId: null,
      },
      data: {
        convertedOrderId: orderId,
        convertedAt: now,
        status: "ORDER_CREATED",
        lastActivityAt: now,
        abandonedAt: null,
      },
    });

    await recordAnalyticsOrderCreated({
      cartId,
      orderId,
      now,
    });
  } catch {
    // Analytics must never break checkout/order creation.
  }
}
