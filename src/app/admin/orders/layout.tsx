import type { ReactNode } from "react";
import { requireAdminSession } from "@/features/admin/auth";
import { AdminModuleMobileMenu, AdminModuleSidebar } from "@/features/admin/navigation/admin-module-navigation";
import { adminOrdersSections } from "@/features/admin/navigation/admin-sections";
import { dashboardUi } from "@/features/admin/dashboard/lib/dashboard-ui";

export const dynamic = "force-dynamic";

export default async function AdminOrdersLayout({ children }: { children: ReactNode }) {
  await requireAdminSession();

  return (
    <div className={`${dashboardUi.pageOuter} overflow-x-clip`}>
      <div className="mx-auto w-full max-w-[1800px] px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-6">
        <div className={`${dashboardUi.shell} overflow-hidden`}>
          <div className={`grid ${dashboardUi.shellGrid}`}>
            <aside className="hidden min-w-0 bg-white lg:block lg:min-h-[calc(100vh-3rem)] lg:border-r">
              <AdminModuleSidebar
                moduleLabel="ÓRDENES"
                moduleTitle="Pedidos"
                moduleDescription="Listado, detalle y seguimiento de pedidos reales."
                homeHref="/admin"
                homeLabel="Panel principal"
                sections={adminOrdersSections}
              />
            </aside>

            <div className="min-w-0 bg-[#f6f7fb]">{children}</div>
          </div>
        </div>
      </div>

      <AdminModuleMobileMenu
        moduleLabel="ÓRDENES"
        moduleTitle="Pedidos"
        moduleDescription="Listado, detalle y seguimiento de pedidos reales."
        homeHref="/admin"
        homeLabel="Panel principal"
        sections={adminOrdersSections}
      />
    </div>
  );
}
