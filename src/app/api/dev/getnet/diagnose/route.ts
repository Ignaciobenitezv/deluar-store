import {
  getGetnetBusinessConfigurations,
  getGetnetSellers,
  getGetnetTechnicalConfigurations,
  sanitizeGetnetValueForLog,
} from "@/features/payments/getnet/client";
import { jsonError, jsonSuccess } from "@/lib/http";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

function isAuthorized(request: Request) {
  const adminSecret = request.headers.get("x-admin-secret");
  return Boolean(env.adminSecret && adminSecret === env.adminSecret);
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();

  if (process.env.NODE_ENV === "production") {
    return jsonError(["Not found"], 404, { requestId });
  }

  if (!isAuthorized(request)) {
    return jsonError(["Unauthorized"], 401, { requestId });
  }

  try {
    const [sellers, technicalConfigurations, businessConfigurations] = await Promise.all([
      getGetnetSellers(),
      getGetnetTechnicalConfigurations(),
      getGetnetBusinessConfigurations(),
    ]);

    logger.info("getnet.diagnose.succeeded", {
      requestId,
      sellers: sanitizeGetnetValueForLog(sellers),
      technicalConfigurations: sanitizeGetnetValueForLog(technicalConfigurations),
      businessConfigurations: sanitizeGetnetValueForLog(businessConfigurations),
    });

    return jsonSuccess(
      {
        ok: true,
        sellers: sanitizeGetnetValueForLog(sellers),
        technicalConfigurations: sanitizeGetnetValueForLog(technicalConfigurations),
        businessConfigurations: sanitizeGetnetValueForLog(businessConfigurations),
      },
      200,
      { requestId },
    );
  } catch (error) {
    logger.error("getnet.diagnose.failed", {
      requestId,
      error: error instanceof Error ? error.message : "unknown_error",
    });

    return jsonError(
      [error instanceof Error ? error.message : "No se pudo diagnosticar Getnet."],
      500,
      { requestId },
    );
  }
}
