import type { PreferenceRequest } from "mercadopago/dist/clients/preference/commonTypes";
import { logger } from "@/lib/logger";
import { reviewPaymentMessage } from "@/lib/deployment";
import { getMercadoPagoPreferenceClient } from "@/integrations/mercadopago/client";
import {
  getMercadoPagoNotificationUrl,
  getMercadoPagoReturnUrls,
  hasMercadoPagoCredentials,
} from "@/integrations/mercadopago/config";
import {
  getMercadoPagoOrderById,
  markOrderWithMercadoPagoPreference,
} from "@/features/payments/mercadopago/server/order-repository";
import type {
  MercadoPagoCreatePreferenceInput,
  MercadoPagoCreatePreferenceResult,
} from "@/features/payments/mercadopago/server/types";
import { Prisma } from "@/generated/prisma/client";

function toNumber(value: Prisma.Decimal | number) {
  return typeof value === "number" ? value : value.toNumber();
}

function buildPreferenceBody(order: NonNullable<Awaited<ReturnType<typeof getMercadoPagoOrderById>>>) {
  const items: PreferenceRequest["items"] = order.items.map((item) => ({
    id: item.productId,
    title: item.productName,
    quantity: item.quantity,
    currency_id: "ARS",
    unit_price: toNumber(item.unitPrice),
  }));

  return {
    items,
    external_reference: order.orderNumber,
    notification_url: getMercadoPagoNotificationUrl(),
    back_urls: getMercadoPagoReturnUrls(),
    auto_return: "approved",
    metadata: {
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerEmail: order.customer.email,
    },
    payer: {
      name: order.customer.fullName,
      email: order.customer.email,
      phone: {
        number: order.customer.phone,
      },
    },
  } satisfies PreferenceRequest;
}

export async function createMercadoPagoPreference(
  input: MercadoPagoCreatePreferenceInput,
): Promise<MercadoPagoCreatePreferenceResult> {
  if (!hasMercadoPagoCredentials()) {
    return {
      ok: false,
      status: 503,
      errors: [reviewPaymentMessage],
    };
  }

  if (!input.orderId) {
    return {
      ok: false,
      status: 400,
      errors: ["Debes enviar un orderId valido."],
    };
  }

  const order = await getMercadoPagoOrderById(input.orderId);

  if (!order) {
    return {
      ok: false,
      status: 404,
      errors: ["La orden solicitada no existe."],
    };
  }

  if (order.paymentStatus === "APPROVED" || order.status === "PAID") {
    return {
      ok: false,
      status: 409,
      errors: ["La orden ya fue pagada."],
    };
  }

  const preferenceClient = getMercadoPagoPreferenceClient();

  try {
    logger.info("payments.mercadopago.preference.create.started", {
      orderId: order.id,
      orderNumber: order.orderNumber,
    });

    if (order.providerPreferenceId) {
      const existing = await preferenceClient.get({
        preferenceId: order.providerPreferenceId,
      });

      const initPoint = existing.init_point ?? existing.sandbox_init_point ?? "";

      return {
        ok: true,
        orderId: order.id,
        orderNumber: order.orderNumber,
        preferenceId: order.providerPreferenceId,
        initPoint,
      };
    }

    const preference = await preferenceClient.create({
      body: buildPreferenceBody(order),
    });

    const preferenceId = preference.id ?? "";
    const initPoint = preference.init_point ?? preference.sandbox_init_point ?? "";

    await markOrderWithMercadoPagoPreference({
      orderId: order.id,
      preferenceId,
    });

    logger.info("payments.mercadopago.preference.create.succeeded", {
      orderId: order.id,
      orderNumber: order.orderNumber,
      preferenceId,
    });

    return {
      ok: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      preferenceId,
      initPoint,
    };
  } catch (error) {
    logger.error("payments.mercadopago.preference.create.failed", {
      orderId: order.id,
      error: error instanceof Error ? error.message : "unknown_error",
    });

    return {
      ok: false,
      status: 500,
      errors: ["No se pudo crear la preferencia de Mercado Pago."],
    };
  }
}
