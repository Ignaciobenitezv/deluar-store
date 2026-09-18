"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { resolveActiveNavItemId } from "./admin-nav-config";
import { IconBarChart, IconBox, IconHome, IconMenu, IconPlus } from "./admin-nav-icons";
import { AdminMobileMenuSheet } from "./admin-mobile-menu-sheet";

const SETTINGS_HREF = "/admin/configuracion";
const CREATE_PRODUCT_HREF = "/admin/productos/nuevo";

// Routes that only ever surface inside the "Menú" sheet, never as their own
// bottom-bar item — used purely to compute Menú's active state from the
// same resolveActiveNavItemId the sidebar and sheet already use, so this
// never drifts into a parallel/duplicated notion of "what's active".
const MENU_ONLY_IDS = new Set(["orders-list", "shipments-list", "payments", "shipping-analytics", "location"]);

const itemClass =
  "flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-1.5 transition-transform duration-150 active:scale-95";

function ItemIcon({ active, children }: { active: boolean; children: React.ReactNode }) {
  return <span className={cn("transition-colors duration-150", active ? "text-primary" : "text-text-secondary")}>{children}</span>;
}

function ItemLabel({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <span className={cn("text-[10px] font-medium transition-colors duration-150", active ? "text-primary" : "text-text-secondary")}>
      {children}
    </span>
  );
}

/**
 * Mobile-only (`lg:hidden`) bottom navigation — replaces the old hamburger +
 * left-sliding drawer entirely. Mounted once in the shell layout (a Server
 * Component) so it never unmounts between page navigations; only this
 * island is a Client Component. Active state is derived exclusively from
 * `resolveActiveNavItemId` (admin-nav-config.ts), the same single source of
 * truth the desktop sidebar uses — no parallel active-state logic.
 */
export function AdminBottomNav() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Close the sheet on navigation (e.g. browser back/forward) — adjusted
  // during render rather than in an effect, same pattern the old drawer
  // used, so it never costs an extra render pass. Each link inside the
  // sheet also closes it directly on click; this is the fallback.
  const [openedAtPathname, setOpenedAtPathname] = useState(pathname);
  if (pathname !== openedAtPathname) {
    setOpenedAtPathname(pathname);
    if (isMenuOpen) setIsMenuOpen(false);
  }

  const activeId = resolveActiveNavItemId(pathname);
  const isSettingsActive = pathname === SETTINGS_HREF || pathname.startsWith(`${SETTINGS_HREF}/`);
  const isHomeActive = activeId === "home";
  const isProductsActive = activeId === "products-list";
  const isStatsActive = activeId === "overview";
  const isMenuRouteActive = isSettingsActive || (activeId ? MENU_ONLY_IDS.has(activeId) : false);
  const isMenuActive = isMenuOpen || isMenuRouteActive;

  return (
    <>
      <div className="fixed inset-x-0 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-4 lg:hidden">
        <div className="relative w-full max-w-sm">
          <div className="grid grid-cols-5 items-center gap-1 rounded-[28px] border border-border bg-surface px-2 py-2 shadow-[var(--admin-shadow-md)]">
            <Link href="/admin" aria-current={isHomeActive ? "page" : undefined} className={itemClass}>
              <ItemIcon active={isHomeActive}>
                <IconHome className="h-[22px] w-[22px]" />
              </ItemIcon>
              <ItemLabel active={isHomeActive}>Inicio</ItemLabel>
            </Link>

            <Link href="/admin/productos" aria-current={isProductsActive ? "page" : undefined} className={itemClass}>
              <ItemIcon active={isProductsActive}>
                <IconBox className="h-[22px] w-[22px]" />
              </ItemIcon>
              <ItemLabel active={isProductsActive}>Productos</ItemLabel>
            </Link>

            {/* Spacer — the central action button is absolutely positioned
                relative to the outer wrapper, straddling this bar's top edge. */}
            <div aria-hidden="true" />

            <Link href="/admin/dashboard" aria-current={isStatsActive ? "page" : undefined} className={itemClass}>
              <ItemIcon active={isStatsActive}>
                <IconBarChart className="h-[22px] w-[22px]" />
              </ItemIcon>
              <ItemLabel active={isStatsActive}>Estadísticas</ItemLabel>
            </Link>

            <button
              type="button"
              onClick={() => setIsMenuOpen((value) => !value)}
              aria-label="Menú"
              aria-expanded={isMenuOpen}
              className={itemClass}
            >
              <ItemIcon active={isMenuActive}>
                <IconMenu className="h-[22px] w-[22px]" />
              </ItemIcon>
              <ItemLabel active={isMenuActive}>Menú</ItemLabel>
            </button>
          </div>

          <Link
            href={CREATE_PRODUCT_HREF}
            aria-label="Crear producto"
            // Single vertical rule for this button: `top-[22px]` anchors it
            // 22px below this wrapper's top edge (= the bar's top edge — the
            // bar is this wrapper's only in-flow child, so the absolutely
            // positioned button doesn't affect the wrapper's height).
            // `-translate-y-1/2` (unchanged, not stacked with anything new)
            // then shifts it up by half its own 56px height (28px), landing
            // its center 22px below that edge — ~40% of the circle above the
            // bar, ~60% sunk into it.
            className="absolute left-1/2 top-[22px] flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-surface bg-primary text-primary-foreground shadow-[var(--admin-shadow-md)] transition-transform duration-150 active:scale-95"
          >
            <IconPlus className="h-6 w-6" />
          </Link>
        </div>
      </div>

      <AdminMobileMenuSheet open={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </>
  );
}
