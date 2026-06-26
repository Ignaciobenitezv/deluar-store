import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import type { Order } from "@/features/order/types";
import { getShippingMethodLabel } from "@/features/shipping/shipping";

const REQUEST_TIMEOUT_MS = 10000;
const GETNET_TOKEN_SAFETY_WINDOW_SECONDS = 60;

type GetnetAccessTokenResponse = {
  access_token?: string;
  scope?: string;
  token_type?: string;
  expires_in?: number;
};

type GetnetPaymentIntentResponse = {
  payment_intent_id?: string;
  trade_name?: string;
  redirect_url?: string;
};

type GetnetRequestResult<T> = {
  headers: Headers;
  ok: boolean;
  payload: T | null;
  status: number;
  text: string;
};

type CachedGetnetToken = {
  accessToken: string;
  expiresAt: number;
};

type GetnetPaymentIntentProduct = {
  product_type: string;
  title: string;
  description: string;
  value: number;
  quantity: number;
};

type GetnetAddressPayload = {
  street: string;
  number: string;
  complement?: string;
  city: string;
  state: string;
  country: "AR";
  postal_code: string;
};

type GetnetPaymentIntentPayload = {
  order_id: string;
  mode: "instant";
  configurations: {
    "3ds": true;
    preauthorization: false;
    card_verification: false;
    success_url: string;
    error_url: string;
  };
  payment: {
    currency: "ARS";
    amount: number;
  };
  product: GetnetPaymentIntentProduct[];
  customer: {
    customer_id: string;
    name: string;
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
    document_type?: string;
    document_number?: string;
    billing_address: GetnetAddressPayload;
  };
  shipping: {
    address: GetnetAddressPayload;
  };
  pickup_store: false;
  shipping_method: string;
};

export type GetnetPaymentIntentResult = {
  paymentIntentId: string;
  redirectUrl: string;
  rawProviderStatus: string;
  amount: number;
  raw: unknown;
};

export type GetnetSeller = Record<string, unknown>;
export type GetnetTechnicalConfigurations = Record<string, unknown>;
export type GetnetBusinessConfigurations = Record<string, unknown>;

class GetnetClientError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "GetnetClientError";
  }
}

let cachedToken: CachedGetnetToken | null = null;

function getApiBaseUrl() {
  return env.getnetApiBaseUrl.replace(/\/+$/, "");
}

function getWebCheckoutBaseUrl() {
  return env.getnetWebCheckoutBaseUrl.replace(/\/+$/, "");
}

function buildSiteUrl(path: string) {
  return new URL(path, env.siteUrl).toString();
}

function ensureOauthConfig() {
  if (!env.getnetApiBaseUrl) {
    throw new GetnetClientError("Falta GETNET_API_BASE_URL.");
  }

  if (!env.getnetClientId || !env.getnetClientSecret) {
    throw new GetnetClientError("Faltan credenciales OAuth2 de Getnet.");
  }
}

function ensurePaymentIntentConfig() {
  ensureOauthConfig();

  if (!env.getnetWebCheckoutBaseUrl) {
    throw new GetnetClientError("Falta GETNET_WEB_CHECKOUT_BASE_URL.");
  }
}

function ensureGetnetCheckoutConfig() {
  ensurePaymentIntentConfig();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
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

      if (normalizedKey.includes("client_secret") || normalizedKey.includes("password")) {
        return [key, "[redacted]"];
      }

      if (normalizedKey.includes("access_token") || normalizedKey === "authorization") {
        const token = readString(nestedValue);
        return [key, token ? `${token.slice(0, 8)}...${token.slice(-4)}` : "[redacted]"];
      }

      return [key, sanitizeForLog(nestedValue, depth + 1)];
    }),
  );
}

async function requestText(pathOrUrl: string, init: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(pathOrUrl, {
      ...init,
      signal: controller.signal,
    });
    const text = await response.text();

    return {
      response,
      text,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new GetnetClientError("La solicitud a Getnet supero el tiempo de espera.");
    }

    throw new GetnetClientError(
      error instanceof Error ? error.message : "No se pudo conectar con Getnet.",
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function requestJson<T>(
  pathOrUrl: string,
  init: RequestInit,
): Promise<GetnetRequestResult<T>> {
  const { response, text } = await requestText(pathOrUrl, init);
  const payload = parseJson<T>(text);

  return {
    headers: response.headers,
    ok: response.ok,
    payload,
    status: response.status,
    text,
  };
}

function parseJson<T>(text: string): T | null {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function getNow() {
  return Date.now();
}

function isTokenUsable(token: CachedGetnetToken | null) {
  return Boolean(token && token.expiresAt > getNow());
}

function toAmountInMinorUnits(value: number) {
  return Math.round(value * 100);
}

function normalizeDocumentType(value: string) {
  const normalized = value.trim().toLowerCase();

  if (
    normalized === "dni" ||
    normalized === "cuit" ||
    normalized === "cuil" ||
    normalized === "passport"
  ) {
    return normalized;
  }

  return undefined;
}

function extractCustomerDocument(notes: string) {
  if (!notes.trim()) {
    return {
      documentType: undefined,
      documentNumber: undefined,
    };
  }

  const normalizedNotes = notes.trim();
  const documentTypeMatch = normalizedNotes.match(/\b(DNI|CUIT|CUIL|PASSPORT)\b/i);
  const documentNumberMatch = normalizedNotes.match(/\b\d{7,14}\b/);

  return {
    documentType: normalizeDocumentType(documentTypeMatch?.[1] ?? ""),
    documentNumber: documentNumberMatch?.[0],
  };
}

function compactObject<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, nestedValue]) => nestedValue !== undefined),
  ) as T;
}

function buildGetnetCheckoutUrl(path: string) {
  return `${getWebCheckoutBaseUrl()}${path}`;
}

function buildNotificationUrl() {
  return env.getnetWebhookPublicUrl || buildSiteUrl("/api/payments/getnet/webhook");
}

function buildGetnetTechnicalConfigurationsPayload() {
  if (!env.getnetWebhookUser || !env.getnetWebhookPassword) {
    throw new GetnetClientError(
      "Faltan GETNET_WEBHOOK_USER o GETNET_WEBHOOK_PASSWORD para configurar Getnet.",
    );
  }

  return {
    success_url: env.getnetSuccessUrl || buildSiteUrl("/checkout/exito"),
    error_url: env.getnetErrorUrl || buildSiteUrl("/checkout/error"),
    notification: {
      url: buildNotificationUrl(),
      authentication_type: "user_credentials",
      user_credentials: {
        user: env.getnetWebhookUser,
        password: env.getnetWebhookPassword,
      },
    },
    layout_customization: {
      primary_color: "#8B5E3C",
      secondary_color: "#F6EBDD",
      button_text_color: "#FFFFFF",
      background_color: "#FFFDF9",
    },
  };
}

function buildGetnetBusinessConfigurationsPayload() {
  return {
    credit: {
      enabled: true,
      brands: [
        {
          name: "VISA",
          currencies: ["ARS"],
        },
        {
          name: "MASTER",
          currencies: ["ARS"],
        },
      ],
    },
    debit: {
      enabled: true,
      brands: [
        {
          name: "VISA",
          currencies: ["ARS"],
        },
        {
          name: "MASTER",
          currencies: ["ARS"],
        },
      ],
    },
    instant_payment: {
      enabled: false,
    },
    bankslip: {
      enabled: false,
    },
  };
}

function parseStreetAddress(addressLine: string) {
  const trimmed = addressLine.trim();
  const match = trimmed.match(/^(.*?)(?:\s+(\d+[\w-]*))(?:\s+(.*))?$/);

  if (!match) {
    return {
      street: trimmed || "Sin calle",
      number: "S/N",
      complement: undefined,
    };
  }

  return {
    street: match[1]?.trim() || trimmed,
    number: match[2]?.trim() || "S/N",
    complement: match[3]?.trim() || undefined,
  };
}

function buildAddressPayload(order: Order): GetnetAddressPayload {
  const parsedAddress = parseStreetAddress(order.shippingAddress.address);
  const apartment = order.shippingAddress.apartment?.trim() || undefined;

  return {
    street: parsedAddress.street,
    number: parsedAddress.number,
    complement: [parsedAddress.complement, apartment].filter(Boolean).join(" ").trim() || undefined,
    city: order.shippingAddress.city,
    state: order.shippingAddress.province,
    country: "AR",
    postal_code: order.shippingAddress.postalCode,
  };
}

function buildPaymentIntentPayload(order: Order): GetnetPaymentIntentPayload {
  const billingAddress = buildAddressPayload(order);
  const { documentType, documentNumber } = extractCustomerDocument(order.customer.notes);

  return {
    order_id: order.orderNumber,
    mode: "instant",
    configurations: {
      "3ds": true,
      preauthorization: false,
      card_verification: false,
      success_url: env.getnetSuccessUrl || buildSiteUrl("/checkout/exito"),
      error_url: env.getnetErrorUrl || buildSiteUrl("/checkout/error"),
    },
    payment: {
      currency: "ARS",
      amount: toAmountInMinorUnits(order.total),
    },
    product: order.items.map((item) => ({
      product_type: "physical_goods",
      title: item.title,
      description: item.title,
      value: toAmountInMinorUnits(item.unitPrice),
      quantity: item.quantity,
    })),
    customer: compactObject({
      customer_id: order.id,
      name: `${order.customer.firstName} ${order.customer.lastName}`.trim(),
      first_name: order.customer.firstName,
      last_name: order.customer.lastName || order.customer.firstName,
      email: order.customer.email,
      phone_number: order.customer.phone,
      document_type: documentType,
      document_number: documentNumber,
      billing_address: billingAddress,
    }),
    shipping: {
      address: billingAddress,
    },
    pickup_store: false,
    shipping_method: getShippingMethodLabel(order.shippingMethod),
  };
}

export async function getGetnetAccessToken(forceRefresh = false): Promise<string> {
  ensureOauthConfig();

  if (!forceRefresh && isTokenUsable(cachedToken)) {
    return cachedToken!.accessToken;
  }

  logger.info("getnet.oauth.started", {
    baseUrl: getApiBaseUrl(),
    hasClientId: Boolean(env.getnetClientId),
  });

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: env.getnetClientId,
    client_secret: env.getnetClientSecret,
  });

  const { response, text } = await requestText(
    `${getApiBaseUrl()}/authentication/oauth2/access_token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body,
      cache: "no-store",
    },
  );
  const payload = parseJson<GetnetAccessTokenResponse>(text);

  if (!response.ok) {
    logger.error("getnet.oauth.failed", {
      status: response.status,
      payload: sanitizeForLog(payload),
      responseText: payload ? undefined : text,
    });
    throw new GetnetClientError(
      `No se pudo autenticar con Getnet. Status HTTP: ${response.status}.`,
      response.status,
    );
  }

  const accessToken = readString(payload?.access_token);
  const expiresIn = typeof payload?.expires_in === "number" ? payload.expires_in : 0;

  if (!accessToken) {
    logger.error("getnet.oauth.failed", {
      status: response.status,
      payload: sanitizeForLog(payload),
      reason: "missing_access_token",
    });
    throw new GetnetClientError("Getnet no devolvio access_token.");
  }

  const safeTtlSeconds = Math.max(0, expiresIn - GETNET_TOKEN_SAFETY_WINDOW_SECONDS);
  cachedToken = {
    accessToken,
    expiresAt: getNow() + safeTtlSeconds * 1000,
  };

  logger.info("getnet.oauth.succeeded", {
    status: response.status,
    tokenType: readString(payload?.token_type) || "Bearer",
    expiresIn,
    cachedForSeconds: safeTtlSeconds,
  });

  return accessToken;
}

export async function getGetnetSellers(): Promise<GetnetSeller[]> {
  ensureGetnetCheckoutConfig();
  const token = await getGetnetAccessToken();
  const response = await requestJson<GetnetSeller[]>(buildGetnetCheckoutUrl("/sellers"), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new GetnetClientError(
      `No se pudo consultar sellers de Getnet. Status HTTP: ${response.status}.`,
      response.status,
    );
  }

  return response.payload ?? [];
}

export async function getGetnetTechnicalConfigurations(): Promise<GetnetTechnicalConfigurations> {
  ensureGetnetCheckoutConfig();
  const token = await getGetnetAccessToken();
  const response = await requestJson<GetnetTechnicalConfigurations>(
    buildGetnetCheckoutUrl("/technical-configurations"),
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new GetnetClientError(
      `No se pudo consultar technical-configurations de Getnet. Status HTTP: ${response.status}.`,
      response.status,
    );
  }

  return response.payload ?? {};
}

export async function putGetnetTechnicalConfigurations() {
  ensureGetnetCheckoutConfig();
  const token = await getGetnetAccessToken();
  const payload = buildGetnetTechnicalConfigurationsPayload();
  const response = await requestJson<GetnetTechnicalConfigurations>(
    buildGetnetCheckoutUrl("/technical-configurations"),
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new GetnetClientError(
      `No se pudo actualizar technical-configurations de Getnet. Status HTTP: ${response.status}.`,
      response.status,
    );
  }

  return {
    request: payload,
    response: response.payload ?? {},
  };
}

export async function getGetnetBusinessConfigurations(): Promise<GetnetBusinessConfigurations> {
  ensureGetnetCheckoutConfig();
  const token = await getGetnetAccessToken();
  const response = await requestJson<GetnetBusinessConfigurations>(
    buildGetnetCheckoutUrl("/business-configurations"),
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new GetnetClientError(
      `No se pudo consultar business-configurations de Getnet. Status HTTP: ${response.status}.`,
      response.status,
    );
  }

  return response.payload ?? {};
}

export async function putGetnetBusinessConfigurations() {
  ensureGetnetCheckoutConfig();
  const token = await getGetnetAccessToken();
  const payload = buildGetnetBusinessConfigurationsPayload();
  const response = await requestJson<GetnetBusinessConfigurations>(
    buildGetnetCheckoutUrl("/business-configurations"),
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new GetnetClientError(
      `No se pudo actualizar business-configurations de Getnet. Status HTTP: ${response.status}.`,
      response.status,
    );
  }

  return {
    request: payload,
    response: response.payload ?? {},
  };
}

export function sanitizeGetnetValueForLog(value: unknown) {
  return sanitizeForLog(value);
}

export async function createGetnetPaymentIntent(order: Order): Promise<GetnetPaymentIntentResult> {
  ensurePaymentIntentConfig();

  const payload = buildPaymentIntentPayload(order);
  const token = await getGetnetAccessToken();

  logger.info("getnet.payment_intent.started", {
    orderId: order.id,
    orderNumber: order.orderNumber,
    total: order.total,
    amount: payload.payment.amount,
    currency: payload.payment.currency,
    itemCount: payload.product.length,
  });

  const { response, text } = await requestText(`${getWebCheckoutBaseUrl()}/payment-intent`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  const responsePayload = parseJson<GetnetPaymentIntentResponse>(text);

  logger.info("getnet.payment_intent.response", {
    orderId: order.id,
    orderNumber: order.orderNumber,
    status: response.status,
    requestPayload: sanitizeForLog(payload),
    responsePayload: sanitizeForLog(responsePayload),
    responseText: responsePayload ? undefined : text,
  });

  if (!response.ok) {
    logger.error("getnet.payment_intent.failed", {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: response.status,
    });
    throw new GetnetClientError(
      `No se pudo crear el payment intent de Getnet. Status HTTP: ${response.status}.`,
      response.status,
    );
  }

  const paymentIntentId = readString(responsePayload?.payment_intent_id);
  const redirectUrl = readString(responsePayload?.redirect_url);

  if (!paymentIntentId) {
    logger.error("getnet.payment_intent.failed", {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: response.status,
      reason: "missing_payment_intent_id",
    });
    throw new GetnetClientError("Getnet no devolvio payment_intent_id.", response.status);
  }

  if (!redirectUrl) {
    logger.error("getnet.payment_intent.failed", {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: response.status,
      reason: "missing_redirect_url",
      paymentIntentId,
    });
    throw new GetnetClientError("Getnet no devolvio redirect_url.", response.status);
  }

  logger.info("getnet.payment_intent.succeeded", {
    orderId: order.id,
    orderNumber: order.orderNumber,
    paymentIntentId,
    hasRedirectUrl: true,
  });

  return {
    paymentIntentId,
    redirectUrl,
    rawProviderStatus: "payment_intent_created",
    amount: payload.payment.amount,
    raw: responsePayload,
  };
}
