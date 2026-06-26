import { markTransferOrderAsPaid } from "@/features/orders/server/transfer-admin-service";
import { hasAdminSession } from "@/features/admin/auth";
import { jsonError, jsonSuccess } from "@/lib/http";
import { logger } from "@/lib/logger";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const requestId = crypto.randomUUID();

  if (!(await hasAdminSession())) {
    logger.warn("api.admin.orders.mark_paid.unauthorized", { requestId });
    return jsonError(["No autorizado."], 401, { requestId });
  }

  const { orderId } = await params;

  try {
    const result = await markTransferOrderAsPaid(orderId);

    if (!result.ok) {
      return jsonSuccess(result, result.status, { requestId });
    }

    return jsonSuccess(result, 200, { requestId });
  } catch (error) {
    logger.error("api.admin.orders.mark_paid.failed", {
      requestId,
      orderId,
      error: error instanceof Error ? error.message : "unknown_error",
    });

    return jsonError(["No se pudo marcar la orden como pagada."], 500, {
      requestId,
    });
  }
}
