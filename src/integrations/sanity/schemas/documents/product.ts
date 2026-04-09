import { defineArrayMember, defineField, defineType } from "sanity";

type ProductReferenceDocument = {
  category?: { _ref?: string };
};

export const productSchema = defineType({
  name: "product",
  title: "Productos",
  type: "document",
  groups: [
    { name: "content", title: "Contenido", default: true },
    { name: "commerce", title: "Precios y stock" },
    { name: "seo", title: "SEO" },
  ],
  fields: [
    defineField({
      name: "title",
      title: "Nombre del producto",
      description: "Nombre comercial del producto que se mostrara en la tienda.",
      type: "string",
      group: "content",
      validation: (rule) => rule.required().min(2).max(160),
    }),
    defineField({
      name: "slug",
      title: "URL",
      description: "Se usa para construir la direccion del producto.",
      type: "slug",
      group: "content",
      options: { source: "title", maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "shortDescription",
      title: "Descripcion corta",
      description: "Resumen breve para cards, listados y destacados.",
      type: "text",
      rows: 3,
      group: "content",
      validation: (rule) => rule.required().min(10).max(240),
    }),
    defineField({
      name: "description",
      title: "Descripcion completa",
      description:
        "Contenido principal del producto. Puedes escribir detalles, materiales y cuidados.",
      type: "array",
      group: "content",
      of: [defineArrayMember({ type: "block" })],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "category",
      title: "Categoria principal",
      description:
        "Selecciona la categoria principal en la que se mostrara este producto.",
      type: "reference",
      group: "content",
      to: [{ type: "category" }],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "subcategory",
      title: "Subcategoria",
      description: "Opcional. Solo muestra subcategorias de la categoria elegida.",
      type: "reference",
      group: "content",
      to: [{ type: "subcategory" }],
      options: {
        filter: ({ document }) => {
          const categoryId = (document as ProductReferenceDocument | undefined)?.category?._ref;

          if (!categoryId) {
            return {};
          }

          return {
            filter: "parentCategory._ref == $categoryId",
            params: { categoryId },
          };
        },
      },
    }),
    defineField({
      name: "images",
      title: "Imagenes del producto",
      description: "Carga una o mas imagenes para mostrar el producto en la tienda.",
      type: "array",
      group: "content",
      of: [defineArrayMember({ type: "imageWithAlt" })],
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: "colorVariants",
      title: "Variantes por color",
      description:
        "Opcional. Si completas este bloque, la tienda mostrara un selector de color con miniaturas.",
      type: "array",
      group: "content",
      of: [defineArrayMember({ type: "productColorVariant" })],
    }),
    defineField({
      name: "attributes",
      title: "Atributos",
      description: "Datos opcionales como material, color, medidas o terminacion.",
      type: "array",
      group: "content",
      of: [defineArrayMember({ type: "productAttribute" })],
    }),
    defineField({
      name: "basePrice",
      title: "Precio",
      description: "Precio principal que vera el cliente en la tienda.",
      type: "number",
      group: "commerce",
      validation: (rule) => rule.required().positive(),
    }),
    defineField({
      name: "transferPrice",
      title: "Precio con transferencia",
      description:
        "Opcional. Completa este valor si ofreces un precio especial por transferencia.",
      type: "number",
      group: "commerce",
      validation: (rule) => rule.min(0),
    }),
    defineField({
      name: "stock",
      title: "Stock disponible",
      description: "Cantidad disponible para la venta.",
      type: "number",
      group: "commerce",
      initialValue: 0,
      validation: (rule) => rule.required().integer().min(0),
    }),
    defineField({
      name: "isFeatured",
      title: "Destacar en la tienda",
      description: "Activalo si quieres usar este producto en secciones destacadas.",
      type: "boolean",
      group: "commerce",
      initialValue: false,
    }),
    defineField({
      name: "isOnOffer",
      title: "Mostrar en ofertas del home",
      description:
        "Activalo si quieres que este producto aparezca en el carrusel de ofertas de la portada.",
      type: "boolean",
      group: "commerce",
      initialValue: false,
    }),
    defineField({
      name: "seo",
      title: "SEO",
      description:
        "Completa estos datos si quieres personalizar como se muestra el producto en buscadores y redes.",
      type: "seo",
      group: "seo",
    }),
  ],
  preview: {
    select: {
      title: "title",
      subtitle: "slug.current",
      media: "images.0.image",
    },
  },
});
