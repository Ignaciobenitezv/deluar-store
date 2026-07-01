import type { Order } from "@/features/order/types";
import type { PaymentProvider } from "@/features/payments/provider";
import { env } from "@/lib/env";
import { buildUnicobrosHeaders, getUnicobrosBaseUrl } from "@/features/payments/unicobros/client";
import type { PaymentProviderCheckoutResult } from "@/features/payments/provider";

function validateUnicobrosConfiguration() {
  if (!env.unicobrosApiKey) {
    throw new Error("Falta UNICOBROS_API_KEY.");
  }

  if (!env.unicobrosAccessToken) {
    throw new Error("Falta UNICOBROS_ACCESS_TOKEN.");
  }

  if (!env.unicobrosBaseUrl) {
    throw new Error("Falta UNICOBROS_BASE_URL.");
  }
}

export const unicobrosProvider: PaymentProvider = {
  method: "unicobros",
  displayName: "Unicobros",
  checkoutFailureMessage: "Unicobros checkout is not implemented yet.",
  validateConfiguration() {
    validateUnicobrosConfiguration();
  },
  async createCheckout(order: Order): Promise<PaymentProviderCheckoutResult> {
    validateUnicobrosConfiguration();
    void order;
    buildUnicobrosHeaders();
    getUnicobrosBaseUrl();
    throw new Error("Unicobros checkout is not implemented yet.");
  },
};
