import { betterAuth } from "better-auth/minimal";
import { nextCookies } from "better-auth/next-js";
import { admin as adminPlugin } from "better-auth/plugins";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { authAccessControl, authRoles } from "@/lib/auth-roles";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";

if (!env.betterAuthSecret || !env.betterAuthUrl) {
  throw new Error("BETTER_AUTH_SECRET y BETTER_AUTH_URL son obligatorios.");
}

export const auth = betterAuth({
  secret: env.betterAuthSecret,
  baseURL: env.betterAuthUrl,
  trustedOrigins: [env.betterAuthUrl],
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },
  advanced: {
    database: {
      joins: true,
      generateId: "uuid",
    },
  },
  plugins: [
    adminPlugin({
      ac: authAccessControl,
      roles: authRoles,
    }),
    nextCookies(),
  ],
});
