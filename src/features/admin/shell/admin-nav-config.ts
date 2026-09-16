export type AdminNavItem = {
  id: string;
  label: string;
  href: string;
};

export type AdminNavSection = {
  label: string;
  items: AdminNavItem[];
};

/**
 * Single source of truth for the Admin's global nav — only real Deluar
 * routes. The sidebar is first-level navigation only: everything under
 * `/admin/dashboard/*` besides the entry point itself lives in the Analytics
 * tab bar (see admin-analytics-tabs.tsx), not here, so a route never has two
 * competing nav entries active at once.
 */
export const adminNavSections: AdminNavSection[] = [
  {
    label: "Módulos",
    items: [
      { id: "home", label: "Inicio", href: "/admin" },
      { id: "products-list", label: "Productos", href: "/admin/productos" },
      { id: "orders-list", label: "Órdenes", href: "/admin/orders" },
      { id: "shipments-list", label: "Envíos", href: "/admin/envios" },
    ],
  },
  {
    label: "Análisis",
    items: [{ id: "overview", label: "Estadísticas", href: "/admin/dashboard" }],
  },
  {
    label: "Operaciones",
    items: [
      { id: "payments", label: "Pagos", href: "/admin/dashboard/pagos" },
      { id: "shipping-analytics", label: "Costos de envío", href: "/admin/dashboard/envios" },
      { id: "location", label: "Ubicación", href: "/admin/dashboard/ubicacion" },
    ],
  },
];

export function isActiveAdminPath(pathname: string, href: string) {
  if (href === "/admin") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Longest-href-match across the whole nav: sibling items can share a path
 * prefix (e.g. "/admin/dashboard" under Análisis and "/admin/dashboard/pagos"
 * under Operaciones), so checking each item against `isActiveAdminPath` in
 * isolation would light up more than one at once. */
export function resolveActiveNavItemId(pathname: string) {
  let best: AdminNavItem | undefined;

  for (const section of adminNavSections) {
    for (const item of section.items) {
      if (isActiveAdminPath(pathname, item.href) && (!best || item.href.length > best.href.length)) {
        best = item;
      }
    }
  }

  return best?.id;
}
