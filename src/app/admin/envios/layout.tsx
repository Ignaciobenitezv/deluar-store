import type { ReactNode } from "react";
import { requireAdminSession } from "@/features/admin/auth";
import { AdminModuleMobileMenu, AdminModuleSidebar } from "@/features/admin/navigation/admin-module-navigation";
import { adminShipmentsSections } from "@/features/admin/navigation/admin-sections";
import { dashboardUi } from "@/features/admin/dashboard/lib/dashboard-ui";
import { traceAsync } from "@/lib/perf-trace";

export const dynamic = "force-dynamic";

export default async function AdminShipmentsLayout({ children }: { children: ReactNode }) {
  await traceAsync("admin.envios", "auth", async () => {
    await requireAdminSession();
  });

  return (
    <div className={`${dashboardUi.pageOuter} overflow-x-clip`}>
      <div className="mx-auto w-full max-w-[1800px] px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-6">
        <div className="min-w-0 lg:overflow-hidden lg:rounded-[24px] lg:border lg:border-slate-200/50 lg:bg-white lg:shadow-[0_10px_22px_rgba(15,23,42,0.03)]">
          <div className={`grid ${dashboardUi.shellGrid}`}>
            <aside className="hidden min-w-0 bg-white lg:block lg:min-h-[calc(100vh-3rem)] lg:border-r">
              <AdminModuleSidebar
                moduleLabel="OPERACIÓN"
                moduleTitle="Envíos y etiquetas"
                moduleDescription="Preparación de despachos y exportación Andreani."
                homeHref="/admin"
                homeLabel="Panel principal"
                sections={adminShipmentsSections}
              />
            </aside>

            <div className="min-w-0 bg-[#f6f7fb]">{children}</div>
          </div>
        </div>
      </div>

      <AdminModuleMobileMenu
        moduleLabel="OPERACIÓN"
        moduleTitle="Envíos y etiquetas"
        moduleDescription="Preparación de despachos y exportación Andreani."
        homeHref="/admin"
        homeLabel="Panel principal"
        sections={adminShipmentsSections}
      />
    </div>
  );
}
