import { defineField, defineType } from "sanity";

export const promoSettingsSchema = defineType({
  name: "promoSettings",
  title: "Promociones",
  type: "document",
  groups: [
    { name: "announcement", title: "Barra superior", default: true },
  ],
  fields: [
    defineField({
      name: "title",
      title: "Nombre interno",
      description: "Solo para identificar este documento dentro del Studio.",
      type: "string",
      group: "announcement",
      initialValue: "Promociones principales",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "announcementEnabled",
      title: "Mostrar barra superior",
      description: "Activa o desactiva la barra de anuncio del header.",
      type: "boolean",
      group: "announcement",
      initialValue: true,
    }),
    defineField({
      name: "announcementText",
      title: "Texto del anuncio",
      description: "Mensaje breve para mostrar en la barra superior.",
      type: "string",
      group: "announcement",
      validation: (rule) => rule.max(180),
    }),
    defineField({
      name: "announcementLinkLabel",
      title: "Texto del link",
      description: "Opcional. Texto del enlace asociado al anuncio.",
      type: "string",
      group: "announcement",
    }),
    defineField({
      name: "announcementLinkUrl",
      title: "URL del link",
      description: "Opcional. Direccion a la que debe llevar el anuncio.",
      type: "string",
      group: "announcement",
    }),
  ],
  preview: {
    select: {
      title: "title",
      subtitle: "announcementText",
    },
  },
});
