import type { Order } from "@/features/order/types";
import { createGetnetPaymentIntent } from "@/features/payments/getnet/client";
import type {
  PaymentProvider,
  PaymentProviderCheckoutResult,
} from "@/features/payments/provider";
import { env } from "@/lib/env";

function validateGetnetConfiguration() {
  if (!env.getnetApiBaseUrl) {
    throw new Error("Falta GETNET_API_BASE_URL.");
  }

  if (!env.getnetClientId || !env.getnetClientSecret) {
    throw new Error("Faltan credenciales OAuth2 de Getnet.");
  }

  if (!env.getnetWebCheckoutBaseUrl) {
    throw new Error("Falta GETNET_WEB_CHECKOUT_BASE_URL.");
  }
}

export const getnetProvider: PaymentProvider = {
  method: "getnet",
  displayName: "Getnet",
  checkoutFailureMessage: "No se pudo crear el payment intent de Getnet.",
  validateConfiguration() {
    validateGetnetConfiguration();
  },
  async createCheckout(order: Order): Promise<PaymentProviderCheckoutResult> {
    validateGetnetConfiguration();

    const paymentIntent = await createGetnetPaymentIntent(order);

    return {
      checkoutUrl: paymentIntent.redirectUrl,
      rawProviderStatus: paymentIntent.rawProviderStatus,
      providerPaymentId: paymentIntent.paymentIntentId,
    };
  },
};
