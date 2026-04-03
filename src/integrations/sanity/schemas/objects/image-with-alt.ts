import { defineField, defineType } from "sanity";

export const imageWithAltSchema = defineType({
  name: "imageWithAlt",
  title: "Imagen del producto",
  type: "object",
  fields: [
    defineField({
      name: "image",
      title: "Imagen",
      description: "Carga la imagen principal o secundaria del producto.",
      type: "image",
      options: {
        hotspot: true,
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "alt",
      title: "Texto alternativo",
      description: "Descripcion breve de la imagen para accesibilidad y SEO.",
      type: "string",
    }),
  ],
  preview: {
    select: {
      title: "alt",
      media: "image",
    },
    prepare({ title, media }) {
      return {
        title: title || "Imagen",
        media,
      };
    },
  },
});
