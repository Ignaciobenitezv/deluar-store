import type { DashboardNavItem, DashboardPeriodValue } from "../types/dashboard";

export const dashboardPeriods: Record<DashboardPeriodValue, { label: string }> = {
  today: { label: "Hoy" },
  "7d": { label: "7 días" },
  "30d": { label: "30 días" },
  "90d": { label: "90 días" },
};

export const dashboardNavigation: DashboardNavItem[] = [
  {
    id: "home",
    label: "Panel",
    href: "/admin",
    description: "Acceso rápido a los módulos principales",
    group: "principal",
  },
  {
    id: "overview",
    label: "Resumen",
    href: "/admin/dashboard",
    description: "Visión general del comercio electrónico",
    group: "principal",
  },
  {
    id: "catalog",
    label: "Productos",
    href: "/admin/productos",
    description: "Gestión operativa del catálogo",
    group: "catalog",
  },
  {
    id: "sales",
    label: "Ventas",
    href: "/admin/dashboard/ventas",
    description: "Facturación y evolución",
    group: "commerce",
  },
  {
    id: "checkout",
    label: "Finalización de compra",
    href: "/admin/dashboard/checkout",
    description: "Conversión y embudo",
    group: "commerce",
  },
  {
    id: "conversion",
    label: "Conversión",
    href: "/admin/dashboard/conversion",
    description: "Funnel, abandono y pago",
    group: "commerce",
  },
  {
    id: "abandoned-carts",
    label: "Carritos abandonados",
    href: "/admin/dashboard/abandoned-carts",
    description: "Listado y detalle operativo",
    group: "commerce",
  },
  {
    id: "products",
    label: "Análisis de productos",
    href: "/admin/dashboard/productos",
    description: "Ranking, stock y mix",
    group: "commerce",
  },
  {
    id: "customers",
    label: "Clientes",
    href: "/admin/dashboard/clientes",
    description: "Recurrencia y facturación",
    group: "commerce",
  },
  {
    id: "location",
    label: "Ubicación",
    href: "/admin/dashboard/ubicacion",
    description: "Provincias y ciudades",
    group: "operations",
  },
  {
    id: "payments",
    label: "Pagos",
    href: "/admin/dashboard/pagos",
    description: "Métodos y estados",
    group: "operations",
  },
  {
    id: "shipping",
    label: "Envíos",
    href: "/admin/dashboard/envios",
    description: "Operación y costos",
    group: "operations",
  },
  {
    id: "marketing",
    label: "Marketing",
    href: "/admin/dashboard/marketing",
    description: "Seguimiento futuro",
    group: "future",
  },
  {
    id: "reports",
    label: "Reportes",
    href: "/admin/dashboard/reportes",
    description: "Exportaciones futuras",
    group: "future",
  },
];
