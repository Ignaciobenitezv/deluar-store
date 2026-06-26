import { handleGetnetWebhook, validateGetnetWebhookBasicAuth } from "@/features/payments/getnet/webhook-service";
import { jsonError, jsonSuccess } from "@/lib/http";
import { logger } from "@/lib/logger";

async function readWebhookPayload(request: Request) {
  const rawBody = await request.text();

  if (!rawBody) {
    return {
      rawBody,
      payload: null,
    };
  }

  try {
    return {
      rawBody,
      payload: JSON.parse(rawBody) as Record<string, unknown>,
    };
  } catch {
    return {
      rawBody,
      payload: null,
    };
  }
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const authorization = request.headers.get("authorization");

  let isAuthorized = false;

  try {
    isAuthorized = validateGetnetWebhookBasicAuth(authorization);
  } catch (error) {
    logger.error("getnet.webhook.processed", {
      requestId,
      result: "webhook_auth_not_configured",
      error: error instanceof Error ? error.message : "unknown_error",
    });
    return jsonError(["Getnet webhook credentials are not configured."], 500, { requestId });
  }

  if (!isAuthorized) {
    logger.warn("getnet.webhook.skipped", {
      requestId,
      reason: "invalid_basic_auth",
      hasAuthorization: Boolean(authorization),
    });
    return jsonError(["Unauthorized"], 401, { requestId });
  }

  const { payload, rawBody } = await readWebhookPayload(request);
  const headers = Object.fromEntries(request.headers.entries());

  try {
    const result = await handleGetnetWebhook({
      headers,
      payload: payload ?? { rawBody },
      rawBody,
    });

    return jsonSuccess(
      {
        ok: true,
        duplicated: result.duplicated,
        linkedOrderId: result.linkedOrderId,
      },
      200,
      { requestId },
    );
  } catch (error) {
    logger.error("getnet.webhook.processed", {
      requestId,
      result: "handler_failed",
      error: error instanceof Error ? error.message : "unknown_error",
    });

    return jsonSuccess(
      {
        ok: true,
        processed: false,
      },
      200,
      { requestId },
    );
  }
}
