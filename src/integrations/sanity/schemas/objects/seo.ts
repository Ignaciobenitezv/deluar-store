import { defineField, defineType } from "sanity";

export const seoSchema = defineType({
  name: "seo",
  title: "SEO",
  type: "object",
  fields: [
    defineField({
      name: "title",
      title: "Título SEO",
      description: "Título para buscadores y vista previa en enlaces.",
      placeholder: "Ej: Manta tejida natural | DELUAR",
      type: "string",
      validation: (rule) => rule.max(70),
    }),
    defineField({
      name: "description",
      title: "Descripción SEO",
      description: "Descripción breve para buscadores y redes sociales.",
      placeholder: "Ej: Manta tejida natural para living, suave y decorativa.",
      type: "text",
      rows: 3,
      validation: (rule) => rule.max(160),
    }),
  ],
});
