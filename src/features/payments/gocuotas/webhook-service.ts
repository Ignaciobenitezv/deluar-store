import crypto from "node:crypto";
import type { OrderStatus, PaymentStatus, Prisma } from "@/generated/prisma/client";
import { sendPaymentApprovedEmails } from "@/features/emails/email-service";
import { getOrderById } from "@/features/orders/server/order-repository";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";

type GoCuotasMappedStatus = {
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
};

type ParsedGoCuotasWebhook = {
  providerEventId?: string;
  providerPaymentId?: string;
  externalReference?: string;
  rawStatus?: string;
  installments?: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown) {
  if (typeof value === "string" || typeof value === "number") {
    const normalized = String(value).trim();

    return normalized || undefined;
  }

  return undefined;
}

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function findValueByKeys(value: unknown, keys: string[], depth = 0): unknown {
  if (!isRecord(value) || depth > 6) {
    return undefined;
  }

  for (const key of keys) {
    if (value[key] !== undefined && value[key] !== null) {
      return value[key];
    }
  }

  for (const nested of Object.values(value)) {
    const found = findValueByKeys(nested, keys, depth + 1);

    if (found !== undefined && found !== null) {
      return found;
    }
  }

  return undefined;
}

function parsePayload(payload: unknown): ParsedGoCuotasWebhook {
  return {
    providerEventId: readString(
      findValueByKeys(payload, ["event_id", "eventId", "event", "notification_id"]),
    ),
    providerPaymentId: readString(
      findValueByKeys(payload, ["payment_id", "paymentId", "paymentId", "id"]),
    ),
    externalReference: readString(
      findValueByKeys(payload, [
        "order_reference_id",
        "orderReferenceId",
        "external_reference",
        "externalReference",
        "externalReferenceId",
        "order_number",
        "orderNumber",
      ]),
    ),
    rawStatus: readString(findValueByKeys(payload, ["status", "state", "payment_status"])),
    installments: readNumber(
      findValueByKeys(payload, [
        "number_of_installments",
        "numberOfInstallments",
        "installments",
      ]),
    ),
  };
}

function normalizeStatus(status: string | undefined) {
  return String(status ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function mapGoCuotasStatus(status: string | undefined): GoCuotasMappedStatus {
  const normalized = normalizeStatus(status);

  if (
    normalized === "approved" ||
    normalized === "paid" ||
    normalized === "delivered" ||
    normalized === "confirmed"
  ) {
    return { orderStatus: "PAID", paymentStatus: "APPROVED" };
  }

  if (
    normalized === "pending" ||
    normalized === "processing" ||
    normalized === "in_process"
  ) {
    return { orderStatus: "PENDING_PAYMENT", paymentStatus: "PENDING" };
  }

  if (normalized === "cancelled" || normalized === "canceled") {
    return { orderStatus: "CANCELLED", paymentStatus: "CANCELLED" };
  }

  if (normalized === "rejected" || normalized === "failed") {
    return { orderStatus: "PAYMENT_FAILED", paymentStatus: "REJECTED" };
  }

  if (normalized === "refunded") {
    return { orderStatus: "REFUNDED", paymentStatus: "REFUNDED" };
  }

  return { orderStatus: "PENDING_PAYMENT", paymentStatus: "PENDING" };
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }

  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function buildDedupeKey(parsed: ParsedGoCuotasWebhook, payload: unknown) {
  const basis =
    parsed.providerEventId ||
    (parsed.providerPaymentId && parsed.rawStatus
      ? `${parsed.providerPaymentId}:${parsed.rawStatus}`
      : undefined) ||
    (parsed.externalReference && parsed.rawStatus
      ? `${parsed.externalReference}:${parsed.rawStatus}`
      : undefined) ||
    stableJson(payload);

  return `gocuotas:${crypto.createHash("sha256").update(basis).digest("hex")}`;
}

function sanitizeForLog(value: unknown, depth = 0): unknown {
  if (depth > 5) {
    return "[truncated]";
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForLog(item, depth + 1));
  }

  if (!isRecord(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => {
      const normalizedKey = key.toLowerCase();

      if (
        normalizedKey.includes("token") ||
        normalizedKey.includes("password") ||
        normalizedKey.includes("authorization")
      ) {
        return [key, "[redacted]"];
      }

      return [key, sanitizeForLog(nestedValue, depth + 1)];
    }),
  );
}

function validateWebhookSignature(headers: Record<string, string>) {
  if (!env.gocuotasWebhookSecret) {
    logger.warn("payments.gocuotas.webhook.signature_not_configured", {
      message:
        "GOCUOTAS_WEBHOOK_SECRET no esta configurado o la documentacion no indico header de firma; no se bloquea el webhook.",
    });
    return true;
  }

  const signature =
    headers["x-gocuotas-signature"] ||
    headers["x-signature"] ||
    headers["signature"];

  if (!signature) {
    logger.warn("payments.gocuotas.webhook.signature_missing");
    return false;
  }

  logger.warn("payments.gocuotas.webhook.signature_unverified", {
    message:
      "Hay GOCUOTAS_WEBHOOK_SECRET configurado, pero falta confirmar algoritmo/header oficial. No se bloquea hasta validar documentacion.",
  });

  return true;
}

async function findOrder(parsed: ParsedGoCuotasWebhook) {
  const where: Prisma.OrderWhereInput[] = [];

  if (parsed.externalReference) {
    where.push({ externalReference: parsed.externalReference });
    where.push({ orderNumber: parsed.externalReference });
  }

  if (parsed.providerPaymentId) {
    where.push({ providerPaymentId: parsed.providerPaymentId });
  }

  if (where.length === 0) {
    return null;
  }

  return prisma.order.findFirst({
    where: {
      OR: where,
    },
  });
}

export async function handleGoCuotasWebhook(params: {
  headers: Record<string, string>;
  payload: unknown;
  rawBody: string;
}) {
  const parsed = parsePayload(params.payload);
  const dedupeKey = buildDedupeKey(parsed, params.payload);
  const mappedStatus = mapGoCuotasStatus(parsed.rawStatus);
  const safeHeaders = sanitizeForLog(params.headers);
  const safePayload = sanitizeForLog(params.payload);

  validateWebhookSignature(params.headers);

  const existingEvent = await prisma.paymentWebhookEvent.findUnique({
    where: { dedupeKey },
  });

  if (existingEvent) {
    logger.info("payments.gocuotas.webhook.duplicated", {
      dedupeKey,
      orderId: existingEvent.orderId,
    });

    return {
      duplicated: true,
      linkedOrderId: existingEvent.orderId,
      parsed,
    };
  }

  const order = await findOrder(parsed);

  await prisma.$transaction(async (tx) => {
    await tx.paymentWebhookEvent.create({
      data: {
        provider: "gocuotas",
        dedupeKey,
        providerEventId: parsed.providerEventId,
        providerPaymentId: parsed.providerPaymentId,
        externalReference: parsed.externalReference,
        orderId: order?.id,
        payload: safePayload as never,
        headers: safeHeaders as never,
        processedAt: new Date(),
      },
    });

    if (order?.id) {
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: mappedStatus.orderStatus,
          paymentStatus: mappedStatus.paymentStatus,
          paymentProvider: "GOCUOTAS",
          providerPaymentId: parsed.providerPaymentId ?? undefined,
          rawProviderStatus: parsed.rawStatus,
          installments: parsed.installments,
        },
      });
    }
  });

  logger.info("payments.gocuotas.webhook.processed", {
    dedupeKey,
    orderId: order?.id ?? null,
    externalReference: parsed.externalReference,
    providerPaymentId: parsed.providerPaymentId,
    rawProviderStatus: parsed.rawStatus,
    mappedOrderStatus: mappedStatus.orderStatus,
    mappedPaymentStatus: mappedStatus.paymentStatus,
    hasOrder: Boolean(order),
  });

  if (order?.id && mappedStatus.paymentStatus === "APPROVED") {
    const updatedOrder = await getOrderById(order.id);

    if (updatedOrder) {
      await sendPaymentApprovedEmails(updatedOrder);
    }
  }

  return {
    duplicated: false,
    linkedOrderId: order?.id ?? null,
    parsed,
  };
}
