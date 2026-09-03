import { requireAdminSession } from "@/features/admin/auth";
import { logger } from "@/lib/logger";
import { createAndreaniExportBatchFromShipmentIds } from "@/features/shipments/andreani-export/batch-service";
import { SHIPMENT_CARRIERS, type ShipmentCarrier } from "@/features/shipments/types";

type ExportRequestBody = {
  shipmentIds?: string[];
  carrier?: ShipmentCarrier;
};

function buildErrorResponse(
  message: string,
  issues: Array<{
    shipmentId: string;
    orderId: string;
    orderNumber: string;
    field: string;
    code: string;
    message: string;
    sheetName?: string | null;
  }> = [],
  status = 422,
) {
  return Response.json(
    {
      ok: false,
      message,
      issues,
    },
    { status },
  );
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();

  try {
    await requireAdminSession(request.headers);
  } catch {
    logger.warn("api.admin.shipments.andreani.export.unauthorized", { requestId });
    return buildErrorResponse("No autorizado.", [], 401);
  }

  let requestBody: ExportRequestBody;

  try {
    requestBody = (await request.json()) as ExportRequestBody;
  } catch {
    return buildErrorResponse("El cuerpo de la solicitud debe ser JSON valido.", [], 400);
  }

  const carrier = requestBody.carrier ?? SHIPMENT_CARRIERS.ANDREANI;

  const result = await createAndreaniExportBatchFromShipmentIds(requestBody.shipmentIds ?? [], carrier);

  if (!result.ok) {
    logger.info("api.admin.shipments.andreani.export.blocked", {
      requestId,
      status: result.status,
      issueCount: result.issues.length,
    });

    return buildErrorResponse(result.message, result.issues, result.status);
  }

  logger.info("api.admin.shipments.andreani.export.success", {
    requestId,
    batchId: result.batchId,
    shipmentCount: result.shipments.length,
    rowCount: result.rows.length,
  });

  const responseBody = new Uint8Array(
    result.buffer.buffer,
    result.buffer.byteOffset,
    result.buffer.byteLength,
  );

  return new Response(responseBody as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${result.fileName}"`,
      "Cache-Control": "no-store",
      "X-Request-Id": requestId,
      "X-Andreani-Batch-Id": result.batchId,
    },
  });
}
