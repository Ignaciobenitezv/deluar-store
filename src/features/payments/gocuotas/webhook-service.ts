import crypto from "node:crypto";
import type { OrderStatus, PaymentStatus, Prisma } from "@/generated/prisma/client";
import { sendPaymentApprovedEmails } from "@/features/emails/email-service";
import {
  decrementSanityStock,
  isInsufficientStockError,
  restoreSanityStock,
} from "@/features/inventory/inventory-service";
import { getOrderById } from "@/features/orders/server/order-repository";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

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
    include: {
      items: true,
    },
  });
}

type GoCuotasWebhookOrder = NonNullable<Awaited<ReturnType<typeof findOrder>>>;

function isPaidOrder(order: GoCuotasWebhookOrder) {
  return order.status === "PAID" || order.paymentStatus === "APPROVED";
}

function shouldApproveOrder(mappedStatus: GoCuotasMappedStatus) {
  return mappedStatus.orderStatus === "PAID" && mappedStatus.paymentStatus === "APPROVED";
}

function mapOrderItemsToInventoryItems(order: GoCuotasWebhookOrder) {
  return order.items.map((item) => ({
    sanityProductId: item.productId,
    slug: item.productSlug,
    title: item.productName,
    quantity: item.quantity,
  }));
}

async function sendPaymentApprovedEmailsForOrder(params: {
  dedupeKey: string;
  orderId: string;
  reason: "new_approval" | "duplicate_paid_retry";
}) {
  logger.info("payments.gocuotas.webhook.payment_approved_emails_started", {
    dedupeKey: params.dedupeKey,
    orderId: params.orderId,
    reason: params.reason,
  });

  const updatedOrder = await getOrderById(params.orderId);

  if (!updatedOrder) {
    logger.error("payments.gocuotas.webhook.payment_approved_email_order_missing", {
      dedupeKey: params.dedupeKey,
      orderId: params.orderId,
      reason: params.reason,
    });
    return;
  }

  await sendPaymentApprovedEmails(updatedOrder);
  logger.info("payments.gocuotas.webhook.payment_approved_emails_finished", {
    dedupeKey: params.dedupeKey,
    orderId: params.orderId,
    reason: params.reason,
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

  logger.info("payments.gocuotas.webhook.received", {
    dedupeKey,
    externalReference: parsed.externalReference,
    providerEventId: parsed.providerEventId,
    providerPaymentId: parsed.providerPaymentId,
    rawProviderStatus: parsed.rawStatus,
    mappedOrderStatus: mappedStatus.orderStatus,
    mappedPaymentStatus: mappedStatus.paymentStatus,
  });

  const isApproval = shouldApproveOrder(mappedStatus);
  const existingEvent = await prisma.paymentWebhookEvent.findUnique({
    where: { dedupeKey },
  });
  const orderFromExistingEvent = existingEvent?.orderId
    ? await prisma.order.findUnique({
        where: { id: existingEvent.orderId },
        include: { items: true },
      })
    : null;
  const order = orderFromExistingEvent ?? (await findOrder(parsed));
  const wasAlreadyPaid = order ? isPaidOrder(order) : false;

  if (existingEvent) {
    if (isApproval && order?.id && !wasAlreadyPaid) {
      logger.warn("payments.gocuotas.webhook.retry_existing_unprocessed_event", {
        dedupeKey,
        eventId: existingEvent.id,
        orderId: order.id,
        previousOrderStatus: order.status,
        previousPaymentStatus: order.paymentStatus,
      });
    } else {
      logger.info("payments.gocuotas.webhook.duplicated", {
        dedupeKey,
        orderId: existingEvent.orderId,
        orderStatus: order?.status ?? null,
        paymentStatus: order?.paymentStatus ?? null,
      });

      if (isApproval && order?.id && wasAlreadyPaid) {
        logger.info("payments.gocuotas.webhook.duplicate_paid_email_retry", {
          dedupeKey,
          orderId: order.id,
          reason: "retry_missing_payment_approved_emails_only",
        });

        await sendPaymentApprovedEmailsForOrder({
          dedupeKey,
          orderId: order.id,
          reason: "duplicate_paid_retry",
        });
      }

      return {
        duplicated: true,
        linkedOrderId: existingEvent.orderId,
        parsed,
      };
    }
  }

  logger.info("payments.gocuotas.webhook.order_lookup", {
    dedupeKey,
    orderId: order?.id ?? null,
    orderNumber: order?.orderNumber ?? null,
    previousOrderStatus: order?.status ?? null,
    previousPaymentStatus: order?.paymentStatus ?? null,
    hasOrder: Boolean(order),
  });

  logger.info("payments.gocuotas.webhook.approval_decision", {
    dedupeKey,
    orderId: order?.id ?? null,
    isApproval,
    wasAlreadyPaid,
    willAttemptStockDiscount: Boolean(order?.id && isApproval && !wasAlreadyPaid),
    willSendPaymentApprovedEmails: Boolean(order?.id && isApproval && !wasAlreadyPaid),
  });

  let stockDiscounted = false;
  let stockSkippedReason: string | undefined;

  if (order?.id && isApproval) {
    if (wasAlreadyPaid) {
      stockSkippedReason = "order_already_paid";
      logger.info("payments.gocuotas.webhook.stock_skipped", {
        dedupeKey,
        orderId: order.id,
        reason: stockSkippedReason,
      });
    } else {
      try {
        await decrementSanityStock(mapOrderItemsToInventoryItems(order));
        stockDiscounted = true;
        logger.info("payments.gocuotas.webhook.stock_discounted", {
          dedupeKey,
          orderId: order.id,
          itemCount: order.items.length,
        });
      } catch (error) {
        stockSkippedReason = isInsufficientStockError(error)
          ? "insufficient_stock_or_revision_conflict"
          : "stock_discount_failed";

        logger.error("payments.gocuotas.webhook.stock_discount_failed", {
          dedupeKey,
          orderId: order.id,
          reason: stockSkippedReason,
          error: error instanceof Error ? error.message : "unknown_error",
        });

        if (existingEvent) {
          await prisma.paymentWebhookEvent.update({
            where: { id: existingEvent.id },
            data: {
              providerEventId: parsed.providerEventId,
              providerPaymentId: parsed.providerPaymentId,
              externalReference: parsed.externalReference,
              orderId: order.id,
              payload: safePayload as never,
              headers: safeHeaders as never,
              processedAt: new Date(),
            },
          });
        } else {
          await prisma.paymentWebhookEvent.create({
            data: {
              provider: "gocuotas",
              dedupeKey,
              providerEventId: parsed.providerEventId,
              providerPaymentId: parsed.providerPaymentId,
              externalReference: parsed.externalReference,
              orderId: order.id,
              payload: safePayload as never,
              headers: safeHeaders as never,
              processedAt: new Date(),
            },
          });
        }

        return {
          duplicated: false,
          linkedOrderId: order.id,
          parsed,
          stockDiscounted,
          stockSkippedReason,
          paymentUpdated: false,
        };
      }
    }
  } else if (isApproval) {
    stockSkippedReason = "order_not_found";
  } else {
    stockSkippedReason = "not_approved_status";
  }

  try {
    await prisma.$transaction(async (tx) => {
      if (existingEvent) {
        await tx.paymentWebhookEvent.update({
          where: { id: existingEvent.id },
          data: {
            providerEventId: parsed.providerEventId,
            providerPaymentId: parsed.providerPaymentId,
            externalReference: parsed.externalReference,
            orderId: order?.id,
            payload: safePayload as never,
            headers: safeHeaders as never,
            processedAt: new Date(),
          },
        });
      } else {
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
      }

      if (order?.id && !(isApproval && wasAlreadyPaid)) {
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
  } catch (error) {
    if (stockDiscounted && order?.id) {
      try {
        await restoreSanityStock(mapOrderItemsToInventoryItems(order));
        logger.warn("payments.gocuotas.webhook.stock_restored_after_update_failure", {
          dedupeKey,
          orderId: order.id,
        });
      } catch (restoreError) {
        logger.error("payments.gocuotas.webhook.stock_restore_failed", {
          dedupeKey,
          orderId: order.id,
          error: restoreError instanceof Error ? restoreError.message : "unknown_error",
        });
      }
    }

    throw error;
  }

  logger.info("payments.gocuotas.webhook.processed", {
    dedupeKey,
    orderId: order?.id ?? null,
    externalReference: parsed.externalReference,
    providerPaymentId: parsed.providerPaymentId,
    rawProviderStatus: parsed.rawStatus,
    mappedOrderStatus: mappedStatus.orderStatus,
    mappedPaymentStatus: mappedStatus.paymentStatus,
    hasOrder: Boolean(order),
    previousOrderStatus: order?.status ?? null,
    previousPaymentStatus: order?.paymentStatus ?? null,
    stockDiscounted,
    stockSkippedReason,
    paymentUpdated: Boolean(order?.id && !(isApproval && wasAlreadyPaid)),
  });

  if (order?.id && isApproval && !wasAlreadyPaid) {
    await sendPaymentApprovedEmailsForOrder({
      dedupeKey,
      orderId: order.id,
      reason: "new_approval",
    });
  } else {
    logger.info("payments.gocuotas.webhook.payment_approved_emails_skipped", {
      dedupeKey,
      orderId: order?.id ?? null,
      reason: !isApproval
        ? "not_approved_status"
        : wasAlreadyPaid
          ? "order_already_paid"
          : "order_not_found",
    });
  }

  return {
    duplicated: false,
    linkedOrderId: order?.id ?? null,
    parsed,
    stockDiscounted,
    stockSkippedReason,
    paymentUpdated: Boolean(order?.id && !(isApproval && wasAlreadyPaid)),
  };
}
