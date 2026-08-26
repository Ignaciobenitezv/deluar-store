import type { ReactNode } from "react";
import { requireAdminSession } from "@/features/admin/auth";
import { AdminModuleMobileMenu, AdminModuleSidebar } from "@/features/admin/navigation/admin-module-navigation";
import { adminAnalyticsSections } from "@/features/admin/navigation/admin-sections";
import { dashboardUi } from "@/features/admin/dashboard/lib/dashboard-ui";

export const dynamic = "force-dynamic";

export default async function AdminDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireAdminSession();

  return (
    <div className={dashboardUi.pageOuter}>
      <div className="mx-auto flex w-full min-w-0 max-w-[1800px] px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-6">
        <div className={`${dashboardUi.shell} flex min-w-0 flex-1 overflow-visible`}>
          <aside className="hidden min-w-0 shrink-0 bg-white lg:block lg:w-[17rem] lg:min-h-[calc(100vh-3rem)] lg:border-r">
            <AdminModuleSidebar
              moduleLabel="ANÁLISIS"
              moduleTitle="Estadísticas"
              moduleDescription="Lecturas ejecutivas, rendimiento y vistas analíticas del ecommerce."
              homeHref="/admin"
              homeLabel="Panel principal"
              sections={adminAnalyticsSections}
            />
          </aside>

          <div className="min-w-0 flex-1 bg-[#f6f7fb]">{children}</div>
        </div>
      </div>

      <AdminModuleMobileMenu
        moduleLabel="ANÁLISIS"
        moduleTitle="Estadísticas"
        moduleDescription="Lecturas ejecutivas, rendimiento y vistas analíticas del ecommerce."
        homeHref="/admin"
        homeLabel="Panel principal"
        sections={adminAnalyticsSections}
      />
    </div>
  );
}
