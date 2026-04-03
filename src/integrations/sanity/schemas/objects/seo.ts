import { defineField, defineType } from "sanity";

export const seoSchema = defineType({
  name: "seo",
  title: "SEO",
  type: "object",
  fields: [
    defineField({
      name: "title",
      title: "Titulo SEO",
      description: "Titulo para buscadores y vista previa en enlaces.",
      type: "string",
      validation: (rule) => rule.max(70),
    }),
    defineField({
      name: "description",
      title: "Descripcion SEO",
      description: "Descripcion breve para buscadores y redes sociales.",
      type: "text",
      rows: 3,
      validation: (rule) => rule.max(160),
    }),
  ],
});
