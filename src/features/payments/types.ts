export const PAYMENT_METHODS = {
  GOCUOTAS: "gocuotas",
  TRANSFER: "transfer",
  GETNET: "getnet",
  UNICOBROS: "unicobros",
} as const;

export const isUnicobrosEnabled = process.env.NEXT_PUBLIC_ENABLE_UNICOBROS === "true";

export type PaymentMethod =
  (typeof PAYMENT_METHODS)[keyof typeof PAYMENT_METHODS];

export type EnabledCheckoutPaymentMethod = Exclude<PaymentMethod, "getnet">;

export const ENABLED_CHECKOUT_PAYMENT_METHODS = [
  PAYMENT_METHODS.GOCUOTAS,
  ...(isUnicobrosEnabled ? [PAYMENT_METHODS.UNICOBROS] : []),
  PAYMENT_METHODS.TRANSFER,
] as const;

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
