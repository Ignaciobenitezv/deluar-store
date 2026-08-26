import type { StructureResolver } from "sanity/structure";

export const structure: StructureResolver = (S) =>
  S.list()
    .title("Estudio")
    .items([
      S.listItem()
        .title("Catálogo")
        .child(
          S.list()
            .title("Catálogo")
            .items([
              S.documentTypeListItem("product").title("Productos"),
              S.documentTypeListItem("category").title("Categorías"),
              S.documentTypeListItem("subcategory").title("Subcategorías"),
            ]),
        ),
      S.listItem()
        .title("Configuración avanzada")
        .child(
          S.list()
            .title("Configuración avanzada")
            .items([
              S.documentTypeListItem("siteSettings").title("Configuración del sitio (SEO/metadatos)"),
              S.documentTypeListItem("promoSettings").title("Promociones (sin impacto visible)"),
              S.documentTypeListItem("staticPage").title("Páginas (sin impacto visible)"),
              S.documentTypeListItem("homePage").title("Página de inicio (impacto parcial)"),
            ]),
        ),
    ]);
