import { env } from "@/lib/env";
import { canUseRealPayments } from "@/lib/deployment";

export function hasMercadoPagoCredentials() {
  return canUseRealPayments && Boolean(env.mercadoPagoAccessToken);
}

export function getMercadoPagoNotificationUrl() {
  return new URL("/api/payments/mercadopago/webhook", env.siteUrl).toString();
}

export function getMercadoPagoReturnUrls() {
  return {
    success: new URL("/checkout/exito", env.siteUrl).toString(),
    failure: new URL("/checkout/error", env.siteUrl).toString(),
    pending: new URL("/checkout/pendiente", env.siteUrl).toString(),
  };
}
