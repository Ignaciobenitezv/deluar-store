"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isBetterAuthAdminRole, signOutBetterAuthSession } from "@/features/admin/better-auth";
import { auth } from "@/lib/auth";

export async function loginAdminAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/admin/login?error=1");
  }

  const requestHeaders = await headers();

  try {
    const { user } = await auth.api.signInEmail({
      body: {
        email,
        password,
        rememberMe: true,
      },
      headers: requestHeaders,
    });

    if (!isBetterAuthAdminRole(user.role)) {
      await signOutBetterAuthSession(requestHeaders);
      redirect("/admin/login?error=1");
    }

    redirect("/admin");
  } catch {
    redirect("/admin/login?error=1");
  }
}
