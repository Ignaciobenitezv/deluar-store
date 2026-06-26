"use server";

import { redirect } from "next/navigation";
import { createAdminSession, clearAdminSession } from "@/features/admin/auth";
import { env } from "@/lib/env";

export async function loginAdminAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");

  if (!env.adminSecret || password !== env.adminSecret) {
    redirect("/admin/login?error=1");
  }

  await createAdminSession();
  redirect("/admin/orders");
}

export async function logoutAdminAction() {
  await clearAdminSession();
  redirect("/admin/login");
}
