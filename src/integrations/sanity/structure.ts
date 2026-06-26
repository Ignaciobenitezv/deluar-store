import type { StructureResolver } from "sanity/structure";

export const structure: StructureResolver = (S) =>
  S.list()
    .title("Studio")
    .items([
      S.listItem()
        .title("Catalogo")
        .child(
          S.list()
            .title("Catalogo")
            .items([
              S.documentTypeListItem("product").title("Productos"),
              S.documentTypeListItem("category").title("Categorias"),
              S.documentTypeListItem("subcategory").title("Subcategorias"),
            ]),
        ),
      S.listItem()
        .title("Configuracion avanzada")
        .child(
          S.list()
            .title("Configuracion avanzada")
            .items([
              S.documentTypeListItem("siteSettings").title("Configuracion del sitio (SEO/metadatos)"),
              S.documentTypeListItem("promoSettings").title("Promociones (sin impacto visible)"),
              S.documentTypeListItem("staticPage").title("Paginas (sin impacto visible)"),
              S.documentTypeListItem("homePage").title("Pagina de inicio (impacto parcial)"),
            ]),
        ),
    ]);
