import { defineField, defineType } from "sanity";

export const imageWithAltSchema = defineType({
  name: "imageWithAlt",
  title: "Imagen del producto",
  type: "object",
  fields: [
    defineField({
      name: "image",
      title: "Imagen",
      description: "Subi una foto clara del producto. La primera imagen suele funcionar como principal.",
      type: "image",
      options: {
        hotspot: true,
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "alt",
      title: "Texto alternativo",
      description: "Descripcion breve para accesibilidad y SEO.",
      placeholder: "Ej: Vista frontal del producto",
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
