import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

const REQUEST_TIMEOUT_MS = 10000;

export type GoCuotasAuthResponse = {
  token: string;
  raw: unknown;
};

export type GoCuotasCheckoutRequest = {
  amount_in_cents: number;
  url_success: string;
  url_failure: string;
  webhook_url: string;
  order_reference_id: string;
  email: string;
  phone_number: string;
};

export type GoCuotasCheckoutResponse = {
  checkoutUrl: string;
  rawProviderStatus?: string;
  raw: unknown;
};

class GoCuotasClientError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "GoCuotasClientError";
  }
}

function getBaseUrl() {
  return env.gocuotasBaseUrl.replace(/\/+$/, "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function readNestedString(value: unknown, keys: string[]) {
  if (!isRecord(value)) {
    return "";
  }

  for (const key of keys) {
    const direct = readString(value[key]);

    if (direct) {
      return direct;
    }
  }

  return "";
}

function findStringByKeys(value: unknown, keys: string[], depth = 0): string {
  if (!isRecord(value) || depth > 4) {
    return "";
  }

  const direct = readNestedString(value, keys);

  if (direct) {
    return direct;
  }

  for (const nestedValue of Object.values(value)) {
    const nested = findStringByKeys(nestedValue, keys, depth + 1);

    if (nested) {
      return nested;
    }
  }

  return "";
}

function extractToken(payload: unknown) {
  return findStringByKeys(payload, ["token", "access_token", "accessToken"]);
}

function extractCheckoutUrl(payload: unknown) {
  return findStringByKeys(payload, [
    "url_init",
    "init_url",
    "checkout_url",
    "checkoutUrl",
    "redirect_url",
    "redirectUrl",
    "url",
  ]);
}

function extractProviderStatus(payload: unknown) {
  return findStringByKeys(payload, ["status", "state"]) || undefined;
}

async function requestJson<T>(
  path: string,
  init: RequestInit,
  errorMessage: string,
): Promise<{
  headers: Headers;
  ok: boolean;
  payload: T | null;
  status: number;
  text: string;
}> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${getBaseUrl()}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...init.headers,
      },
    });
    const text = await response.text();
    const payload = text
      ? await Promise.resolve()
          .then(() => JSON.parse(text) as T)
          .catch(() => null)
      : null;

    return {
      headers: response.headers,
      ok: response.ok,
      payload,
      status: response.status,
      text,
    };
  } catch (error) {
    if (error instanceof GoCuotasClientError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new GoCuotasClientError("La solicitud a GoCuotas supero el tiempo de espera.");
    }

    throw new GoCuotasClientError(errorMessage);
  } finally {
    clearTimeout(timeout);
  }
}

function getDebugHeaders(headers: Headers) {
  return {
    contentType: headers.get("content-type"),
    location: headers.get("location"),
    requestId: headers.get("x-request-id") ?? headers.get("x-correlation-id"),
  };
}

function sanitizeForLog(value: unknown, depth = 0): unknown {
  if (depth > 5) {
    return "[truncated]";
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForLog(item, depth + 1));
  }

  if (!isRecord(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => {
      const normalizedKey = key.toLowerCase();

      if (normalizedKey.includes("token")) {
        const token = readString(nestedValue);

        return [key, token ? `${token.slice(0, 8)}...${token.slice(-4)}` : "[redacted]"];
      }

      if (normalizedKey.includes("password")) {
        return [key, "[redacted]"];
      }

      return [key, sanitizeForLog(nestedValue, depth + 1)];
    }),
  );
}

function logCreateCheckoutResponse(params: {
  headers: Headers;
  payload: unknown;
  status: number;
  text: string;
}) {
  logger.info("payments.gocuotas.create_checkout.response", {
    status: params.status,
    headers: getDebugHeaders(params.headers),
    payload: sanitizeForLog(params.payload),
    responseText: params.payload ? undefined : params.text,
  });
}

export async function authenticate(): Promise<GoCuotasAuthResponse> {
  if (!env.gocuotasEmail || !env.gocuotasPassword) {
    throw new GoCuotasClientError("Faltan credenciales de GoCuotas.");
  }

  const response = await requestJson<unknown>(
    "/api_redirect/v1/authentication",
    {
      method: "POST",
      body: JSON.stringify({
        email: env.gocuotasEmail,
        password: env.gocuotasPassword,
      }),
    },
    "No se pudo autenticar con GoCuotas.",
  );
  const payload = response.payload;

  if (!response.ok) {
    throw new GoCuotasClientError("No se pudo autenticar con GoCuotas.", response.status);
  }

  if (!payload) {
    throw new GoCuotasClientError(
      `GoCuotas respondio sin token de autenticacion. Status HTTP: ${response.status}.`,
      response.status,
    );
  }

  const token = extractToken(payload);

  if (!token) {
    throw new GoCuotasClientError("GoCuotas no devolvio token de autenticacion.");
  }

  return {
    token,
    raw: payload,
  };
}

export async function createCheckout(
  input: GoCuotasCheckoutRequest,
): Promise<GoCuotasCheckoutResponse> {
  const auth = await authenticate();
  const response = await requestJson<unknown>(
    "/api_redirect/v1/checkouts",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.token}`,
      },
      body: JSON.stringify(input),
    },
    "No se pudo crear el checkout de GoCuotas.",
  );
  const locationUrl = readString(response.headers.get("location"));
  const payload = response.payload;
  const checkoutUrl = (payload ? extractCheckoutUrl(payload) : "") || locationUrl;

  logCreateCheckoutResponse({
    headers: response.headers,
    payload,
    status: response.status,
    text: response.text,
  });

  if (!response.ok) {
    throw new GoCuotasClientError(
      `No se pudo crear el checkout de GoCuotas. Status HTTP: ${response.status}.`,
      response.status,
    );
  }

  if (!checkoutUrl) {
    throw new GoCuotasClientError(
      `GoCuotas respondio sin URL de checkout. Status HTTP: ${response.status}.`,
      response.status,
    );
  }

  return {
    checkoutUrl,
    rawProviderStatus: extractProviderStatus(payload),
    raw: payload,
  };
}
