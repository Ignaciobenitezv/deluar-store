import { getOrderById } from "@/features/order/order-repository";
import { initGetnetPayment } from "@/integrations/getnet/payment";
import type { GetnetInitPaymentRequest } from "@/integrations/getnet/types";
import { jsonError, jsonSuccess } from "@/lib/http";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  let payload: GetnetInitPaymentRequest;

  try {
    payload = (await request.json()) as GetnetInitPaymentRequest;
  } catch {
    logger.warn("api.payments.getnet.init.invalid_json", { requestId });
    return jsonError(["El cuerpo de la solicitud no es un JSON valido."], 400, { requestId });
  }

  if (!payload.orderId || typeof payload.orderId !== "string") {
    logger.warn("api.payments.getnet.init.invalid_order_id", { requestId });
    return jsonError(["Debes enviar un orderId valido."], 400, { requestId });
  }

  logger.info("api.payments.getnet.init.received", {
    requestId,
    orderId: payload.orderId,
  });

  const order = getOrderById(payload.orderId);

  if (!order) {
    logger.warn("api.payments.getnet.init.order_not_found", {
      requestId,
      orderId: payload.orderId,
    });
    return jsonError(["La orden solicitada no existe."], 404, { requestId });
  }

  if (order.status !== "pending_payment") {
    logger.warn("api.payments.getnet.init.invalid_order_status", {
      requestId,
      orderId: order.id,
      status: order.status,
    });
    return jsonError(["La orden no esta disponible para iniciar pago."], 409, { requestId });
  }

  try {
    const payment = await initGetnetPayment(order);

    logger.info("api.payments.getnet.init.succeeded", {
      requestId,
      orderId: order.id,
      mode: payment.mode,
      status: payment.status,
    });

    return jsonSuccess(
      {
        ok: true,
        payment,
      },
      200,
      { requestId },
    );
  } catch (error) {
    logger.error("api.payments.getnet.init.failed", {
      requestId,
      orderId: order.id,
      error: error instanceof Error ? error.message : "unknown_error",
    });
    return jsonError(["No se pudo preparar el inicio de pago con Getnet."], 500, { requestId });
  }
}
