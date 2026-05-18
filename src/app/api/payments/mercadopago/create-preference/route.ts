import { createMercadoPagoPreference } from "@/features/payments/mercadopago/server/preference-service";
import type { MercadoPagoCreatePreferenceInput } from "@/features/payments/mercadopago/server/types";
import { jsonError, jsonSuccess } from "@/lib/http";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  let payload: MercadoPagoCreatePreferenceInput;

  try {
    payload = (await request.json()) as MercadoPagoCreatePreferenceInput;
  } catch {
    logger.warn("api.payments.mercadopago.preference.invalid_json", { requestId });
    return jsonError(["El cuerpo de la solicitud no es un JSON valido."], 400, { requestId });
  }

  try {
    const result = await createMercadoPagoPreference(payload);

    if (!result.ok) {
      logger.warn("api.payments.mercadopago.preference.rejected", {
        requestId,
        status: result.status,
        errorCount: result.errors.length,
      });

      return jsonError(result.errors, result.status, { requestId });
    }

    return jsonSuccess(
      {
        ok: true,
        preferenceId: result.preferenceId,
        initPoint: result.initPoint,
        orderId: result.orderId,
        orderNumber: result.orderNumber,
      },
      200,
      { requestId },
    );
  } catch (error) {
    logger.error("api.payments.mercadopago.preference.failed", {
      requestId,
      error: error instanceof Error ? error.message : "unknown_error",
    });
    return jsonError(["No se pudo crear la preferencia de Mercado Pago."], 500, { requestId });
  }
}
