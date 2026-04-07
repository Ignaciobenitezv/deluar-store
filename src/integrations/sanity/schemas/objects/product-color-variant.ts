import { defineArrayMember, defineField, defineType } from "sanity";

export const productColorVariantSchema = defineType({
  name: "productColorVariant",
  title: "Variante por color",
  type: "object",
  fields: [
    defineField({
      name: "title",
      title: "Nombre del color",
      type: "string",
      validation: (rule) => rule.required().min(2).max(80),
    }),
    defineField({
      name: "value",
      title: "Valor interno",
      description: "Identificador corto para diferenciar la variante en la tienda.",
      type: "string",
      validation: (rule) => rule.required().min(2).max(40),
    }),
    defineField({
      name: "thumbnail",
      title: "Miniatura de la variante",
      description: "Opcional. Si no cargas una, se usara la primera imagen de la variante.",
      type: "imageWithAlt",
    }),
    defineField({
      name: "images",
      title: "Galeria de la variante",
      description: "Imagen principal y galeria para este color.",
      type: "array",
      of: [defineArrayMember({ type: "imageWithAlt" })],
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: "sku",
      title: "SKU",
      type: "string",
    }),
    defineField({
      name: "basePrice",
      title: "Precio de la variante",
      description: "Opcional. Si no cargas un precio, la tienda usara el precio general.",
      type: "number",
      validation: (rule) => rule.min(0),
    }),
    defineField({
      name: "transferPrice",
      title: "Precio transferencia de la variante",
      type: "number",
      validation: (rule) => rule.min(0),
    }),
    defineField({
      name: "stock",
      title: "Stock de la variante",
      description: "Opcional. Si no se completa, se usara el stock general del producto.",
      type: "number",
      validation: (rule) => rule.integer().min(0),
    }),
  ],
  preview: {
    select: {
      title: "title",
      subtitle: "value",
      media: "thumbnail.image",
      fallbackMedia: "images.0.image",
    },
    prepare({ title, subtitle, media, fallbackMedia }) {
      return {
        title: title || "Variante",
        subtitle: subtitle || "Sin valor interno",
        media: media || fallbackMedia,
      };
    },
  },
});
