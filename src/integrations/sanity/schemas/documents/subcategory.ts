import { defineField, defineType } from "sanity";
import { createUniqueSlugValidation } from "../utils/slug";

export const subcategorySchema = defineType({
  name: "subcategory",
  title: "Subcategorias",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Nombre",
      description: "Nombre visible dentro de la categoria principal.",
      type: "string",
      validation: (rule) => rule.required().min(2).max(120),
    }),
    defineField({
      name: "slug",
      title: "URL",
      description:
        "Se genera automaticamente desde el nombre. Cambialo solo si necesitas corregir la URL.",
      type: "slug",
      options: { source: "title", maxLength: 96 },
      validation: (rule) => rule.required().custom(createUniqueSlugValidation("subcategory", "La subcategoria")),
    }),
    defineField({
      name: "parentCategory",
      title: "Categoria principal",
      description: "Selecciona a que categoria pertenece esta subcategoria.",
      type: "reference",
      to: [{ type: "category" }],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "description",
      title: "Descripcion",
      description: "Texto opcional para ampliar el contexto de la subcategoria.",
      type: "text",
      rows: 3,
    }),
    defineField({
      name: "order",
      title: "Orden",
      description: "Numero opcional para ordenar las subcategorias.",
      type: "number",
      validation: (rule) => rule.integer().min(0),
    }),
  ],
  preview: {
    select: {
      title: "title",
      category: "parentCategory.title",
      subtitle: "slug.current",
    },
    prepare({ title, category, subtitle }) {
      return {
        title,
        subtitle: category ? `${category} | ${subtitle}` : subtitle,
      };
    },
  },
});
