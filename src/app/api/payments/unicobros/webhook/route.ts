import { handleUnicobrosWebhook } from "@/features/payments/unicobros/webhook-service";
import { jsonError, jsonSuccess } from "@/lib/http";
import { logger } from "@/lib/logger";

async function readWebhookPayload(request: Request) {
  const rawBody = await request.text();

  if (!rawBody) {
    return {
      rawBody,
      payload: null,
      parsed: false,
    };
  }

  try {
    return {
      rawBody,
      payload: JSON.parse(rawBody) as Record<string, unknown>,
      parsed: true,
    };
  } catch {
    return {
      rawBody,
      payload: null,
      parsed: false,
    };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isValidUnicobrosWebhookPayload(payload: unknown) {
  if (!isRecord(payload) || !isRecord(payload.data)) {
    return false;
  }

  return isRecord(payload.data.payment);
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();

  try {
    const { payload, rawBody, parsed } = await readWebhookPayload(request);
    const headers = Object.fromEntries(request.headers.entries());

    // Unicobros does not document a webhook signature or shared secret for this integration.
    // Keep this surface unauthenticated until the provider publishes a supported verification method.
    if (!parsed) {
      logger.warn("api.payments.unicobros.webhook.invalid_payload", {
        requestId,
        reason: rawBody ? "invalid_json" : "empty_body",
        rawBodyLength: rawBody.length,
      });

      return jsonError(["Invalid webhook payload"], 400, { requestId });
    }

    if (!isValidUnicobrosWebhookPayload(payload)) {
      logger.warn("api.payments.unicobros.webhook.invalid_payload", {
        requestId,
        reason: "missing_expected_structure",
        rawBodyLength: rawBody.length,
      });

      return jsonError(["Invalid webhook payload"], 400, { requestId });
    }

    logger.debug("api.payments.unicobros.webhook.received", {
      requestId,
      hasPayload: Boolean(payload),
      rawBodyLength: rawBody.length,
    });

    const result = await handleUnicobrosWebhook({
      headers,
      payload,
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
    logger.error("api.payments.unicobros.webhook.failed", {
      requestId,
      error: error instanceof Error ? error.message : "unknown_error",
    });

    return jsonError(["Internal server error"], 500, { requestId });
  }
}
