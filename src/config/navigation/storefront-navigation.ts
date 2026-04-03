import type { StorefrontNavigation } from "@/types/navigation";

export const storefrontNavigation: StorefrontNavigation = {
  announcement:
    "Envios a todo el pais y asesoramiento para ambientar tus espacios.",
  primary: [
    { id: "inicio", label: "Inicio", href: "/" },
    { id: "productos", label: "Productos", href: "/productos" },
    { id: "contacto", label: "Contacto", href: "/contacto" },
    {
      id: "politica-de-devolucion",
      label: "Politica de devolucion",
      href: "/politica-de-devolucion",
    },
    { id: "como-comprar", label: "Como comprar", href: "/como-comprar" },
  ],
  categories: [
    {
      id: "cocina",
      label: "Cocina",
      href: "/productos/cocina",
      cmsKey: "cocina",
      items: [
        { id: "manteles", label: "Manteles", href: "/productos/cocina/manteles", cmsKey: "manteles" },
        { id: "repasadores", label: "Repasadores", href: "/productos/cocina/repasadores", cmsKey: "repasadores" },
        { id: "individuales", label: "Individuales", href: "/productos/cocina/individuales", cmsKey: "individuales" },
        { id: "bazar", label: "Bazar", href: "/productos/cocina/bazar", cmsKey: "bazar" },
        { id: "camino-de-mesa", label: "Camino de mesa", href: "/productos/cocina/camino-de-mesa", cmsKey: "camino-de-mesa" },
      ],
    },
    {
      id: "dormitorio",
      label: "Dormitorio",
      href: "/productos/dormitorio",
      cmsKey: "dormitorio",
      items: [
        { id: "sabanas-y-ajustables", label: "Sabanas y ajustables", href: "/productos/dormitorio/sabanas-y-ajustables", cmsKey: "sabanas-y-ajustables" },
        { id: "pie-de-cama-y-mantas", label: "Pie de cama y mantas", href: "/productos/dormitorio/pie-de-cama-y-mantas", cmsKey: "pie-de-cama-y-mantas" },
        { id: "alfombras-salida-de-cama", label: "Alfombras para salida de cama", href: "/productos/dormitorio/alfombras-para-salida-de-cama", cmsKey: "alfombras-para-salida-de-cama" },
      ],
    },
    {
      id: "living",
      label: "Living",
      href: "/productos/living",
      cmsKey: "living",
      items: [
        { id: "mantas", label: "Mantas", href: "/productos/living/mantas", cmsKey: "mantas" },
        { id: "almohadones-y-fundas", label: "Almohadones y fundas", href: "/productos/living/almohadones-y-fundas", cmsKey: "almohadones-y-fundas" },
        { id: "alfombras", label: "Alfombras", href: "/productos/living/alfombras", cmsKey: "alfombras" },
        { id: "yute-seagrass", label: "Yute / seagrass", href: "/productos/living/yute-seagrass", cmsKey: "yute-seagrass" },
        { id: "deco-floreros", label: "Deco / floreros", href: "/productos/living/deco-floreros", cmsKey: "deco-floreros" },
        { id: "iluminacion", label: "Iluminacion", href: "/productos/living/iluminacion", cmsKey: "iluminacion" },
        { id: "cortina-de-ambiente", label: "Cortina de ambiente", href: "/productos/living/cortina-de-ambiente", cmsKey: "cortina-de-ambiente" },
      ],
    },
    {
      id: "bano",
      label: "Bano",
      href: "/productos/bano",
      cmsKey: "bano",
      items: [
        { id: "alfombras-para-bano", label: "Alfombras para bano", href: "/productos/bano/alfombras-para-bano", cmsKey: "alfombras-para-bano" },
        { id: "toallas", label: "Toallas", href: "/productos/bano/toallas", cmsKey: "toallas" },
        { id: "articulos-para-bano", label: "Articulos para bano", href: "/productos/bano/articulos-para-bano", cmsKey: "articulos-para-bano" },
        { id: "cestos-para-bano", label: "Cestos para bano", href: "/productos/bano/cestos-para-bano", cmsKey: "cestos-para-bano" },
        { id: "cortinas", label: "Cortinas", href: "/productos/bano/cortinas", cmsKey: "cortinas" },
      ],
    },
    {
      id: "organizacion",
      label: "Organizacion",
      href: "/productos/organizacion",
      cmsKey: "organizacion",
      items: [
        { id: "plantas", label: "Plantas", href: "/productos/organizacion/plantas", cmsKey: "plantas" },
        { id: "artificiales-flores-secas", label: "Artificiales / flores secas", href: "/productos/organizacion/artificiales-flores-secas", cmsKey: "artificiales-flores-secas" },
      ],
    },
    {
      id: "velas-y-accesorios",
      label: "Velas y accesorios",
      href: "/productos/velas-y-accesorios",
      cmsKey: "velas-y-accesorios",
      items: [
        { id: "velas", label: "Velas", href: "/productos/velas-y-accesorios/velas", cmsKey: "velas" },
        { id: "portavelas-y-bandejas", label: "Portavelas y bandejas", href: "/productos/velas-y-accesorios/portavelas-y-bandejas", cmsKey: "portavelas-y-bandejas" },
      ],
    },
    {
      id: "varios",
      label: "Varios",
      href: "/productos/varios",
      cmsKey: "varios",
      items: [
        { id: "felpudos-exterior", label: "Felpudos / exterior", href: "/productos/varios/felpudos-exterior", cmsKey: "felpudos-exterior" },
      ],
    },
    {
      id: "combos-para-regalar",
      label: "Combos para regalar",
      href: "/productos/combos-para-regalar",
      cmsKey: "combos-para-regalar",
      items: [],
    },
  ],
  utility: [
    { id: "nosotros", label: "Nosotros", href: "/nosotros" },
    { id: "contacto", label: "Contacto", href: "/contacto" },
  ],
};
