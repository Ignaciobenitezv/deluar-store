import type { Order } from "@/features/order/types";
import { createCheckout as createGoCuotasCheckout } from "@/features/payments/gocuotas/client";
import type {
  PaymentProvider,
  PaymentProviderCheckoutResult,
} from "@/features/payments/provider";
import { env } from "@/lib/env";
import { buildSiteUrl } from "@/features/payments/provider-utils";

function validateGoCuotasConfiguration() {
  if (!env.gocuotasEmail || !env.gocuotasPassword) {
    throw new Error("Faltan credenciales de GoCuotas.");
  }
}

export const goCuotasProvider: PaymentProvider = {
  method: "gocuotas",
  displayName: "GoCuotas",
  checkoutFailureMessage: "No se pudo crear el checkout de GoCuotas.",
  validateConfiguration() {
    validateGoCuotasConfiguration();
  },
  async createCheckout(order: Order): Promise<PaymentProviderCheckoutResult> {
    validateGoCuotasConfiguration();

    const checkout = await createGoCuotasCheckout({
      amount_in_cents: Math.round(order.total * 100),
      url_success: env.gocuotasSuccessUrl || buildSiteUrl("/checkout/success"),
      url_failure: env.gocuotasFailureUrl || buildSiteUrl("/checkout/failure"),
      webhook_url: buildSiteUrl("/api/payments/gocuotas/webhook"),
      order_reference_id: order.orderNumber,
      email: order.customer.email,
      phone_number: order.customer.phone,
    });

    return {
      checkoutUrl: checkout.checkoutUrl,
      rawProviderStatus: checkout.rawProviderStatus,
    };
  },
};
