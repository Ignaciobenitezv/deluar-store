import type { Order } from "@/features/order/types";
import type { PaymentProvider } from "@/features/payments/provider";
import { env } from "@/lib/env";
import {
  UnicobrosClientError,
  createUnicobrosCheckout,
} from "@/features/payments/unicobros/client";
import type { PaymentProviderCheckoutResult } from "@/features/payments/provider";
import type { UnicobrosCreateCheckoutRequest } from "@/features/payments/unicobros/types";
import crypto from "node:crypto";

import { Prisma } from "@/generated/prisma/client";

function validateUnicobrosConfiguration() {
  if (!env.unicobrosApiKey) {
    throw new Error("Falta UNICOBROS_API_KEY.");
  }

  if (!env.unicobrosAccessToken) {
    throw new Error("Falta UNICOBROS_ACCESS_TOKEN.");
  }

  if (!env.unicobrosBaseUrl) {
    throw new Error("Falta UNICOBROS_BASE_URL.");
  }
}

function toNumber(value: Prisma.Decimal | number) {
  return typeof value === "number" ? value : value.toNumber();
}

function readString(value: string | undefined) {
  return value?.trim() ?? "";
}

function extractIdentification(notes: string) {
  const normalizedNotes = notes.trim();
  const documentTypeMatch = normalizedNotes.match(/\b(DNI|CUIT|CUIL|PASSPORT)\b/i);
  const documentNumberMatch = normalizedNotes.match(/\b\d{7,14}\b/);

  if (documentTypeMatch?.[1] && documentNumberMatch?.[0]) {
    return `${documentTypeMatch[1].toUpperCase()} ${documentNumberMatch[0]}`;
  }

  return "SIN_IDENTIFICACION";
}

function buildReference(order: Order) {
  const uniqueSuffix = `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
  return `UC-${order.orderNumber}-${uniqueSuffix}`;
}

function buildDescription(order: Order) {
  const itemCount = order.items.reduce((accumulator, item) => accumulator + item.quantity, 0);
  return `Pedido ${order.orderNumber} - ${itemCount} item${itemCount === 1 ? "" : "s"}`;
}

function buildItems(order: Order) {
  return order.items.map((item) => ({
    title: item.title,
    quantity: item.quantity,
    unit_price: toNumber(item.unitPrice),
    total: toNumber(item.unitPrice) * item.quantity,
    product_id: item.productId,
    product_slug: item.productSlug,
  }));
}

function buildCheckoutPayload(order: Order, reference: string): UnicobrosCreateCheckoutRequest {
  const returnUrl = env.unicobrosReturnUrl || new URL("/checkout/success", env.siteUrl).toString();
  const webhookUrl =
    env.unicobrosWebhookUrl || new URL("/api/payments/unicobros/webhook", env.siteUrl).toString();

  return {
    total: toNumber(order.total),
    description: buildDescription(order),
    currency: "ars",
    reference,
    customer: {
      email: readString(order.customer.email),
      name: readString(`${order.customer.firstName} ${order.customer.lastName}`.trim()),
      identification: extractIdentification(order.customer.notes),
    },
    test: String(env.unicobrosTest).toLowerCase() === "true",
    return_url: returnUrl,
    webhook: webhookUrl,
    items: buildItems(order),
  };
}

export const unicobrosProvider: PaymentProvider = {
  method: "unicobros",
  displayName: "Unicobros",
  checkoutFailureMessage: "No se pudo crear el checkout de Unicobros.",
  validateConfiguration() {
    validateUnicobrosConfiguration();
  },
  async createCheckout(order: Order): Promise<PaymentProviderCheckoutResult> {
    validateUnicobrosConfiguration();
    const reference = buildReference(order);
    const payload = buildCheckoutPayload(order, reference);

    try {
      const response = await createUnicobrosCheckout(payload);
      const checkoutUrl = response.data?.url ?? "";

      if (!checkoutUrl) {
        throw new UnicobrosClientError("Unicobros no devolvio una url de checkout.");
      }

      return {
        checkoutUrl,
        externalReference: reference,
        rawProviderStatus: response.status,
        rawResponse: response.raw,
      };
    } catch (error) {
      if (error instanceof UnicobrosClientError) {
        throw error;
      }

      throw new Error(
        error instanceof Error ? error.message : "No se pudo crear el checkout de Unicobros.",
      );
    }
  },
};
