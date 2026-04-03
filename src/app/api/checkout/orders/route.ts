import { createOrder } from "@/features/order/order-service";
import type { CreateOrderInput } from "@/features/order/types";
import { jsonError, jsonSuccess } from "@/lib/http";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  let payload: CreateOrderInput;

  try {
    payload = (await request.json()) as CreateOrderInput;
  } catch {
    logger.warn("api.checkout.orders.invalid_json", { requestId });
    return jsonError(["El cuerpo de la solicitud no es un JSON valido."], 400, { requestId });
  }

  try {
    logger.info("api.checkout.orders.received", {
      requestId,
      itemCount: Array.isArray(payload.items) ? payload.items.length : 0,
    });

    const result = await createOrder(payload);

    if (!result.ok) {
      logger.warn("api.checkout.orders.rejected", {
        requestId,
        status: result.status,
        errorCount: result.errors.length,
      });
      return jsonSuccess(result, result.status, { requestId });
    }

    logger.info("api.checkout.orders.created", {
      requestId,
      orderId: result.order.id,
      orderNumber: result.order.orderNumber,
    });
    return jsonSuccess(result, 201, { requestId });
  } catch (error) {
    logger.error("api.checkout.orders.failed", {
      requestId,
      error: error instanceof Error ? error.message : "unknown_error",
    });
    return jsonError(["No se pudo crear la orden en este momento."], 500, { requestId });
  }
}
