import { getnetConfig, hasGetnetCredentials } from "@/integrations/getnet/config";
import { logger } from "@/lib/logger";
import type {
  GetnetInitPaymentResponse,
  GetnetPaymentPayload,
} from "@/integrations/getnet/types";
import type { Order } from "@/features/order/types";

function buildPaymentPayload(order: Order): GetnetPaymentPayload {
  return {
    externalReference: order.orderNumber,
    amount: order.total,
    currency: "ARS",
    description: `Pago de orden ${order.orderNumber}`,
    customer: {
      name: `${order.customer.firstName} ${order.customer.lastName}`,
      email: order.customer.email,
      phone: order.customer.phone,
    },
    items: order.items.map((item) => ({
      title: item.title,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
    returnUrls: {
      success: getnetConfig.successUrl,
      failure: getnetConfig.failureUrl,
      pending: getnetConfig.pendingUrl,
    },
  };
}

export async function initGetnetPayment(order: Order): Promise<GetnetInitPaymentResponse> {
  const paymentPayload = buildPaymentPayload(order);

  logger.info("payments.getnet.init.started", {
    orderId: order.id,
    orderNumber: order.orderNumber,
    amount: order.total,
    itemCount: order.items.length,
  });

  if (!hasGetnetCredentials()) {
    logger.warn("payments.getnet.init.missing_credentials", {
      orderId: order.id,
      environment: getnetConfig.environment,
    });

    return {
      provider: "getnet",
      mode: "mock",
      status: "requires_configuration",
      orderId: order.id,
      orderNumber: order.orderNumber,
      paymentPayload,
      checkoutUrl: null,
      message:
        "La orden esta lista para iniciar el pago, pero Getnet aun no esta configurado.",
    };
  }

  logger.info("payments.getnet.init.ready_for_live", {
    orderId: order.id,
    environment: getnetConfig.environment,
    hasReturnUrls: Boolean(
      getnetConfig.successUrl && getnetConfig.failureUrl && getnetConfig.pendingUrl,
    ),
  });

  return {
    provider: "getnet",
    mode: "live",
    status: "ready",
    orderId: order.id,
    orderNumber: order.orderNumber,
    paymentPayload,
    checkoutUrl: null,
    message:
      "La configuracion base de Getnet esta presente. En el siguiente paso se conectara la API real.",
  };
}
