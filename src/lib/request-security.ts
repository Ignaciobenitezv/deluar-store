import { env } from "@/lib/env";

function getRequestOrigin(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function isSameOriginRequest(request: Request) {
  let expectedOrigin: string | null = null;

  try {
    expectedOrigin = new URL(env.siteUrl).origin;
  } catch {
    expectedOrigin = null;
  }

  if (!expectedOrigin) {
    return true;
  }

  const originHeader = request.headers.get("origin");
  if (originHeader) {
    return originHeader === expectedOrigin;
  }

  const refererHeader = request.headers.get("referer");
  if (refererHeader) {
    return getRequestOrigin(refererHeader) === expectedOrigin;
  }

  return true;
}
