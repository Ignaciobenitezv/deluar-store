import { prisma } from "@/lib/prisma";

export async function saveMercadoPagoWebhookEvent(input: {
  dedupeKey: string;
  provider: string;
  providerEventId?: string;
  providerPaymentId?: string;
  externalReference?: string;
  topic?: string;
  action?: string;
  orderId?: string;
  payload: unknown;
  headers?: unknown;
}) {
  return prisma.mercadoPagoWebhookEvent.create({
    data: {
      dedupeKey: input.dedupeKey,
      provider: input.provider,
      providerEventId: input.providerEventId,
      providerPaymentId: input.providerPaymentId,
      externalReference: input.externalReference,
      topic: input.topic,
      action: input.action,
      orderId: input.orderId,
      payload: input.payload as never,
      headers: input.headers as never,
    },
  });
}

export async function getMercadoPagoWebhookEventByDedupeKey(dedupeKey: string) {
  return prisma.mercadoPagoWebhookEvent.findUnique({
    where: { dedupeKey },
  });
}
