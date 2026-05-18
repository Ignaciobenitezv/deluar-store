import { handleMercadoPagoWebhook } from "@/features/payments/mercadopago/server/webhook-service";
import { jsonError, jsonSuccess } from "@/lib/http";
import { logger } from "@/lib/logger";

async function readRequestBody(request: Request) {
  const rawBody = await request.text();

  if (!rawBody) {
    return { rawBody, payload: {} as Record<string, unknown> };
  }

  try {
    return {
      rawBody,
      payload: JSON.parse(rawBody) as Record<string, unknown>,
    };
  } catch {
    return { rawBody, payload: {} as Record<string, unknown> };
  }
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();

  try {
    const { payload, rawBody } = await readRequestBody(request);
    const url = new URL(request.url);
    const headers = Object.fromEntries(request.headers.entries());

    const readId = (value: unknown) =>
      typeof value === "string" || typeof value === "number" ? value : undefined;
    const readText = (value: unknown) => (typeof value === "string" ? value : undefined);
    const dataPayload = payload.data as { id?: unknown } | undefined;

    const normalizedPayload = {
      ...payload,
      id: readId(payload.id) ?? readId(payload["data.id"]) ?? readId(url.searchParams.get("id")),
      topic:
        readText(payload.topic) ??
        readText(payload.type) ??
        url.searchParams.get("topic") ??
        url.searchParams.get("type") ??
        undefined,
      action: readText(payload.action) ?? undefined,
      data: {
        id:
          readId(dataPayload?.id) ??
          readId(url.searchParams.get("data.id")) ??
          readId(url.searchParams.get("id")),
      },
      external_reference: readText(payload.external_reference) ?? readText(payload.externalReference),
    };

    const result = await handleMercadoPagoWebhook(
      normalizedPayload,
      rawBody,
      headers as Record<string, string>,
    );

    if ("rejected" in result && result.rejected) {
      return jsonError(["Webhook de Mercado Pago no validado."], 401, { requestId });
    }

    if (result.duplicated) {
      return jsonSuccess(
        {
          ok: true,
          duplicated: true,
        },
        200,
        { requestId },
      );
    }

    return jsonSuccess(
      {
        ok: true,
        duplicated: false,
        linkedOrderId: result.linkedOrderId,
      },
      200,
      { requestId },
    );
  } catch (error) {
    logger.error("api.payments.mercadopago.webhook.failed", {
      requestId,
      error: error instanceof Error ? error.message : "unknown_error",
    });
    return jsonError(["No se pudo procesar el webhook de Mercado Pago."], 500, { requestId });
  }
}
