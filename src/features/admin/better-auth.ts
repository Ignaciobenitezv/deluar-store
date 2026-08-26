import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  AUTH_ROLES,
  BETTER_AUTH_ADMIN_ROLES,
  BETTER_AUTH_EDITOR_ROLES,
  normalizeBetterAuthRoles,
} from "@/lib/auth-roles";

export type BetterAuthSession = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

function hasAllowedRole(role: string | string[] | null | undefined, allowedRoles: readonly string[]) {
  const normalizedRoles = normalizeBetterAuthRoles(role);

  return normalizedRoles.some((value: string) => allowedRoles.includes(value));
}

export async function getBetterAuthSession(headerValue?: Headers) {
  return auth.api.getSession({
    headers: headerValue ?? (await headers()),
  });
}

export async function hasBetterAuthAdminSession(headerValue?: Headers) {
  const session = await getBetterAuthSession(headerValue);

  return Boolean(session && hasAllowedRole(session.user.role, BETTER_AUTH_ADMIN_ROLES));
}

export async function requireBetterAuthAdmin(headerValue?: Headers) {
  const session = await getBetterAuthSession(headerValue);

  if (!session || !hasAllowedRole(session.user.role, BETTER_AUTH_ADMIN_ROLES)) {
    redirect("/admin/login");
  }

  return session;
}

export async function requireBetterAuthEditor(headerValue?: Headers) {
  const session = await getBetterAuthSession(headerValue);

  if (!session || !hasAllowedRole(session.user.role, BETTER_AUTH_EDITOR_ROLES)) {
    redirect("/admin/login");
  }

  return session;
}

export function isBetterAuthAdminRole(role: string | string[] | null | undefined) {
  return hasAllowedRole(role, BETTER_AUTH_ADMIN_ROLES);
}

export function isBetterAuthEditorRole(role: string | string[] | null | undefined) {
  return hasAllowedRole(role, BETTER_AUTH_EDITOR_ROLES);
}

export async function signOutBetterAuthSession(headerValue?: Headers) {
  const requestHeaders = headerValue ?? (await headers());

  try {
    await auth.api.signOut({
      headers: requestHeaders,
    });
  } catch {
    // Best-effort cleanup during the auth migration.
  }
}

export { AUTH_ROLES };
