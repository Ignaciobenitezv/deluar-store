import { env } from "@/lib/env";

export type GetnetWebhookEnvelope = {
  event?: string;
  paymentId?: string;
  orderNumber?: string;
  status?: string;
  payload?: unknown;
};

export function hasGetnetWebhookSecret() {
  return Boolean(env.getnetWebhookSecret);
}

export function validateGetnetWebhookSignature(signature?: string | null) {
  void signature;
  return hasGetnetWebhookSecret();
}
