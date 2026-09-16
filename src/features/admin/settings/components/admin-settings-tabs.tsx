import Link from "next/link";
import { AdminNavIcon } from "@/features/admin/shell/admin-nav-icons";
import { TabStripBaseline, TabStripContent, TabStripIndicator } from "@/features/admin/shell/tab-strip";

export type AdminSettingsTabId = "general" | "preferencias" | "arca" | "integraciones";

type SettingsTab = { id: AdminSettingsTabId; label: string; iconId: string };

const settingsTabs: SettingsTab[] = [
  { id: "general", label: "General", iconId: "settings-general" },
  { id: "preferencias", label: "Preferencias", iconId: "settings-preferences" },
  { id: "arca", label: "ARCA", iconId: "settings-arca" },
  { id: "integraciones", label: "Integraciones", iconId: "settings-integrations" },
];

export const DEFAULT_SETTINGS_TAB: AdminSettingsTabId = "general";

export function resolveSettingsTab(value: string | undefined): AdminSettingsTabId {
  return settingsTabs.some((tab) => tab.id === value) ? (value as AdminSettingsTabId) : DEFAULT_SETTINGS_TAB;
}

/**
 * Same wiring as admin-analytics-tabs.tsx / admin-products-module-tabs.tsx
 * (TabStrip primitives + Link), except the four sections here are one page
 * reading `?tab=`, not separate routes — so `active` comes in as a prop from
 * the server page's own `searchParams` parse instead of `usePathname()`.
 * No client hook needed, so this stays a plain Server Component.
 */
export function AdminSettingsTabs({ active }: { active: AdminSettingsTabId }) {
  return (
    <nav aria-label="Navegación de configuración" className="relative">
      <div className="relative flex items-center gap-8 overflow-x-auto px-1">
        {settingsTabs.map((tab) => {
          const isActive = tab.id === active;

          return (
            <Link
              key={tab.id}
              href={`/admin/configuracion?tab=${tab.id}`}
              aria-current={isActive ? "page" : undefined}
              className="group relative flex h-11 shrink-0 items-center gap-2"
            >
              <TabStripContent
                active={isActive}
                icon={<AdminNavIcon itemId={tab.iconId} className="h-[15px] w-[15px]" />}
                label={tab.label}
                iconClassName="transition-colors duration-150"
              />
              {isActive && <TabStripIndicator layoutId="admin-settings-active-indicator" />}
            </Link>
          );
        })}
        <TabStripBaseline />
      </div>
    </nav>
  );
}
