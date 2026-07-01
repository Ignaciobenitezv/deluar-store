import type { Order } from "@/features/order/types";
import type { PaymentMethod } from "@/features/payments/types";
import type { OrderStatus, PaymentStatus } from "@/generated/prisma/client";

export type PaymentProviderMethod = Extract<
  PaymentMethod,
  "gocuotas" | "getnet" | "unicobros"
>;

export type PaymentProviderCheckoutResult = {
  checkoutUrl: string;
  rawProviderStatus?: string;
  providerPaymentId?: string;
};

export type PaymentProviderStatus = {
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
};

export type PaymentProviderWebhookResult = {
  duplicated: boolean;
  linkedOrderId: string | null;
};

export interface PaymentProvider {
  readonly method: PaymentProviderMethod;
  readonly displayName: string;
  readonly checkoutFailureMessage: string;

  validateConfiguration(): void;
  createCheckout(order: Order): Promise<PaymentProviderCheckoutResult>;
  normalizeStatus?(status: string): PaymentProviderStatus;
  handleWebhook?(payload: unknown): Promise<PaymentProviderWebhookResult>;
}
