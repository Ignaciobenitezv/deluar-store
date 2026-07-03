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

function toTwoDecimals(value: number) {
  return Number(value.toFixed(2));
}

function readString(value: string | undefined) {
  return value?.trim() ?? "";
}

function extractIdentification(notes: string, fallback: string) {
  const normalizedNotes = notes.trim();
  const documentTypeMatch = normalizedNotes.match(/\b(DNI|CUIT|CUIL|PASSPORT)\b/i);
  const documentNumberMatch = normalizedNotes.match(/\b\d{7,14}\b/);

  if (documentTypeMatch?.[1] && documentNumberMatch?.[0]) {
    return `${documentTypeMatch[1].toUpperCase()} ${documentNumberMatch[0]}`;
  }

  return fallback;
}

function buildReference(order: Order) {
  const uniqueSuffix = `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
  return `UC-${order.orderNumber}-${uniqueSuffix}`;
}

function buildDescription(order: Order) {
  const itemCount = order.items.reduce((accumulator, item) => accumulator + item.quantity, 0);
  return `Pedido ${order.orderNumber} - ${itemCount} item${itemCount === 1 ? "" : "s"}`;
}

function buildCheckoutPayload(order: Order, reference: string): UnicobrosCreateCheckoutRequest {
  const returnUrl = env.unicobrosReturnUrl || new URL("/checkout/success", env.siteUrl).toString();
  const webhookUrl =
    env.unicobrosWebhookUrl || new URL("/api/payments/unicobros/webhook", env.siteUrl).toString();

  return {
    total: toTwoDecimals(toNumber(order.total)),
    description: buildDescription(order),
    currency: "ARS",
    reference,
    customer: {
      email: readString(order.customer.email),
      name: readString(`${order.customer.firstName} ${order.customer.lastName}`.trim()),
      identification: extractIdentification(order.customer.notes, order.orderNumber),
    },
    test: String(env.unicobrosTest).toLowerCase() === "true",
    return_url: returnUrl,
    webhook: webhookUrl,
    webhooksType: "final",
  };
}

function buildCheckoutLogPayload(payload: UnicobrosCreateCheckoutRequest) {
  return {
    reference: payload.reference,
    webhook: payload.webhook,
    return_url: payload.return_url,
    webhooksType: payload.webhooksType,
    test: payload.test,
    total: payload.total,
    currency: payload.currency,
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
      console.info("UNICOBROS_CREATE_CHECKOUT_REQUEST", buildCheckoutLogPayload(payload));
      const response = await createUnicobrosCheckout(payload);
      console.info("UNICOBROS_CREATE_CHECKOUT_RESPONSE", {
        data: {
          id: response.providerPaymentId,
          url: response.checkoutUrl,
        },
        result: response.rawResponse && typeof response.rawResponse === "object"
          ? (response.rawResponse as { result?: unknown }).result
          : undefined,
        status: response.rawResponse && typeof response.rawResponse === "object"
          ? (response.rawResponse as { status?: unknown }).status
          : undefined,
      });
      return {
        checkoutUrl: response.checkoutUrl,
        externalReference: reference,
        providerPaymentId: response.providerPaymentId,
        rawProviderStatus: response.rawProviderStatus,
        rawResponse: response.rawResponse,
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
