import { defineArrayMember, defineField, defineType } from "sanity";

export const staticPageSchema = defineType({
  name: "staticPage",
  title: "Páginas",
  type: "document",
  groups: [
    { name: "content", title: "Contenido", default: true },
    { name: "seo", title: "SEO" },
  ],
  fields: [
    defineField({
      name: "title",
      title: "Nombre de la página",
      description: "Título principal de la página.",
      type: "string",
      group: "content",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "slug",
      title: "URL",
      description: "Dirección pública de esta página dentro del sitio.",
      type: "slug",
      group: "content",
      options: { source: "title", maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "excerpt",
      title: "Resumen",
      description: "Texto corto opcional para introducir el contenido.",
      type: "text",
      group: "content",
      rows: 3,
    }),
    defineField({
      name: "body",
      title: "Contenido",
      description: "Contenido principal de la página.",
      type: "array",
      group: "content",
      of: [defineArrayMember({ type: "block" })],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "seo",
      title: "SEO",
      description:
        "Completa estos datos si querés personalizar título y descripción para buscadores.",
      type: "seo",
      group: "seo",
    }),
  ],
  preview: {
    select: {
      title: "title",
      subtitle: "slug.current",
    },
  },
});
