import { defineField, defineType } from "sanity";

export const homeHeroSlideSchema = defineType({
  name: "homeHeroSlide",
  title: "Diapositiva principal",
  type: "object",
  fields: [
    defineField({
      name: "eyebrow",
      title: "Texto superior",
      type: "string",
    }),
    defineField({
      name: "title",
      title: "Título principal",
      type: "string",
      validation: (rule) => rule.required().min(2).max(140),
    }),
    defineField({
      name: "text",
      title: "Texto secundario",
      type: "text",
      rows: 3,
      validation: (rule) => rule.max(280),
    }),
    defineField({
      name: "desktopImage",
      title: "Imagen para escritorio",
      type: "imageWithAlt",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "mobileImage",
      title: "Imagen para móvil",
      type: "imageWithAlt",
    }),
    defineField({
      name: "primaryCtaLabel",
      title: "Texto del botón principal",
      type: "string",
    }),
    defineField({
      name: "primaryCtaHref",
      title: "Enlace del botón principal",
      type: "string",
    }),
    defineField({
      name: "secondaryCtaLabel",
      title: "Texto del botón secundario",
      type: "string",
    }),
    defineField({
      name: "secondaryCtaHref",
      title: "Enlace del botón secundario",
      type: "string",
    }),
    defineField({
      name: "isActive",
      title: "Diapositiva activa",
      type: "boolean",
      initialValue: true,
    }),
  ],
  preview: {
    select: {
      title: "title",
      subtitle: "eyebrow",
      media: "desktopImage.image",
    },
  },
});
