import type { ReactNode } from "react";
import { requireAdminSession } from "@/features/admin/auth";
import { AdminSidebar } from "@/features/admin/shell/admin-sidebar";
import { AdminHeader } from "@/features/admin/shell/admin-header";
import { AdminBottomNav } from "@/features/admin/shell/admin-bottom-nav";
import { formatAdminDateLabel } from "@/features/admin/shell/admin-date";
import "../admin-theme.css";

export const dynamic = "force-dynamic";

function getFirstName(name?: string | null) {
  return name?.trim().split(/\s+/).filter(Boolean)[0] ?? "";
}

export default async function AdminShellLayout({ children }: { children: ReactNode }) {
  const session = await requireAdminSession();
  const userName = getFirstName((session.user as { name?: string | null }).name);
  const dateLabel = formatAdminDateLabel(new Date());

  return (
    <div className="admin-root flex min-h-screen bg-background text-text-primary">
      <AdminSidebar />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <AdminHeader userName={userName} dateLabel={dateLabel} />
        <main className="min-w-0 flex-1 pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-0">{children}</main>
      </div>
      <AdminBottomNav />
    </div>
  );
}
