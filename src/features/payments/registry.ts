import { goCuotasProvider } from "@/features/payments/gocuotas/provider";
import { unicobrosProvider } from "@/features/payments/unicobros/provider";
import { PAYMENT_METHODS, type PaymentMethod } from "@/features/payments/types";
import type { PaymentProvider } from "@/features/payments/provider";

const CHECKOUT_PAYMENT_PROVIDERS: Partial<Record<PaymentMethod, PaymentProvider>> = {
  [PAYMENT_METHODS.GOCUOTAS]: goCuotasProvider,
  [PAYMENT_METHODS.UNICOBROS]: unicobrosProvider,
};

export function resolvePaymentProvider(paymentMethod: PaymentMethod): PaymentProvider | null {
  return CHECKOUT_PAYMENT_PROVIDERS[paymentMethod] ?? null;
}
