import { handleGoCuotasWebhook } from "@/features/payments/gocuotas/webhook-service";
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
  const { payload, rawBody } = await readWebhookPayload(request);
  const headers = Object.fromEntries(request.headers.entries());

  try {
    logger.info("api.payments.gocuotas.webhook.received", {
      requestId,
      hasPayload: Boolean(payload),
      rawBodyLength: rawBody.length,
    });

    const result = await handleGoCuotasWebhook({
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
    logger.error("api.payments.gocuotas.webhook.failed", {
      requestId,
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
