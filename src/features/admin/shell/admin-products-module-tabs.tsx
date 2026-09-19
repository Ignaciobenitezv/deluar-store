"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminNavIcon } from "./admin-nav-icons";
import { TabStripBaseline, TabStripContent, TabStripIndicator } from "./tab-strip";

type ProductsModuleTab = { id: string; label: string; href: string };

/**
 * Level 1 of two distinct nav levels under /admin/productos — this is the
 * module switch (Productos | Categorías), route-based (Link + usePathname,
 * same wiring as admin-analytics-tabs.tsx). It has nothing to do with the
 * product editor's own tab strip (Información | Galería | ...), which is
 * level 2, local `useState`, and lives entirely inside
 * AdminProductDetailForm — the two must never be confused for one another.
 */
const productsModuleTabs: ProductsModuleTab[] = [
  { id: "products", label: "Productos", href: "/admin/productos" },
  { id: "inventory", label: "Inventario", href: "/admin/productos/inventario" },
  { id: "categories", label: "Categorías", href: "/admin/productos/categorias" },
];

/** Longest-href-match, same rule admin-nav-config.ts uses for the sidebar:
 * "/admin/productos" is a literal prefix of "/admin/productos/categorias",
 * so a naive per-tab prefix check would light up both at once. */
function resolveActiveTabId(pathname: string) {
  let best: ProductsModuleTab | undefined;

  for (const tab of productsModuleTabs) {
    const matches = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
    if (matches && (!best || tab.href.length > best.href.length)) {
      best = tab;
    }
  }

  return best?.id;
}

export function AdminProductsModuleTabs() {
  const pathname = usePathname();
  const activeTabId = resolveActiveTabId(pathname);

  return (
    <nav aria-label="Navegación del módulo de productos" className="relative">
      <div className="relative flex items-center gap-8 px-1">
        {productsModuleTabs.map((tab) => {
          const active = tab.id === activeTabId;

          return (
            <Link
              key={tab.id}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className="group relative flex h-11 shrink-0 items-center gap-2"
            >
              <TabStripContent
                active={active}
                icon={<AdminNavIcon itemId={tab.id} className="h-[15px] w-[15px]" />}
                label={tab.label}
                iconClassName="transition-colors duration-150"
              />
              {active && <TabStripIndicator layoutId="admin-products-module-indicator" />}
            </Link>
          );
        })}
        <TabStripBaseline />
      </div>
    </nav>
  );
}
