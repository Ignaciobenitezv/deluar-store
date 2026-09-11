import type { ReactNode } from "react";
import { requireAdminSession } from "@/features/admin/auth";
import { AdminModuleMobileMenu, AdminModuleSidebar } from "@/features/admin/navigation/admin-module-navigation";
import { adminAnalyticsSections } from "@/features/admin/navigation/admin-sections";

export const dynamic = "force-dynamic";

export default async function AdminDashboardLayout({ children }: { children: ReactNode }) {
  const session = await requireAdminSession();
  const rawName = (session.user as { name?: string | null }).name?.trim() ?? "";
  const userName = rawName.split(/\s+/).filter(Boolean)[0] ?? "";

  return (
    <div className="min-h-screen bg-[#f4f3f0] text-foreground">
      <div className="mx-auto flex min-h-screen w-full min-w-0 max-w-[1800px]">
        <aside className="hidden min-w-0 shrink-0 border-r border-slate-200/50 bg-[#faf9f7] lg:flex lg:w-[14.5rem] lg:flex-col">
          <AdminModuleSidebar
            moduleLabel="ANÁLISIS"
            moduleTitle="Estadísticas"
            moduleDescription="Resumen, conversiones y operación del ecommerce."
            homeHref="/admin"
            homeLabel="Panel principal"
            sections={adminAnalyticsSections}
            userName={userName}
          />
        </aside>
        <div className="min-w-0 flex-1 bg-[#f4f3f0]">{children}</div>
      </div>

      <AdminModuleMobileMenu
        moduleLabel="ANÁLISIS"
        moduleTitle="Estadísticas"
        moduleDescription="Resumen, conversiones y operación del ecommerce."
        homeHref="/admin"
        homeLabel="Panel principal"
        sections={adminAnalyticsSections}
      />
    </div>
  );
}
