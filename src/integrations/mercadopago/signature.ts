import crypto from "node:crypto";
import { env } from "@/lib/env";

function parseSignatureHeader(signature: string) {
  const parts = new Map<string, string>();

  signature
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => {
      const [key, value] = part.split("=");

      if (key && value) {
        parts.set(key.trim(), value.trim());
      }
    });

  return {
    ts: parts.get("ts") ?? "",
    v1: parts.get("v1") ?? "",
  };
}

export function validateMercadoPagoWebhookSignature(params: {
  signature?: string | null;
  requestId?: string | null;
  dataId?: string | number | null;
}) {
  if (!env.mercadoPagoWebhookSecret) {
    return false;
  }

  const signature = params.signature?.trim();
  const requestId = params.requestId?.trim();
  const dataId = params.dataId?.toString().trim();

  if (!signature || !requestId || !dataId) {
    return false;
  }

  const { ts, v1 } = parseSignatureHeader(signature);

  if (!ts || !v1) {
    return false;
  }

  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const expected = crypto
    .createHmac("sha256", env.mercadoPagoWebhookSecret)
    .update(manifest)
    .digest("hex");

  if (expected.length !== v1.length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
}
