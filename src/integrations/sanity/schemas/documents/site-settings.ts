import { defineField, defineType } from "sanity";

export const siteSettingsSchema = defineType({
  name: "siteSettings",
  title: "Configuracion del sitio",
  type: "document",
  groups: [
    { name: "general", title: "General", default: true },
    { name: "contact", title: "Contacto" },
    { name: "seo", title: "SEO" },
  ],
  fields: [
    defineField({
      name: "title",
      title: "Nombre interno",
      description: "Solo para identificar este documento dentro del Studio.",
      type: "string",
      group: "general",
      initialValue: "Configuracion principal",
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
      title: "Descripcion del sitio",
      description:
        "Resumen general de la tienda para usar como referencia y SEO base.",
      type: "text",
      group: "general",
      rows: 3,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "contactEmail",
      title: "Email de contacto",
      description: "Correo principal para consultas.",
      type: "string",
      group: "contact",
    }),
    defineField({
      name: "whatsappNumber",
      title: "Numero de WhatsApp",
      description: "Numero de contacto comercial.",
      type: "string",
      group: "contact",
    }),
    defineField({
      name: "seo",
      title: "SEO por defecto",
      description:
        "Configuracion base para buscadores cuando una pagina no tenga SEO propio.",
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
