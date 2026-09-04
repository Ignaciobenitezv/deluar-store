import type { AdminModuleNavSection } from "./admin-module-navigation";

export const adminAnalyticsSections: AdminModuleNavSection[] = [
  {
    label: "Resumen",
    items: [
      {
        id: "overview",
        label: "Resumen",
        href: "/admin/dashboard",
        description: "Visión general del comercio electrónico",
      },
      {
        id: "acquisition",
        label: "Adquisicion",
        href: "/admin/dashboard/adquisicion",
        description: "Fuentes, campañas y rendimiento del tráfico",
      },
    ],
  },
  {
    label: "Comercio",
    items: [
      {
        id: "sales",
        label: "Ventas",
        href: "/admin/dashboard/ventas",
        description: "Facturación y evolución",
      },
      {
        id: "conversion",
        label: "Conversion",
        href: "/admin/dashboard/conversion",
        description: "Funnel, abandono y pago",
      },
      {
        id: "abandoned-carts",
        label: "Carritos abandonados",
        href: "/admin/dashboard/abandoned-carts",
        description: "Listado y detalle operativo",
      },
      {
        id: "products-analytics",
        label: "Análisis de productos",
        href: "/admin/dashboard/productos",
        description: "Ranking, stock y mix",
      },
      {
        id: "customers",
        label: "Clientes",
        href: "/admin/dashboard/clientes",
        description: "Recurrencia y facturación",
      },
    ],
  },
  {
    label: "Operaciones",
    items: [
      {
        id: "checkout",
        label: "Finalización de compra",
        href: "/admin/dashboard/checkout",
        description: "Conversion y embudo",
      },
      {
        id: "payments",
        label: "Pagos",
        href: "/admin/dashboard/pagos",
        description: "Metodos y estados",
      },
      {
        id: "shipping",
        label: "Envios",
        href: "/admin/dashboard/envios",
        description: "Operacion y costos",
      },
      {
        id: "location",
        label: "Ubicacion",
        href: "/admin/dashboard/ubicacion",
        description: "Provincias y ciudades",
      },
    ],
  },
];

export const adminProductsSections: AdminModuleNavSection[] = [
  {
    label: "Catalogo",
    items: [
      {
        id: "products-list",
        label: "Productos",
        href: "/admin/productos",
        description: "Catálogo",
      },
    ],
  },
];

export const adminOrdersSections: AdminModuleNavSection[] = [
  {
    label: "Ordenes",
    items: [
      {
        id: "orders-list",
        label: "Ordenes",
        href: "/admin/orders",
        description: "Pedidos",
      },
    ],
  },
];

export const adminShipmentsSections: AdminModuleNavSection[] = [
  {
    label: "Operacion",
    items: [
      {
        id: "shipments-list",
        label: "Envios",
        href: "/admin/envios",
        description: "Andreani y lotes",
      },
    ],
  },
];
