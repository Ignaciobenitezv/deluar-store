import { defineField, defineType } from "sanity";

export const siteSettingsSchema = defineType({
  name: "siteSettings",
  title: "Configuración del sitio",
  type: "document",
  groups: [
    { name: "general", title: "Información general", default: true },
    { name: "contact", title: "Contacto" },
    { name: "seo", title: "SEO" },
  ],
  fields: [
    defineField({
      name: "title",
      title: "Nombre interno",
      description: "Solo para identificar este documento dentro del estudio.",
      type: "string",
      group: "general",
      initialValue: "Configuración principal",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "siteName",
      title: "Nombre del sitio",
      description: "Nombre general de la marca o tienda.",
      type: "string",
      group: "general",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "siteDescription",
      title: "Descripción del sitio",
      description:
        "Resumen general de la tienda para usar como referencia y SEO base.",
      type: "text",
      group: "general",
      rows: 3,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "contactEmail",
      title: "Correo electrónico de contacto",
      description: "Correo principal para consultas.",
      type: "string",
      group: "contact",
    }),
    defineField({
      name: "whatsappNumber",
      title: "Número de WhatsApp",
      description: "Número de contacto comercial.",
      type: "string",
      group: "contact",
    }),
    defineField({
      name: "seo",
      title: "SEO por defecto",
      description:
        "Configuración base para buscadores cuando una página no tenga SEO propio.",
      type: "seo",
      group: "seo",
    }),
  ],
  preview: {
    select: {
      title: "siteName",
      subtitle: "siteDescription",
    },
  },
});
