import { markTransferOrderAsPaid } from "@/features/orders/server/transfer-admin-service";
import { requireAdminSession } from "@/features/admin/auth";
import { jsonError, jsonSuccess } from "@/lib/http";
import { logger } from "@/lib/logger";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const requestId = crypto.randomUUID();

  try {
    await requireAdminSession(request.headers);
  } catch {
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
