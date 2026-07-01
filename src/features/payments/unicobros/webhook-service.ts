import type { UnicobrosWebhookPayload } from "@/features/payments/unicobros/types";

export async function handleUnicobrosWebhook(payload: UnicobrosWebhookPayload) {
  void payload;
  return {
    ok: false as const,
    status: 501,
    message: "Unicobros webhook is not implemented yet.",
  };
}
