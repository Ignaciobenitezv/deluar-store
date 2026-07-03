import { handleUnicobrosWebhook } from "@/features/payments/unicobros/webhook-service";
import { jsonSuccess } from "@/lib/http";
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

  try {
    const { payload, rawBody } = await readWebhookPayload(request);
    const headers = Object.fromEntries(request.headers.entries());

    logger.info("api.payments.unicobros.webhook.received", {
      requestId,
      hasPayload: Boolean(payload),
      rawBodyLength: rawBody.length,
    });

    console.info("WEBHOOK_RECEIVED", {
      requestId,
      hasPayload: Boolean(payload),
      rawBodyLength: rawBody.length,
    });

    const result = await handleUnicobrosWebhook({
      headers,
      payload: payload ?? { rawBody },
    });

    console.info("WEBHOOK_FINISHED", {
      requestId,
      processed: true,
      duplicated: result.duplicated,
      linkedOrderId: result.linkedOrderId,
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

    console.error("WEBHOOK_FINISHED", {
      requestId,
      processed: false,
      reason: error instanceof Error ? error.message : "unknown_error",
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
