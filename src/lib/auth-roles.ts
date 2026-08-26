import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access";

export const AUTH_ROLES = {
  OWNER: "owner",
  ADMIN: "admin",
  EDITOR: "editor",
  USER: "user",
} as const;

const statement = {
  ...defaultStatements,
} as const;

const ac = createAccessControl(statement);

export const authAccessControl = ac;

export const authRoles = {
  owner: ac.newRole({
    ...adminAc.statements,
  }),
  admin: ac.newRole({
    ...adminAc.statements,
  }),
  editor: ac.newRole({}),
  user: ac.newRole({}),
} as const;

export const BETTER_AUTH_ADMIN_ROLES = [AUTH_ROLES.OWNER, AUTH_ROLES.ADMIN] as const;
export const BETTER_AUTH_EDITOR_ROLES = [AUTH_ROLES.OWNER, AUTH_ROLES.ADMIN, AUTH_ROLES.EDITOR] as const;

export function normalizeBetterAuthRoles(role: string | string[] | null | undefined): string[] {
  if (!role) {
    return [];
  }

  if (Array.isArray(role)) {
    return role.flatMap((value) => normalizeBetterAuthRoles(value));
  }

  return role
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}
