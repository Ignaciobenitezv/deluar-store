import { hasBetterAuthAdminSession } from "@/features/admin/better-auth";
import { processAnalyticsCartAbandonments } from "@/features/analytics/server/lifecycle";
import { env } from "@/lib/env";
import { jsonError, jsonSuccess } from "@/lib/http";
import { logger } from "@/lib/logger";

function hasMaintenanceSecret(request: Request) {
  if (!env.analyticsMaintenanceSecret) {
    return false;
  }

  const headerSecret = request.headers.get("x-analytics-maintenance-secret");

  return Boolean(headerSecret && headerSecret === env.analyticsMaintenanceSecret);
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();

  if (!(await hasBetterAuthAdminSession(request.headers)) && !hasMaintenanceSecret(request)) {
    logger.warn("api.analytics.maintenance.abandonments.unauthorized", {
      requestId,
    });

    return jsonError(["No autorizado."], 401, { requestId });
  }

  try {
    const result = await processAnalyticsCartAbandonments({
      now: new Date(),
    });

    return jsonSuccess(
      {
        ok: true,
        ...result,
      },
      200,
      { requestId },
    );
  } catch (error) {
    logger.error("api.analytics.maintenance.abandonments.failed", {
      requestId,
      error: error instanceof Error ? error.message : "unknown_error",
    });

    return jsonError(["No se pudo procesar el abandono de carritos."], 500, {
      requestId,
    });
  }
}
