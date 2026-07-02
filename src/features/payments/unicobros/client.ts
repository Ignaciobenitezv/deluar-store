import { env } from "@/lib/env";
import type {
  UnicobrosCreateCheckoutRequest,
  UnicobrosCreateCheckoutResponse,
} from "@/features/payments/unicobros/types";

class UnicobrosClientError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "UnicobrosClientError";
  }
}

function getBaseUrl() {
  return env.unicobrosBaseUrl.replace(/\/+$/, "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

export function buildUnicobrosHeaders() {
  return {
    "x-api-key": env.unicobrosApiKey,
    "x-access-token": env.unicobrosAccessToken,
    "content-type": "application/json",
  };
}

export function getUnicobrosBaseUrl() {
  return getBaseUrl();
}

function extractCheckoutUrl(payload: unknown) {
  if (!isRecord(payload)) {
    return "";
  }

  const candidates = [
    payload.data && isRecord(payload.data)
      ? payload.data.url ?? payload.data.checkoutUrl ?? payload.data.checkout_url
      : undefined,
    payload.url,
    payload.checkoutUrl,
    payload.checkout_url,
  ];

  for (const candidate of candidates) {
    const value = readString(candidate);

    if (value) {
      return value;
    }
  }

  return "";
}

function extractStatus(payload: unknown) {
  if (!isRecord(payload)) {
    return undefined;
  }

  const status = readString(payload.status);

  return status || undefined;
}

async function requestJson<T>(input: RequestInit & { body: string }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(`${getBaseUrl()}/p/checkout`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        ...buildUnicobrosHeaders(),
        Accept: "application/json",
      },
      ...input,
    });
    const text = await response.text();
    const payload = text
      ? await Promise.resolve()
          .then(() => JSON.parse(text) as T)
          .catch(() => null)
      : null;

    return {
      ok: response.ok,
      status: response.status,
      text,
      payload,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new UnicobrosClientError("La solicitud a Unicobros supero el tiempo de espera.");
    }

    if (error instanceof UnicobrosClientError) {
      throw error;
    }

    throw new UnicobrosClientError(
      error instanceof Error ? error.message : "No se pudo conectar con Unicobros.",
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function createUnicobrosCheckout(
  input: UnicobrosCreateCheckoutRequest,
): Promise<UnicobrosCreateCheckoutResponse> {
  const { ok, status, payload, text } = await requestJson<UnicobrosCreateCheckoutResponse>({
    body: JSON.stringify(input),
  });
  const checkoutUrl = extractCheckoutUrl(payload);
  const rawStatus = extractStatus(payload);

  if (!ok) {
    throw new UnicobrosClientError(
      `No se pudo crear el checkout de Unicobros. Status HTTP: ${status}.`,
      status,
    );
  }

  if (!checkoutUrl) {
    throw new UnicobrosClientError(
      `Unicobros respondio sin url de checkout. Status HTTP: ${status}.`,
      status,
    );
  }

  return {
    data: {
      url: checkoutUrl,
    },
    status: rawStatus,
    raw: payload ?? text,
  };
}

export { UnicobrosClientError };
