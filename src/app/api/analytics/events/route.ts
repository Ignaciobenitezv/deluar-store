import { NextResponse } from "next/server";
import {
  ANALYTICS_SESSION_COOKIE_MAX_AGE_SECONDS,
  ANALYTICS_SESSION_COOKIE_NAME,
  ANALYTICS_VISITOR_COOKIE_MAX_AGE_SECONDS,
  ANALYTICS_VISITOR_COOKIE_NAME,
} from "@/features/analytics/shared";
import { ingestAnalyticsPayload } from "@/features/analytics/server/ingest-event";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const result = await ingestAnalyticsPayload(request);

  if ("status" in result) {
    return result;
  }

  const response = NextResponse.json({ ok: true });

  response.cookies.set(ANALYTICS_VISITOR_COOKIE_NAME, result.visitorId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ANALYTICS_VISITOR_COOKIE_MAX_AGE_SECONDS,
  });
  response.cookies.set(ANALYTICS_SESSION_COOKIE_NAME, result.sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ANALYTICS_SESSION_COOKIE_MAX_AGE_SECONDS,
  });

  return response;
}
