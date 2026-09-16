import type { ReactNode } from "react";
import { AdminSettingsTabs, type AdminSettingsTabId } from "./admin-settings-tabs";

type AdminSettingsShellProps = {
  active: AdminSettingsTabId;
  children: ReactNode;
};

/** Same outer shell shape as AdminProductsShell: max-width container, page
 * header, then the tab bar, then the section content. */
export function AdminSettingsShell({ active, children }: AdminSettingsShellProps) {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-[1800px] px-3 pt-3 pb-[calc(4rem+env(safe-area-inset-bottom))] sm:px-4 sm:py-4 lg:px-6 lg:py-6">
        <div className="space-y-3 sm:space-y-4">
          <div className="grid gap-1">
            <h1 className="text-[1.25rem] font-semibold tracking-[-0.015em] text-text-primary sm:text-[1.5rem]">
              Configuración
            </h1>
            <p className="text-[12.5px] text-text-secondary">Gestioná los datos y preferencias de la tienda.</p>
          </div>

          <AdminSettingsTabs active={active} />

          <div className="space-y-3 sm:space-y-4">{children}</div>
        </div>
      </div>
    </main>
  );
}
