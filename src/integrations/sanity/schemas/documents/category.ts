import { defineField, defineType } from "sanity";
import { createUniqueSlugValidation } from "../utils/slug";

export const categorySchema = defineType({
  name: "category",
  title: "Categorías",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Nombre",
      description: "Nombre visible en la tienda y en la navegación.",
      type: "string",
      validation: (rule) => rule.required().min(2).max(120),
    }),
    defineField({
      name: "slug",
      title: "URL",
      description:
        "Se genera automáticamente desde el nombre. Cambialo solo si necesitas corregir la URL.",
      type: "slug",
      options: { source: "title", maxLength: 96 },
      validation: (rule) => rule.required().custom(createUniqueSlugValidation("category", "La categoría")),
    }),
    defineField({
      name: "description",
      title: "Descripción",
      description: "Texto opcional para describir la categoría.",
      type: "text",
      rows: 3,
    }),
    defineField({
      name: "order",
      title: "Orden",
      description: "Número opcional para ordenar las categorías en la tienda.",
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
