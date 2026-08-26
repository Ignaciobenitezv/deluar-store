import { requireBetterAuthAdmin } from "@/features/admin/better-auth";

export async function requireAdminSession(headerValue?: Headers) {
  return requireBetterAuthAdmin(headerValue);
}
