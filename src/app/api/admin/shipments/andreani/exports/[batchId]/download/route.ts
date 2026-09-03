import { requireAdminSession } from "@/features/admin/auth";
import { logger } from "@/lib/logger";
import { getAndreaniExportBatch } from "@/features/shipments/andreani-export/batch-service";

function buildErrorResponse(message: string, status = 404) {
  return Response.json(
    {
      ok: false,
      message,
    },
    { status },
  );
}

export async function GET(request: Request, context: RouteContext<"/api/admin/shipments/andreani/exports/[batchId]/download">) {
  const requestId = crypto.randomUUID();

  try {
    await requireAdminSession(request.headers);
  } catch {
    logger.warn("api.admin.shipments.andreani.export-batch.download.unauthorized", { requestId });
    return buildErrorResponse("No autorizado.", 401);
  }

  const { batchId } = await context.params;
  const batch = await getAndreaniExportBatch(batchId);

  if (!batch) {
    return buildErrorResponse("El lote no existe.", 404);
  }

  if (!batch.archiveBytes?.length) {
    logger.error("api.admin.shipments.andreani.export-batch.download.missing-archive", {
      requestId,
      batchId,
    });
    return buildErrorResponse("El archivo del lote no está disponible.", 409);
  }

  const responseBody = new Uint8Array(batch.archiveBytes.buffer, batch.archiveBytes.byteOffset, batch.archiveBytes.byteLength);

  logger.info("api.admin.shipments.andreani.export-batch.download.success", {
    requestId,
    batchId,
    shipmentCount: batch.shipments.length,
  });

  return new Response(responseBody as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${batch.fileName}"`,
      "Cache-Control": "no-store",
      "X-Request-Id": requestId,
    },
  });
}

