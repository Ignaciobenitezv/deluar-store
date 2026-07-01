import { env } from "@/lib/env";

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

export async function createUnicobrosCheckoutRequest() {
  throw new UnicobrosClientError("Unicobros checkout is not implemented yet.");
}

export { UnicobrosClientError };
