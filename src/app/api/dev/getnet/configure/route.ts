import {
  getGetnetBusinessConfigurations,
  getGetnetTechnicalConfigurations,
  putGetnetBusinessConfigurations,
  putGetnetTechnicalConfigurations,
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
    const technical = await putGetnetTechnicalConfigurations();
    const business = await putGetnetBusinessConfigurations();
    const [technicalConfigurations, businessConfigurations] = await Promise.all([
      getGetnetTechnicalConfigurations(),
      getGetnetBusinessConfigurations(),
    ]);

    logger.info("getnet.configure.succeeded", {
      requestId,
      technicalRequest: sanitizeGetnetValueForLog(technical.request),
      technicalResponse: sanitizeGetnetValueForLog(technical.response),
      businessRequest: sanitizeGetnetValueForLog(business.request),
      businessResponse: sanitizeGetnetValueForLog(business.response),
      technicalConfigurations: sanitizeGetnetValueForLog(technicalConfigurations),
      businessConfigurations: sanitizeGetnetValueForLog(businessConfigurations),
    });

    return jsonSuccess(
      {
        ok: true,
        technicalRequest: sanitizeGetnetValueForLog(technical.request),
        technicalResponse: sanitizeGetnetValueForLog(technical.response),
        businessRequest: sanitizeGetnetValueForLog(business.request),
        businessResponse: sanitizeGetnetValueForLog(business.response),
        technicalConfigurations: sanitizeGetnetValueForLog(technicalConfigurations),
        businessConfigurations: sanitizeGetnetValueForLog(businessConfigurations),
      },
      200,
      { requestId },
    );
  } catch (error) {
    logger.error("getnet.configure.failed", {
      requestId,
      error: error instanceof Error ? error.message : "unknown_error",
    });

    return jsonError(
      [error instanceof Error ? error.message : "No se pudo configurar Getnet."],
      500,
      { requestId },
    );
  }
}
