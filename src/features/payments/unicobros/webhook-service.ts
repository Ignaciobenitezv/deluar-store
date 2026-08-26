import crypto from "node:crypto";

import { Prisma } from "@/generated/prisma/client";
import {
  sendPaymentApprovedEmails,
  sendPaymentStockFailureAlertEmail,
} from "@/features/emails/email-service";
import {
  prepareSanityStockTargets,
  decrementSanityStock,
  isInsufficientStockError,
  restoreSanityStock,
} from "@/features/inventory/inventory-service";
import { getOrderById } from "@/features/orders/server/order-repository";
import {
  getUnicobrosOperationByUid,
  searchUnicobrosOperationsByReference,
  validateUnicobrosOperationAgainstOrder,
  type UnicobrosOperationSnapshot,
} from "@/features/payments/unicobros/client";
import { mapUnicobrosStatus } from "@/features/payments/unicobros/status-mapper";
import { recordAnalyticsPurchaseCompleted } from "@/features/analytics/server/lifecycle";
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

type UnicobrosVerificationFailureReason =
  | "missing_lookup_uid"
  | "lookup_failed"
  | "operation_not_found"
  | "operation_not_approved"
  | "reference_mismatch"
  | "amount_mismatch"
  | "currency_mismatch";

type UnicobrosVerificationResult =
  | {
      ok: true;
      source: "uid" | "reference";
      snapshot: UnicobrosOperationSnapshot;
      lookupUid: string | null;
    }
  | {
      ok: false;
      reason: UnicobrosVerificationFailureReason;
      lookupUid: string | null;
      details?: string;
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

function getOrderExpectedReference(order: UnicobrosWebhookOrder) {
  return (order.externalReference ?? order.orderNumber).trim();
}

function getUnicobrosLookupUid(
  order: UnicobrosWebhookOrder,
  parsed: ParsedUnicobrosWebhook,
) {
  return (
    order.providerPaymentId?.trim() ||
    parsed.checkoutUid?.trim() ||
    parsed.providerPaymentId?.trim() ||
    null
  );
}

function validateSnapshotAgainstOrder(
  snapshot: UnicobrosOperationSnapshot,
  order: UnicobrosWebhookOrder,
) {
  return validateUnicobrosOperationAgainstOrder({
    snapshot,
    reference: getOrderExpectedReference(order),
    total: order.total.toNumber(),
    currency: "ARS",
  });
}

async function verifyUnicobrosApproval(
  order: UnicobrosWebhookOrder,
  parsed: ParsedUnicobrosWebhook,
): Promise<UnicobrosVerificationResult> {
  const lookupUid = getUnicobrosLookupUid(order, parsed);
  const failureDetails: string[] = [];

  if (lookupUid) {
    try {
      const snapshot = await getUnicobrosOperationByUid(lookupUid);
      const validation = validateSnapshotAgainstOrder(snapshot, order);

      if (validation.ok) {
        return {
          ok: true,
          source: "uid",
          snapshot,
          lookupUid,
        };
      }

      failureDetails.push(validation.reason);
    } catch (error) {
      failureDetails.push(error instanceof Error ? error.message : "lookup_failed");
    }
  }

  try {
    const snapshots = await searchUnicobrosOperationsByReference(getOrderExpectedReference(order));

    for (const snapshot of snapshots) {
      const validation = validateSnapshotAgainstOrder(snapshot, order);

      if (validation.ok) {
        return {
          ok: true,
          source: "reference",
          snapshot,
          lookupUid,
        };
      }

      failureDetails.push(validation.reason);
    }

    return {
      ok: false,
      reason: snapshots.length > 0 ? "reference_mismatch" : "operation_not_found",
      lookupUid,
      details: failureDetails.length > 0 ? failureDetails.join(" | ") : undefined,
    };
  } catch (error) {
    return {
      ok: false,
      reason: lookupUid ? "lookup_failed" : "missing_lookup_uid",
      lookupUid,
      details: [
        ...failureDetails,
        error instanceof Error ? error.message : "search_failed",
      ].join(" | "),
    };
  }
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

function digestStablePayload(payload: unknown) {
  return crypto.createHash("sha256").update(stableJson(payload)).digest("hex");
}

function readNormalizedIdentifier(value?: string) {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

function buildDedupeKey(
  parsed: ParsedUnicobrosWebhook,
  payload: unknown,
) {
  const providerPaymentId = readNormalizedIdentifier(parsed.providerPaymentId);
  const providerEventId = readNormalizedIdentifier(parsed.providerEventId);
  const checkoutUid = readNormalizedIdentifier(parsed.checkoutUid);
  const transactionId = readNormalizedIdentifier(parsed.transactionId);
  const externalReference = readNormalizedIdentifier(parsed.externalReference);
  const payloadDigest = digestStablePayload(payload);

  const basis =
    providerPaymentId
      ? `payment:${providerPaymentId}`
      : providerEventId
        ? `event:${providerEventId}`
        : checkoutUid
          ? `checkout:${checkoutUid}`
          : transactionId
            ? `transaction:${transactionId}`
            : externalReference
              ? `reference:${externalReference}:${payloadDigest}`
              : `payload:${payloadDigest}`;

  return `unicobros:${crypto.createHash("sha256").update(basis).digest("hex")}`;
}

function buildReferenceLookup(reference?: string): {
  referenceOriginal: string | null;
  referenceNormalized: string | null;
  orderNumberCandidate: string | null;
} {
  if (!reference) {
    return {
      referenceOriginal: null,
      referenceNormalized: null,
      orderNumberCandidate: null,
    };
  }

  const referenceNormalized = reference.trim();
  const orderNumberCandidate = referenceNormalized.startsWith("UC-")
    ? referenceNormalized.slice(3).replace(/-[a-z0-9]+-[a-f0-9]{8}$/i, "")
    : referenceNormalized;

  return {
    referenceOriginal: reference,
    referenceNormalized,
    orderNumberCandidate,
  };
}

async function findOrderByReference(reference?: string) {
  const lookup = buildReferenceLookup(reference);

  if (!lookup.referenceNormalized) {
    return {
      lookup,
      order: null,
    };
  }

  const order = await prisma.order.findFirst({
    where: {
      OR: [
        { externalReference: lookup.referenceNormalized },
        { orderNumber: lookup.referenceNormalized },
        ...(lookup.orderNumberCandidate ? [{ orderNumber: lookup.orderNumberCandidate }] : []),
      ],
    },
    include: {
      items: true,
      customer: true,
    },
  });

  return {
    lookup,
    order,
  };
}

type UnicobrosWebhookOrder = NonNullable<Awaited<ReturnType<typeof findOrderByReference>>["order"]>;

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
    variantId: item.variantId,
    variantValue: item.variantValue,
    variantLabel: item.variantLabel,
    variantAttributes: item.variantAttributes,
    variantSku: item.variantSku,
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

async function markWebhookEventProcessed(dedupeKey: string) {
  await prisma.paymentWebhookEvent.update({
    where: { dedupeKey },
    data: {
      processedAt: new Date(),
    },
  });
}

export async function handleUnicobrosWebhook(params: {
  headers: Record<string, string>;
  payload: unknown;
}) {
  const parsed = parsePayload(params.payload);
  const mappedStatus = mapUnicobrosStatus(parsed.rawStatusCode);
  const dedupeKey = buildDedupeKey(parsed, params.payload);

  const { order } = await findOrderByReference(parsed.externalReference);
  const wasAlreadyPaid = order ? isPaidOrder(order) : false;
  const shouldApprove = shouldApproveOrder(mappedStatus);
  const shouldApplyStateChange = Boolean(order && !wasAlreadyPaid);
  let approvedVerification: UnicobrosVerificationResult | null = null;

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
      logger.debug("payments.unicobros.webhook.duplicated", {
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
  let stockTargets: Awaited<ReturnType<typeof prepareSanityStockTargets>> | null = null;

  if (order?.id && shouldApprove && !wasAlreadyPaid) {
    approvedVerification = await verifyUnicobrosApproval(order, parsed);

    if (!approvedVerification.ok) {
      stockSkippedReason = approvedVerification.reason;

      logger.warn("payments.unicobros.webhook.provider_validation_failed", {
        dedupeKey,
        orderId: order.id,
        reason: approvedVerification.reason,
        lookupUid: approvedVerification.lookupUid,
        details: approvedVerification.details ?? null,
        externalReference: parsed.externalReference ?? null,
      });

      await markWebhookEventProcessed(dedupeKey).catch(() => null);

      return {
        duplicated: false,
        linkedOrderId: order.id,
        paymentUpdated: false,
        stockDiscounted: false,
        stockSkippedReason,
      };
    }

    try {
      stockTargets = await prepareSanityStockTargets(mapOrderItemsToInventoryItems(order));
      await decrementSanityStock(stockTargets);
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

      await prisma.$transaction(async (tx) => {
        await tx.paymentWebhookEvent.update({
          where: { dedupeKey },
          data: {
            providerEventId: parsed.providerEventId,
            providerPaymentId: parsed.providerPaymentId,
            externalReference: parsed.externalReference,
            orderId: order.id,
            payload: params.payload as never,
            headers: params.headers as never,
            processedAt: new Date(),
          },
        });

        await tx.order.updateMany({
          where: {
            id: order.id,
            status: {
              in: ["CREATED", "PENDING_PAYMENT"],
            },
          },
          data: {
            status: "PAYMENT_FAILED",
            paymentStatus: "REJECTED",
            paymentProvider: "UNICOBROS",
            rawProviderStatus: "approved_payment_stock_unavailable",
          },
        });
      });

      const updatedOrder = await getOrderById(order.id);

      if (updatedOrder) {
        await sendPaymentStockFailureAlertEmail({
          order: updatedOrder,
          provider: "unicobros",
        });
      } else {
        logger.error("payments.unicobros.webhook.stock_failure_order_reload_failed", {
          dedupeKey,
          orderId: order.id,
        });
      }

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
          nextData.rawProviderStatus =
            approvedVerification?.snapshot.statusText ?? parsed.rawStatusText ?? undefined;
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
    if (stockDiscounted && order?.id && stockTargets) {
      try {
        await restoreSanityStock(stockTargets);
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
      if (stockTargets) {
        await restoreSanityStock(stockTargets);
      }
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

  logger.debug("payments.unicobros.webhook.processed", {
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
    verificationSource: approvedVerification?.ok ? approvedVerification.source : null,
  });

  if (order?.id && shouldApprove && orderUpdated) {
    await recordAnalyticsPurchaseCompleted({
      orderId: order.id,
    });
  }

  if (order?.id && shouldApprove && orderUpdated) {
    try {
      await sendPaymentApprovedEmailsForOrder(order.id);
    } catch (error) {
      logger.error("payments.unicobros.webhook.payment_approved_emails_failed", {
        dedupeKey,
        orderId: order.id,
        error: error instanceof Error ? error.message : "unknown_error",
      });
    }
  } else {
    logger.debug("payments.unicobros.webhook.payment_approved_emails_skipped", {
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
