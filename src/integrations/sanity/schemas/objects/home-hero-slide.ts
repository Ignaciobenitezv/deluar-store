import { defineField, defineType } from "sanity";

export const homeHeroSlideSchema = defineType({
  name: "homeHeroSlide",
  title: "Slide de hero",
  type: "object",
  fields: [
    defineField({
      name: "eyebrow",
      title: "Texto superior",
      type: "string",
    }),
    defineField({
      name: "title",
      title: "Titulo principal",
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
      title: "Imagen desktop",
      type: "imageWithAlt",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "mobileImage",
      title: "Imagen mobile",
      type: "imageWithAlt",
    }),
    defineField({
      name: "primaryCtaLabel",
      title: "Texto CTA principal",
      type: "string",
    }),
    defineField({
      name: "primaryCtaHref",
      title: "Link CTA principal",
      type: "string",
    }),
    defineField({
      name: "secondaryCtaLabel",
      title: "Texto CTA secundario",
      type: "string",
    }),
    defineField({
      name: "secondaryCtaHref",
      title: "Link CTA secundario",
      type: "string",
    }),
    defineField({
      name: "isActive",
      title: "Slide activo",
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
