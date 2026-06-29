import type { ReactNode } from "react";
import { requireAdminSession } from "@/features/admin/auth";

export const dynamic = "force-dynamic";

export default async function AdminDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireAdminSession();

  return children;
}
