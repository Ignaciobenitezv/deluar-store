"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Tooltip } from "@/components/admin/ui/tooltip";
import { cn } from "@/lib/utils";
import { adminNavSections, resolveActiveNavItemId } from "./admin-nav-config";
import { AdminNavIcon, DeluarMark, IconChevronLeft, IconChevronRight, IconGear, IconLogout, IconSearch } from "./admin-nav-icons";

const actionButtonBase =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";
const actionButtonNeutral = "border-border bg-surface text-text-secondary hover:bg-surface-elevated hover:text-text-primary";
const actionButtonActive = "border-primary/30 bg-primary-soft text-primary hover:bg-primary-soft hover:text-primary";

const SETTINGS_HREF = "/admin/configuracion";

const SIDEBAR_STORAGE_KEY = "deluar-admin-sidebar";

function toggleSidebarCollapsed() {
  const root = document.documentElement;
  const collapsed = root.dataset.adminSidebar === "collapsed";
  if (collapsed) {
    delete root.dataset.adminSidebar;
  } else {
    root.dataset.adminSidebar = "collapsed";
  }
  try {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, collapsed ? "expanded" : "collapsed");
  } catch {
    // Private mode or storage disabled — collapse still applies for this session.
  }
}

export function AdminSidebar() {
  const pathname = usePathname();
  const activeId = resolveActiveNavItemId(pathname);
  const isSettingsActive = pathname === SETTINGS_HREF || pathname.startsWith(`${SETTINGS_HREF}/`);

  return (
    <aside
      className="hidden shrink-0 border-r border-border bg-background transition-[width] duration-200 lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col"
      style={{ width: "var(--admin-sidebar-w)" }}
    >
      <nav aria-label="Navegación principal" className="flex h-full flex-col overflow-hidden">
        {/* Brand */}
        <div className="admin-sidebar-brand-row flex h-14 shrink-0 items-center gap-2.5 px-4">
          <DeluarMark />
          <span className="admin-sidebar-wordmark truncate text-[13px] font-semibold tracking-[-0.01em] text-text-primary">
            Deluar
          </span>
        </div>

        {/* Search */}
        <div className="admin-sidebar-search shrink-0 px-3 pb-3">
          <form
            action="/admin/orders"
            method="get"
            className="flex h-8 items-center gap-2 rounded-xl border border-border bg-surface px-2.5 text-text-secondary transition-colors focus-within:border-primary/40"
          >
            <IconSearch className="h-[13px] w-[13px] shrink-0" />
            <input
              type="search"
              name="q"
              placeholder="Buscar…"
              aria-label="Buscar órdenes"
              className="min-w-0 flex-1 bg-transparent text-[12.5px] text-text-primary outline-none placeholder:text-text-secondary"
            />
            <kbd className="hidden shrink-0 rounded border border-border px-1 text-[9px] font-medium text-text-secondary sm:block">
              ⌘K
            </kbd>
          </form>
        </div>

        {/* Navigation */}
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-1">
          {adminNavSections.map((section) => (
            <section key={section.label} className="mb-4">
              <p className="admin-sidebar-section-label mb-1 px-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-secondary">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const active = item.id === activeId;
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      title={item.label}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "admin-sidebar-item flex h-9 items-center gap-2.5 rounded-xl px-2.5 text-[13px] leading-none transition-colors duration-150",
                        active
                          ? "bg-primary font-medium text-primary-foreground"
                          : "text-text-secondary hover:bg-surface hover:text-text-primary",
                      )}
                    >
                      <AdminNavIcon itemId={item.id} className={active ? "text-primary-foreground" : "text-text-secondary"} />
                      <span className="admin-sidebar-label min-w-0 truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {/* Footer actions — icon-only, no dropdown, no visible labels; see
            admin-sidebar-actions collapse rule in admin-theme.css for how
            this row goes from horizontal to stacked when the sidebar
            collapses (3 fixed-size squares don't fit the collapsed width). */}
        <div className="admin-sidebar-actions flex shrink-0 items-center justify-center gap-2 border-t border-border px-3 py-3">
          <Tooltip label="Colapsar menú">
            <button
              type="button"
              onClick={toggleSidebarCollapsed}
              aria-label="Colapsar menú"
              className={cn(actionButtonBase, actionButtonNeutral)}
            >
              <IconChevronLeft className="admin-sidebar-collapse-icon h-[17px] w-[17px]" />
              <IconChevronRight className="admin-sidebar-expand-icon h-[17px] w-[17px]" />
            </button>
          </Tooltip>

          <Tooltip label="Configuración">
            <Link
              href={SETTINGS_HREF}
              aria-label="Configuración"
              aria-current={isSettingsActive ? "page" : undefined}
              className={cn(actionButtonBase, isSettingsActive ? actionButtonActive : actionButtonNeutral)}
            >
              <IconGear className="h-[17px] w-[17px]" />
            </Link>
          </Tooltip>

          <Tooltip label="Cerrar sesión">
            <form action="/api/admin/logout" method="post">
              <button type="submit" aria-label="Cerrar sesión" className={cn(actionButtonBase, actionButtonNeutral)}>
                <IconLogout className="h-[17px] w-[17px]" />
              </button>
            </form>
          </Tooltip>
        </div>
      </nav>
    </aside>
  );
}
