import crypto from "node:crypto";
import { Prisma, type OrderStatus, type PaymentStatus } from "@/generated/prisma/client";
import { sendPaymentApprovedEmails } from "@/features/emails/email-service";
import {
  decrementSanityStock,
  isInsufficientStockError,
  restoreSanityStock,
} from "@/features/inventory/inventory-service";
import { getOrderById } from "@/features/orders/server/order-repository";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

type ParsedGetnetWebhook = {
  orderId?: string;
  paymentIntentId?: string;
  paymentId?: string;
  rawStatus?: string;
  installments?: number;
};

type GetnetMappedStatus = {
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
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

function parsePayload(payload: unknown): ParsedGetnetWebhook {
  return {
    orderId: readString(readNestedValue(payload, ["order_id"])) ??
      readString(findValueByKeys(payload, ["order_id", "orderId"])),
    paymentIntentId: readString(
      readNestedValue(payload, ["payment_intent_id"]),
    ) ?? readString(
      findValueByKeys(payload, ["payment_intent_id", "paymentIntentId"]),
    ),
    paymentId: readString(readNestedValue(payload, ["payment", "result", "payment_id"])) ??
      readString(findValueByKeys(payload, ["payment_id", "paymentId"])),
    rawStatus: readString(readNestedValue(payload, ["payment", "result", "status"])) ??
      readString(findValueByKeys(payload, ["status", "payment_status"])),
    installments: readNumber(
      readNestedValue(payload, ["payment", "installment", "number"]),
    ),
  };
}

function normalizeStatus(status: string | undefined) {
  return String(status ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function mapGetnetStatus(status: string | undefined): GetnetMappedStatus {
  const normalized = normalizeStatus(status);

  if (normalized === "authorized") {
    return { orderStatus: "PAID", paymentStatus: "APPROVED" };
  }

  if (normalized === "denied") {
    return { orderStatus: "PAYMENT_FAILED", paymentStatus: "REJECTED" };
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

function buildDedupeKey(parsed: ParsedGetnetWebhook, payload: unknown) {
  const basis =
    (parsed.paymentIntentId && parsed.rawStatus
      ? `${parsed.paymentIntentId}:${parsed.rawStatus}`
      : undefined) ||
    (parsed.paymentId && parsed.rawStatus ? `${parsed.paymentId}:${parsed.rawStatus}` : undefined) ||
    (parsed.orderId && parsed.rawStatus ? `${parsed.orderId}:${parsed.rawStatus}` : undefined) ||
    stableJson(payload);

  return `getnet:${crypto.createHash("sha256").update(basis).digest("hex")}`;
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
        normalizedKey.includes("authorization") ||
        normalizedKey.includes("password") ||
        normalizedKey.includes("secret")
      ) {
        return [key, "[redacted]"];
      }

      return [key, sanitizeForLog(nestedValue, depth + 1)];
    }),
  );
}

function buildExpectedBasicAuth() {
  if (!env.getnetWebhookUser || !env.getnetWebhookPassword) {
    throw new Error("Faltan GETNET_WEBHOOK_USER o GETNET_WEBHOOK_PASSWORD.");
  }

  return `Basic ${Buffer.from(
    `${env.getnetWebhookUser}:${env.getnetWebhookPassword}`,
    "utf8",
  ).toString("base64")}`;
}

export function validateGetnetWebhookBasicAuth(authorizationHeader?: string | null) {
  const expected = buildExpectedBasicAuth();
  const provided = authorizationHeader?.trim();

  if (!provided) {
    return false;
  }

  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}

async function findOrder(parsed: ParsedGetnetWebhook) {
  const where: Prisma.OrderWhereInput[] = [];

  if (parsed.orderId) {
    where.push({ orderNumber: parsed.orderId });
    where.push({ externalReference: parsed.orderId });
  }

  if (parsed.paymentIntentId) {
    where.push({ providerPaymentId: parsed.paymentIntentId });
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

type GetnetWebhookOrder = NonNullable<Awaited<ReturnType<typeof findOrder>>>;

function isPaidOrder(order: GetnetWebhookOrder) {
  return order.status === "PAID" || order.paymentStatus === "APPROVED";
}

function shouldApproveOrder(mappedStatus: GetnetMappedStatus) {
  return mappedStatus.orderStatus === "PAID" && mappedStatus.paymentStatus === "APPROVED";
}

function mapOrderItemsToInventoryItems(order: GetnetWebhookOrder) {
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
    logger.error("getnet.webhook.skipped", {
      reason: "payment_approved_email_order_missing",
      orderId,
    });
    return;
  }

  await sendPaymentApprovedEmails(order);
}

export async function handleGetnetWebhook(params: {
  headers: Record<string, string>;
  payload: unknown;
  rawBody: string;
}) {
  const parsed = parsePayload(params.payload);
  const dedupeKey = buildDedupeKey(parsed, params.payload);
  const mappedStatus = mapGetnetStatus(parsed.rawStatus);
  const safeHeaders = sanitizeForLog(params.headers);
  const safePayload = sanitizeForLog(params.payload);

  logger.info("getnet.webhook.received", {
    dedupeKey,
    orderId: parsed.orderId,
    paymentIntentId: parsed.paymentIntentId,
    paymentId: parsed.paymentId,
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
    logger.info("getnet.webhook.skipped", {
      dedupeKey,
      reason: "duplicate_event",
      orderId: existingEvent.orderId,
    });

    return {
      duplicated: true,
      linkedOrderId: existingEvent.orderId,
    };
  }

  logger.info("getnet.webhook.mapped", {
    dedupeKey,
    orderId: order?.id ?? null,
    orderNumber: order?.orderNumber ?? null,
    isApproval,
    wasAlreadyPaid,
  });

  let stockDiscounted = false;

  if (order?.id && isApproval && !wasAlreadyPaid) {
    try {
      await decrementSanityStock(mapOrderItemsToInventoryItems(order));
      stockDiscounted = true;
    } catch (error) {
      logger.error("getnet.webhook.processed", {
        dedupeKey,
        orderId: order.id,
        result: isInsufficientStockError(error)
          ? "insufficient_stock_or_revision_conflict"
          : "stock_discount_failed",
        error: error instanceof Error ? error.message : "unknown_error",
      });

      await prisma.paymentWebhookEvent.create({
        data: {
          provider: "getnet",
          dedupeKey,
          providerEventId: parsed.paymentId,
          providerPaymentId: parsed.paymentIntentId ?? parsed.paymentId,
          externalReference: parsed.orderId,
          orderId: order.id,
          payload: safePayload as never,
          headers: safeHeaders as never,
          processedAt: new Date(),
        },
      });

      return {
        duplicated: false,
        linkedOrderId: order.id,
        paymentUpdated: false,
        stockDiscounted: false,
      };
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.paymentWebhookEvent.create({
        data: {
          provider: "getnet",
          dedupeKey,
          providerEventId: parsed.paymentId,
          providerPaymentId: parsed.paymentIntentId ?? parsed.paymentId,
          externalReference: parsed.orderId,
          orderId: order?.id,
          payload: safePayload as never,
          headers: safeHeaders as never,
          processedAt: new Date(),
        },
      });

      if (order?.id && !(isApproval && wasAlreadyPaid)) {
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: mappedStatus.orderStatus,
            paymentMethod: "GETNET",
            paymentProvider: "GETNET",
            paymentStatus: mappedStatus.paymentStatus,
            providerPaymentId: parsed.paymentIntentId ?? parsed.paymentId ?? undefined,
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
      } catch (restoreError) {
        logger.error("getnet.webhook.processed", {
          dedupeKey,
          orderId: order.id,
          result: "stock_restore_failed",
          error: restoreError instanceof Error ? restoreError.message : "unknown_error",
        });
      }
    }

    throw error;
  }

  logger.info("getnet.webhook.processed", {
    dedupeKey,
    orderId: order?.id ?? null,
    paymentIntentId: parsed.paymentIntentId,
    paymentId: parsed.paymentId,
    rawProviderStatus: parsed.rawStatus,
    mappedOrderStatus: mappedStatus.orderStatus,
    mappedPaymentStatus: mappedStatus.paymentStatus,
    stockDiscounted,
    paymentUpdated: Boolean(order?.id && !(isApproval && wasAlreadyPaid)),
  });

  if (order?.id && isApproval && !wasAlreadyPaid) {
    await sendPaymentApprovedEmailsForOrder(order.id);
  }

  return {
    duplicated: false,
    linkedOrderId: order?.id ?? null,
    paymentUpdated: Boolean(order?.id && !(isApproval && wasAlreadyPaid)),
    stockDiscounted,
  };
}
