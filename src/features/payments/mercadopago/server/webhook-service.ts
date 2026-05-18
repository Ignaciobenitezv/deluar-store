import crypto from "node:crypto";
import { getMercadoPagoPaymentClient } from "@/integrations/mercadopago/client";
import { validateMercadoPagoWebhookSignature } from "@/integrations/mercadopago/signature";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  getMercadoPagoOrderByExternalReference,
  updateMercadoPagoOrderPaymentStatus,
} from "@/features/payments/mercadopago/server/order-repository";
import { getMercadoPagoWebhookEventByDedupeKey } from "@/features/payments/mercadopago/server/webhook-repository";
import { mapMercadoPagoStatus } from "@/features/payments/mercadopago/server/map-payment-status";

type MercadoPagoWebhookPayload = {
  id?: string | number;
  type?: string;
  action?: string;
  live_mode?: boolean;
  user_id?: string | number;
  api_version?: string;
  data?: {
    id?: string | number;
  };
  topic?: string;
  external_reference?: string;
};

function buildDedupeKey(payload: MercadoPagoWebhookPayload) {
  const dataId = payload.data?.id ?? payload.id ?? "";
  const topic = payload.topic ?? payload.type ?? "";
  const action = payload.action ?? "";
  const externalReference = payload.external_reference ?? "";
  const basis = `${topic}:${action}:${dataId}:${externalReference}`;

  return crypto.createHash("sha256").update(basis).digest("hex");
}

export async function handleMercadoPagoWebhook(
  payload: MercadoPagoWebhookPayload,
  rawBody: string,
  headers: Record<string, string>,
) {
  const dedupeKey = buildDedupeKey(payload);
  const providerPaymentId = payload.data?.id?.toString() ?? payload.id?.toString();
  const externalReference = payload.external_reference;
  const signature = headers["x-signature"] ?? headers["X-Signature"];
  const requestId = headers["x-request-id"] ?? headers["X-Request-Id"];

  if (
    !validateMercadoPagoWebhookSignature({
      signature,
      requestId,
      dataId: providerPaymentId,
    })
  ) {
    return { duplicated: false as const, rejected: true as const };
  }

  const existingEvent = await getMercadoPagoWebhookEventByDedupeKey(dedupeKey);

  if (existingEvent) {
    return { duplicated: true as const };
  }

  const paymentClient = getMercadoPagoPaymentClient();
  const payment = providerPaymentId ? await paymentClient.get({ id: providerPaymentId }) : null;
  const paymentState = payment?.status ?? payload.type;
  const mappedStatus = mapMercadoPagoStatus(paymentState);
  const linkedOrder = externalReference
    ? await getMercadoPagoOrderByExternalReference(externalReference).catch(() => null)
    : null;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.mercadoPagoWebhookEvent.create({
        data: {
          dedupeKey,
          provider: "mercado_pago",
          providerEventId: payload.id?.toString(),
          providerPaymentId,
          externalReference,
          topic: payload.topic ?? payload.type,
          action: payload.action,
          orderId: linkedOrder?.id,
          payload: {
            request: payload,
            payment,
            rawBody,
          } as never,
          headers: headers as never,
        },
      });

      if (linkedOrder?.id && providerPaymentId) {
        const previousOrderStatus = linkedOrder.status;
        const previousPaymentStatus = linkedOrder.paymentStatus;

        const updatedOrder = await updateMercadoPagoOrderPaymentStatus({
          tx,
          orderId: linkedOrder.id,
          paymentId: providerPaymentId,
          orderStatus: mappedStatus.orderStatus,
          paymentStatus: mappedStatus.paymentStatus,
        });

        logger.info("payments.mercadopago.webhook.order_updated", {
          orderNumber: updatedOrder.orderNumber,
          paymentId: providerPaymentId,
          previousOrderStatus,
          previousPaymentStatus,
          nextOrderStatus: updatedOrder.status,
          nextPaymentStatus: updatedOrder.paymentStatus,
        });
      }
    });
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as { code?: string }).code === "P2002") {
      return { duplicated: true as const };
    }

    throw error;
  }

  logger.info("payments.mercadopago.webhook.received", {
    dedupeKey,
    paymentId: providerPaymentId,
    orderNumber: linkedOrder?.orderNumber ?? null,
    externalReference,
    paymentState,
    mappedOrderStatus: mappedStatus.orderStatus,
    mappedPaymentStatus: mappedStatus.paymentStatus,
  });

  return {
    duplicated: false as const,
    linkedOrderId: linkedOrder?.id ?? null,
  };
}
