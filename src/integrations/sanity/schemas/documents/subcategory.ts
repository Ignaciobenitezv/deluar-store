import { defineField, defineType } from "sanity";

export const subcategorySchema = defineType({
  name: "subcategory",
  title: "Subcategorias",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Nombre de la subcategoria",
      description: "Nombre visible dentro de la categoria principal.",
      type: "string",
      validation: (rule) => rule.required().min(2).max(120),
    }),
    defineField({
      name: "slug",
      title: "URL",
      description: "Se usa para construir la direccion de esta subcategoria.",
      type: "slug",
      options: { source: "title", maxLength: 96 },
      validation: (rule) => rule.required(),
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
