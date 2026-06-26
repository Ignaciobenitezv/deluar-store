import { createGetnetPaymentIntent } from "@/features/payments/getnet/client";
import { logger } from "@/lib/logger";
import type { GetnetInitPaymentResponse } from "@/integrations/getnet/types";
import type { Order } from "@/features/order/types";

export async function initGetnetPayment(order: Order): Promise<GetnetInitPaymentResponse> {
  logger.info("getnet.payment_intent.started", {
    orderId: order.id,
    orderNumber: order.orderNumber,
    amount: order.total,
    itemCount: order.items.length,
  });

  const paymentIntent = await createGetnetPaymentIntent(order);

  return {
    provider: "getnet",
    status: "payment_intent_created",
    orderId: order.id,
    orderNumber: order.orderNumber,
    paymentIntentId: paymentIntent.paymentIntentId,
    checkoutUrl: paymentIntent.redirectUrl,
    amount: paymentIntent.amount,
  };
}
