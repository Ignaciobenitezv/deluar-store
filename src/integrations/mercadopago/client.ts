import { MercadoPagoConfig, Preference, Payment } from "mercadopago";
import { env } from "@/lib/env";

function getMercadoPagoConfig() {
  if (!env.mercadoPagoAccessToken) {
    throw new Error("MERCADOPAGO_ACCESS_TOKEN no esta configurado.");
  }

  return new MercadoPagoConfig({
    accessToken: env.mercadoPagoAccessToken,
  });
}

export function getMercadoPagoPreferenceClient() {
  return new Preference(getMercadoPagoConfig());
}

export function getMercadoPagoPaymentClient() {
  return new Payment(getMercadoPagoConfig());
}
