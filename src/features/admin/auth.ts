import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "@/lib/env";

export const ADMIN_SESSION_COOKIE_NAME = "deluar_admin_session";

function getAdminSessionCookieValue() {
  if (!env.adminSecret) {
    return null;
  }

  return crypto.createHash("sha256").update(env.adminSecret).digest("hex");
}

function getAdminSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 12,
  };
}

export async function hasAdminSession() {
  const expectedValue = getAdminSessionCookieValue();
  if (!expectedValue) {
    return false;
  }

  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value ?? "";

  return Boolean(session && session === expectedValue);
}

export async function requireAdminSession() {
  const authorized = await hasAdminSession();

  if (!authorized) {
    redirect("/admin/login");
  }
}

export async function createAdminSession() {
  const expectedValue = getAdminSessionCookieValue();
  if (!expectedValue) {
    throw new Error("ADMIN_SECRET no esta configurado.");
  }

  const cookieStore = await cookies();

  cookieStore.set(
    ADMIN_SESSION_COOKIE_NAME,
    expectedValue,
    getAdminSessionCookieOptions(),
  );
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE_NAME, "", {
    ...getAdminSessionCookieOptions(),
    maxAge: 0,
    expires: new Date(0),
  });
}
