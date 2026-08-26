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

export type UnicobrosOperationSnapshot = {
  checkoutUid?: string;
  paymentId?: string;
  reference?: string;
  statusCode?: number;
  statusText?: string;
  statusMessage?: string;
  total?: number;
  currencyCode?: string;
  transactionId?: string;
  rawResponse: unknown;
};

function getBaseUrl() {
  return env.unicobrosBaseUrl.replace(/\/+$/, "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function buildUrl(path: string) {
  return `${getBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

function hasOperationShape(value: unknown) {
  if (!isRecord(value)) {
    return false;
  }

  const payment = isRecord(value.payment) ? value.payment : undefined;
  const checkout = isRecord(value.checkout) ? value.checkout : undefined;

  if (payment || checkout) {
    return true;
  }

  return isRecord(value.data) && (isRecord(value.data.payment) || isRecord(value.data.checkout));
}

function extractOperationRoot(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value)) {
    return null;
  }

  if (hasOperationShape(value)) {
    return value;
  }

  if (isRecord(value.data) && hasOperationShape(value.data)) {
    return value.data;
  }

  return null;
}

function extractOperationSnapshot(value: unknown): UnicobrosOperationSnapshot | null {
  const root = extractOperationRoot(value);

  if (!root) {
    return null;
  }

  const payment = isRecord(root.payment) ? root.payment : isRecord(root.data) ? root.data : null;
  const checkout = isRecord(root.checkout) ? root.checkout : isRecord(root.data) ? root.data : null;

  const paymentObject = payment && isRecord(payment.payment) ? payment.payment : payment;
  const checkoutObject = checkout && isRecord(checkout.checkout) ? checkout.checkout : checkout;

  const paymentStatus = isRecord(paymentObject?.status) ? paymentObject.status : undefined;
  const paymentCurrency = isRecord(paymentObject?.currency) ? paymentObject.currency : undefined;
  const paymentSource = isRecord(paymentObject?.source) ? paymentObject.source : undefined;
  const paymentTransaction =
    isRecord(paymentSource?.transaction) ? paymentSource.transaction : undefined;

  return {
    checkoutUid: readString(
      isRecord(checkoutObject) ? checkoutObject.uid : undefined,
    ),
    paymentId: readString(isRecord(paymentObject) ? paymentObject.id : undefined),
    reference: readString(isRecord(paymentObject) ? paymentObject.reference : undefined),
    statusCode: readNumber(isRecord(paymentStatus) ? paymentStatus.code : undefined),
    statusText: readString(isRecord(paymentStatus) ? paymentStatus.text : undefined),
    statusMessage: readString(isRecord(paymentStatus) ? paymentStatus.message : undefined),
    total: readNumber(isRecord(paymentObject) ? paymentObject.total : undefined),
    currencyCode: readString(isRecord(paymentCurrency) ? paymentCurrency.code : undefined),
    transactionId: readString(
      isRecord(paymentTransaction) ? paymentTransaction.transactionId : undefined,
    ),
    rawResponse: value,
  };
}

function collectOperationSnapshots(
  value: unknown,
  snapshots: UnicobrosOperationSnapshot[] = [],
  seen = new Set<unknown>(),
) {
  if (seen.has(value)) {
    return snapshots;
  }

  if (Array.isArray(value)) {
    seen.add(value);
    for (const item of value) {
      collectOperationSnapshots(item, snapshots, seen);
    }

    return snapshots;
  }

  if (!isRecord(value)) {
    return snapshots;
  }

  seen.add(value);

  const snapshot = extractOperationSnapshot(value);

  if (snapshot) {
    snapshots.push(snapshot);
  }

  for (const nestedValue of Object.values(value)) {
    collectOperationSnapshots(nestedValue, snapshots, seen);
  }

  return snapshots;
}

function isEqualReference(left: string | undefined, right: string) {
  return left?.trim() === right.trim();
}

function normalizeCurrency(value: string | undefined) {
  return value?.trim().toUpperCase() ?? "";
}

function approxEqual(left: number | undefined, right: number) {
  if (typeof left !== "number" || !Number.isFinite(left)) {
    return false;
  }

  return Math.abs(left - right) < 0.01;
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

async function requestJson<T>(path: string, input: RequestInit & { body?: string } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(buildUrl(path), {
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

function extractCheckoutUrl(payload: unknown) {
  if (!isRecord(payload)) {
    return "";
  }

  const candidates = [isRecord(payload.data) ? payload.data.url : undefined];

  for (const candidate of candidates) {
    const value = readString(candidate);

    if (value) {
      return value;
    }
  }

  return "";
}

function extractProviderPaymentId(payload: unknown) {
  if (!isRecord(payload) || !isRecord(payload.data)) {
    return "";
  }

  const candidates = [payload.data.id];

  for (const candidate of candidates) {
    const value = readString(candidate);

    if (value) {
      return value;
    }
  }

  return "";
}

export async function createUnicobrosCheckout(
  input: UnicobrosCreateCheckoutRequest,
): Promise<{
  checkoutUrl: string;
  providerPaymentId: string;
  rawProviderStatus: string;
  rawResponse: unknown;
}> {
  const { ok, status, payload, text } = await requestJson<UnicobrosCreateCheckoutResponse>(
    "/p/checkout",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  const checkoutUrl = extractCheckoutUrl(payload);
  const providerPaymentId = extractProviderPaymentId(payload);

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

  if (!providerPaymentId) {
    throw new UnicobrosClientError(
      `Unicobros respondio sin id de operacion. Status HTTP: ${status}.`,
      status,
    );
  }

  return {
    checkoutUrl,
    providerPaymentId,
    rawProviderStatus: "created",
    rawResponse: payload ?? text,
  };
}

export async function getUnicobrosOperationByUid(uid: string) {
  const normalizedUid = uid.trim();

  if (!normalizedUid) {
    throw new UnicobrosClientError("Falta el UID de la operacion de Unicobros.");
  }

  const { ok, status, payload, text } = await requestJson<unknown>(
    `/p/operations/${encodeURIComponent(normalizedUid)}`,
    {
      method: "GET",
    },
  );

  if (!ok) {
    throw new UnicobrosClientError(
      `No se pudo consultar la operacion de Unicobros. Status HTTP: ${status}.`,
      status,
    );
  }

  const snapshot = extractOperationSnapshot(payload ?? text);

  if (!snapshot) {
    throw new UnicobrosClientError(
      `Unicobros respondio sin datos de operacion validos. Status HTTP: ${status}.`,
      status,
    );
  }

  return snapshot;
}

export async function searchUnicobrosOperationsByReference(reference: string) {
  const normalizedReference = reference.trim();

  if (!normalizedReference) {
    return [];
  }

  const searchParams = new URLSearchParams({
    page: "1",
    limit: "20",
    reference: normalizedReference,
  });

  const { ok, status, payload, text } = await requestJson<unknown>(
    `/p/entity/operations?${searchParams.toString()}`,
    {
      method: "GET",
    },
  );

  if (!ok) {
    throw new UnicobrosClientError(
      `No se pudo consultar las operaciones de Unicobros por referencia. Status HTTP: ${status}.`,
      status,
    );
  }

  const snapshots = collectOperationSnapshots(payload ?? text);

  return snapshots.filter((snapshot) =>
    isEqualReference(snapshot.reference, normalizedReference),
  );
}

export function isApprovedUnicobrosSnapshot(snapshot: UnicobrosOperationSnapshot) {
  return snapshot.statusCode === 200;
}

export function validateUnicobrosOperationAgainstOrder(params: {
  snapshot: UnicobrosOperationSnapshot;
  reference: string;
  total: number;
  currency: string;
}) {
  const reference = params.reference.trim();
  const currency = normalizeCurrency(params.currency);
  const snapshotCurrency = normalizeCurrency(params.snapshot.currencyCode);

  if (!isApprovedUnicobrosSnapshot(params.snapshot)) {
    return {
      ok: false,
      reason: "operation_not_approved" as const,
    };
  }

  if (!isEqualReference(params.snapshot.reference, reference)) {
    return {
      ok: false,
      reason: "reference_mismatch" as const,
    };
  }

  if (!approxEqual(params.snapshot.total, params.total)) {
    return {
      ok: false,
      reason: "total_mismatch" as const,
    };
  }

  if (snapshotCurrency !== currency) {
    return {
      ok: false,
      reason: "currency_mismatch" as const,
    };
  }

  return {
    ok: true,
    reason: "ok" as const,
  };
}

export { UnicobrosClientError };
