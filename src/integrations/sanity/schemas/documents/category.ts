import { defineField, defineType } from "sanity";

export const categorySchema = defineType({
  name: "category",
  title: "Categorias",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Nombre de la categoria",
      description: "Nombre principal que vas a ver en la tienda y en la navegacion.",
      type: "string",
      validation: (rule) => rule.required().min(2).max(120),
    }),
    defineField({
      name: "slug",
      title: "URL",
      description: "Se usa para construir la direccion de la categoria en el sitio.",
      type: "slug",
      options: { source: "title", maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "description",
      title: "Descripcion",
      description: "Texto opcional para describir la categoria.",
      type: "text",
      rows: 3,
    }),
    defineField({
      name: "order",
      title: "Orden",
      description: "Numero opcional para ordenar las categorias en la tienda.",
      type: "number",
      validation: (rule) => rule.integer().min(0),
    }),
  ],
  preview: {
    select: {
      title: "title",
      subtitle: "slug.current",
    },
  },
});
