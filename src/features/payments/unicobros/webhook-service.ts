import crypto from "node:crypto";

import { Prisma } from "@/generated/prisma/client";
import { sendPaymentApprovedEmails } from "@/features/emails/email-service";
import {
  decrementSanityStock,
  isInsufficientStockError,
  restoreSanityStock,
} from "@/features/inventory/inventory-service";
import { getOrderById } from "@/features/orders/server/order-repository";
import { mapUnicobrosStatus } from "@/features/payments/unicobros/status-mapper";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

type ParsedUnicobrosWebhook = {
  providerEventId?: string;
  providerPaymentId?: string;
  externalReference?: string;
  rawStatusCode?: number;
  rawStatusText?: string;
  rawStatusMessage?: string;
  paymentUpdated?: string;
  transactionId?: string;
  checkoutUid?: string;
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

function readNestedValue(value: unknown, path: string[]) {
  let current: unknown = value;

  for (const key of path) {
    if (!isRecord(current)) {
      return undefined;
    }

    current = current[key];
  }

  return current;
}

function parsePayload(payload: unknown): ParsedUnicobrosWebhook {
  return {
    providerEventId: readString(readNestedValue(payload, ["data", "checkout", "uid"])),
    providerPaymentId: readString(readNestedValue(payload, ["data", "payment", "id"])),
    externalReference: readString(readNestedValue(payload, ["data", "payment", "reference"])),
    rawStatusCode: readNumber(readNestedValue(payload, ["data", "payment", "status", "code"])),
    rawStatusText: readString(readNestedValue(payload, ["data", "payment", "status", "text"])),
    rawStatusMessage: readString(
      readNestedValue(payload, ["data", "payment", "status", "message"]),
    ),
    paymentUpdated: readString(readNestedValue(payload, ["data", "payment", "updated"])),
    transactionId: readString(
      readNestedValue(payload, ["data", "payment", "source", "transaction", "transactionId"]),
    ),
    checkoutUid: readString(readNestedValue(payload, ["data", "checkout", "uid"])),
  };
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

function buildDedupeKey(
  parsed: ParsedUnicobrosWebhook,
  mappedStatus: ReturnType<typeof mapUnicobrosStatus>,
  payload: unknown,
) {
  const basis =
    [
      parsed.externalReference,
      mappedStatus.category,
    ]
      .filter(Boolean)
      .join(":") || stableJson(payload);

  return `unicobros:${crypto.createHash("sha256").update(basis).digest("hex")}`;
}

async function findOrderByReference(reference?: string) {
  if (!reference) {
    return null;
  }

  const normalizedReference = reference.trim();
  const orderNumber = normalizedReference.startsWith("UC-")
    ? normalizedReference.slice(3).replace(/-[a-z0-9]+-[a-f0-9]{8}$/i, "")
    : normalizedReference;

  return prisma.order.findFirst({
    where: {
      OR: [
        { externalReference: normalizedReference },
        { orderNumber: normalizedReference },
        ...(orderNumber ? [{ orderNumber }] : []),
      ],
    },
    include: {
      items: true,
    },
  });
}

type UnicobrosWebhookOrder = NonNullable<Awaited<ReturnType<typeof findOrderByReference>>>;

function isPaidOrder(order: UnicobrosWebhookOrder) {
  return order.status === "PAID" || order.paymentStatus === "APPROVED";
}

function shouldApproveOrder(mappedStatus: ReturnType<typeof mapUnicobrosStatus>) {
  return mappedStatus.orderStatus === "PAID" && mappedStatus.paymentStatus === "APPROVED";
}

function mapOrderItemsToInventoryItems(order: UnicobrosWebhookOrder) {
  return order.items.map((item) => ({
    sanityProductId: item.productId,
    slug: item.productSlug,
    title: item.productName,
    quantity: item.quantity,
  }));
}

async function sendPaymentApprovedEmailsForOrder(orderId: string) {
  const order = await getOrderById(orderId);

  if (!order) {
    logger.error("payments.unicobros.webhook.payment_approved_email_order_missing", {
      orderId,
    });
    return;
  }

  await sendPaymentApprovedEmails(order);
}

async function createWebhookEventLock(params: {
  dedupeKey: string;
  parsed: ParsedUnicobrosWebhook;
  payload: unknown;
  headers: Record<string, string>;
  orderId: string | null;
}) {
  return prisma.paymentWebhookEvent.create({
    data: {
      provider: "unicobros",
      dedupeKey: params.dedupeKey,
      providerEventId: params.parsed.providerEventId,
      providerPaymentId: params.parsed.providerPaymentId,
      externalReference: params.parsed.externalReference,
      orderId: params.orderId,
      payload: params.payload as never,
      headers: params.headers as never,
      processedAt: null,
    },
  });
}

async function deleteWebhookEvent(dedupeKey: string) {
  await prisma.paymentWebhookEvent.delete({
    where: { dedupeKey },
  });
}

export async function handleUnicobrosWebhook(params: {
  headers: Record<string, string>;
  payload: unknown;
}) {
  const parsed = parsePayload(params.payload);
  const mappedStatus = mapUnicobrosStatus(parsed.rawStatusCode);
  const dedupeKey = buildDedupeKey(parsed, mappedStatus, params.payload);

  logger.info("payments.unicobros.webhook.received", {
    dedupeKey,
    externalReference: parsed.externalReference ?? null,
    providerEventId: parsed.providerEventId ?? null,
    providerPaymentId: parsed.providerPaymentId ?? null,
    rawProviderStatusCode: parsed.rawStatusCode ?? null,
    rawProviderStatusText: parsed.rawStatusText ?? null,
    rawProviderStatusMessage: parsed.rawStatusMessage ?? null,
    paymentUpdated: parsed.paymentUpdated ?? null,
    transactionId: parsed.transactionId ?? null,
    checkoutUid: parsed.checkoutUid ?? null,
    mappedOrderStatus: mappedStatus.orderStatus,
    mappedPaymentStatus: mappedStatus.paymentStatus,
  });

  const order = await findOrderByReference(parsed.externalReference);
  const wasAlreadyPaid = order ? isPaidOrder(order) : false;
  const shouldApprove = shouldApproveOrder(mappedStatus);
  const shouldApplyStateChange = Boolean(order && !wasAlreadyPaid);

  if (!order) {
    logger.warn("payments.unicobros.webhook.order_not_found", {
      dedupeKey,
      externalReference: parsed.externalReference ?? null,
    });
  }

  try {
    await createWebhookEventLock({
      dedupeKey,
      parsed,
      payload: params.payload,
      headers: params.headers,
      orderId: order?.id ?? null,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      logger.info("payments.unicobros.webhook.duplicated", {
        dedupeKey,
        orderId: order?.id ?? null,
        externalReference: parsed.externalReference ?? null,
      });

      return {
        duplicated: true,
        linkedOrderId: order?.id ?? null,
        paymentUpdated: false,
        stockDiscounted: false,
        stockSkippedReason: "duplicate_event",
      };
    }

    throw error;
  }

  let stockDiscounted = false;
  let stockSkippedReason: string | undefined;
  let orderUpdated = false;

  if (order?.id && shouldApprove && !wasAlreadyPaid) {
    try {
      await decrementSanityStock(mapOrderItemsToInventoryItems(order));
      stockDiscounted = true;
    } catch (error) {
      stockSkippedReason = isInsufficientStockError(error)
        ? "insufficient_stock_or_revision_conflict"
        : "stock_discount_failed";

      logger.error("payments.unicobros.webhook.stock_discount_failed", {
        dedupeKey,
        orderId: order.id,
        reason: stockSkippedReason,
        error: error instanceof Error ? error.message : "unknown_error",
      });

      await deleteWebhookEvent(dedupeKey).catch(() => null);

      return {
        duplicated: false,
        linkedOrderId: order.id,
        paymentUpdated: false,
        stockDiscounted: false,
        stockSkippedReason,
      };
    }
  } else if (order?.id && shouldApprove && wasAlreadyPaid) {
    stockSkippedReason = "order_already_paid";
  } else if (order?.id && !shouldApprove) {
    stockSkippedReason = "not_approved_status";
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.paymentWebhookEvent.update({
        where: { dedupeKey },
        data: {
          providerEventId: parsed.providerEventId,
          providerPaymentId: parsed.providerPaymentId,
          externalReference: parsed.externalReference,
          orderId: order?.id ?? null,
          payload: params.payload as never,
          headers: params.headers as never,
          processedAt: new Date(),
        },
      });

      if (order?.id) {
        const nextData: Prisma.OrderUpdateInput = {
          paymentProvider: "UNICOBROS",
          // Keep the checkout operation id in providerPaymentId and store the webhook payment id
          // in externalPaymentId if Unicobros uses a different identifier for the payment event.
          providerPaymentId: order.providerPaymentId ?? parsed.providerPaymentId ?? undefined,
          externalPaymentId: parsed.providerPaymentId ?? order.externalPaymentId ?? undefined,
        };

        if (shouldApplyStateChange || !order.rawProviderStatus) {
          nextData.rawProviderStatus = parsed.rawStatusText ?? undefined;
        }

        if (shouldApplyStateChange) {
          nextData.status = mappedStatus.orderStatus;
          nextData.paymentStatus = mappedStatus.paymentStatus;
        }

        const updateResult = await tx.order.updateMany({
          where: {
            id: order.id,
            status: {
              in: ["CREATED", "PENDING_PAYMENT"],
            },
          },
          data: nextData,
        });

        orderUpdated = updateResult.count > 0;
      }
    });
  } catch (error) {
    if (stockDiscounted && order?.id) {
      try {
        await restoreSanityStock(mapOrderItemsToInventoryItems(order));
        logger.warn("payments.unicobros.webhook.stock_restored_after_update_failure", {
          dedupeKey,
          orderId: order.id,
        });
      } catch (restoreError) {
        logger.error("payments.unicobros.webhook.stock_restore_failed", {
          dedupeKey,
          orderId: order.id,
          error: restoreError instanceof Error ? restoreError.message : "unknown_error",
        });
      }
    }

    await deleteWebhookEvent(dedupeKey).catch(() => null);

    throw error;
  }

  if (stockDiscounted && order?.id && !orderUpdated) {
    try {
      await restoreSanityStock(mapOrderItemsToInventoryItems(order));
      logger.warn("payments.unicobros.webhook.stock_restored_after_skipped_update", {
        dedupeKey,
        orderId: order.id,
      });
    } catch (restoreError) {
      logger.error("payments.unicobros.webhook.stock_restore_failed", {
        dedupeKey,
        orderId: order.id,
        error: restoreError instanceof Error ? restoreError.message : "unknown_error",
      });
    }

    await deleteWebhookEvent(dedupeKey).catch(() => null);

    return {
      duplicated: false,
      linkedOrderId: order.id,
      paymentUpdated: false,
      stockDiscounted: false,
      stockSkippedReason: "order_update_skipped_after_stock",
    };
  }

  logger.info("payments.unicobros.webhook.processed", {
    dedupeKey,
    orderId: order?.id ?? null,
    externalReference: parsed.externalReference ?? null,
    providerPaymentId: parsed.providerPaymentId ?? null,
    rawProviderStatusCode: parsed.rawStatusCode ?? null,
    rawProviderStatusText: parsed.rawStatusText ?? null,
    transactionId: parsed.transactionId ?? null,
    mappedOrderStatus: mappedStatus.orderStatus,
    mappedPaymentStatus: mappedStatus.paymentStatus,
    stockDiscounted,
    stockSkippedReason,
    paymentUpdated: orderUpdated,
  });

  if (order?.id && shouldApprove && orderUpdated) {
    await sendPaymentApprovedEmailsForOrder(order.id);
  } else {
    logger.info("payments.unicobros.webhook.payment_approved_emails_skipped", {
      dedupeKey,
      orderId: order?.id ?? null,
      reason: !shouldApprove
        ? "not_approved_status"
        : !orderUpdated
          ? "order_already_paid_or_terminal"
          : "order_not_found",
    });
  }

  return {
    duplicated: false,
    linkedOrderId: order?.id ?? null,
    paymentUpdated: orderUpdated,
    stockDiscounted,
    stockSkippedReason,
  };
}
