import type { ReactNode } from "react";
import { requireAdminSession } from "@/features/admin/auth";
import { AdminModuleMobileMenu, AdminModuleSidebar } from "@/features/admin/navigation/admin-module-navigation";
import { adminProductsSections } from "@/features/admin/navigation/admin-sections";
import { dashboardUi } from "@/features/admin/dashboard/lib/dashboard-ui";

export const dynamic = "force-dynamic";

export default async function AdminProductsLayout({ children }: { children: ReactNode }) {
  await requireAdminSession();

  return (
    <div className={dashboardUi.pageOuter}>
      <div className="mx-auto w-full max-w-[1800px] px-0 py-0 sm:px-4 sm:py-4 lg:px-6 lg:py-6">
        <div className="overflow-visible lg:rounded-[30px] lg:border lg:border-slate-200/50 lg:bg-white lg:shadow-[0_12px_28px_rgba(15,23,42,0.035)]">
          <div className="grid gap-0 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-4">
            <aside className="hidden min-w-0 bg-white lg:block lg:min-h-[calc(100vh-3rem)] lg:border-r">
              <AdminModuleSidebar
                moduleLabel="CATÁLOGO"
                moduleTitle="Productos"
                moduleDescription="Gestión del catálogo, visibilidad, imágenes, stock y variantes."
                homeHref="/admin"
                homeLabel="Panel principal"
                sections={adminProductsSections}
              />
            </aside>

            <div className="min-w-0 bg-[#f6f7fb]">{children}</div>
          </div>
        </div>
      </div>

      <AdminModuleMobileMenu
        moduleLabel="CATÁLOGO"
        moduleTitle="Productos"
        moduleDescription="Gestión del catálogo, visibilidad, imágenes, stock y variantes."
        homeHref="/admin"
        homeLabel="Panel principal"
        sections={adminProductsSections}
      />
    </div>
  );
}
