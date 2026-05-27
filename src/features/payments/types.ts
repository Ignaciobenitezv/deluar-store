export const PAYMENT_METHODS = {
  GOCUOTAS: "gocuotas",
  TRANSFER: "transfer",
  GETNET: "getnet",
} as const;

export type PaymentMethod =
  (typeof PAYMENT_METHODS)[keyof typeof PAYMENT_METHODS];

export const ENABLED_CHECKOUT_PAYMENT_METHODS = [
  PAYMENT_METHODS.GOCUOTAS,
  PAYMENT_METHODS.TRANSFER,
] as const;

export type EnabledCheckoutPaymentMethod =
  (typeof ENABLED_CHECKOUT_PAYMENT_METHODS)[number];

export const DEFAULT_CHECKOUT_PAYMENT_METHOD = PAYMENT_METHODS.GOCUOTAS;

export function isEnabledCheckoutPaymentMethod(
  value: unknown,
): value is EnabledCheckoutPaymentMethod {
  return ENABLED_CHECKOUT_PAYMENT_METHODS.includes(
    value as EnabledCheckoutPaymentMethod,
  );
}

export function normalizeCheckoutPaymentMethod(
  value: unknown,
): EnabledCheckoutPaymentMethod {
  return isEnabledCheckoutPaymentMethod(value)
    ? value
    : DEFAULT_CHECKOUT_PAYMENT_METHOD;
}

