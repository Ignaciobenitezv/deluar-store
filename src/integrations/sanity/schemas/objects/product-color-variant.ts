import { defineArrayMember, defineField, defineType } from "sanity";

function formatPreviewPrice(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "Precio general";
  }

  return `$${new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 0,
  }).format(value)}`;
}

export const productColorVariantSchema = defineType({
  name: "productColorVariant",
  title: "Variante de color",
  type: "object",
  fieldsets: [
    { name: "general", title: "Informacion general" },
    {
      name: "media",
      title: "Imagenes",
      options: { collapsible: true, collapsed: true },
    },
    {
      name: "prices",
      title: "Precios",
      options: { collapsible: true, collapsed: true },
    },
    {
      name: "inventory",
      title: "Inventario",
      options: { collapsible: true, collapsed: true },
    },
  ],
  fields: [
    defineField({
      name: "title",
      title: "Nombre visible",
      description: "Nombre que vera la persona que compra.",
      placeholder: "Ej: Beige",
      type: "string",
      fieldset: "general",
      validation: (rule) => rule.required().min(2).max(80),
    }),
    defineField({
      name: "value",
      title: "Identificador interno",
      description:
        "Usa un valor corto y estable para distinguir esta variante. Ejemplo: beige, natural o blanco.",
      placeholder: "beige",
      type: "string",
      fieldset: "general",
      validation: (rule) => rule.required().min(2).max(40),
    }),
    defineField({
      name: "sku",
      title: "SKU interno",
      description: "Opcional. Codigo interno si tu operacion lo necesita.",
      placeholder: "Ej: VAR-BEIGE",
      type: "string",
      fieldset: "general",
    }),
    defineField({
      name: "thumbnail",
      title: "Miniatura",
      description: "Opcional. Si no cargas una, se usara la primera imagen de la variante.",
      type: "imageWithAlt",
      fieldset: "media",
    }),
    defineField({
      name: "images",
      title: "Imagenes de la variante",
      description: "Carga al menos una imagen para este color. Esta galeria se mostrara al cliente.",
      type: "array",
      fieldset: "media",
      of: [defineArrayMember({ type: "imageWithAlt" })],
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: "basePrice",
      title: "Precio",
      description: "Opcional. Si no lo completas, la tienda usara el precio general del producto.",
      placeholder: "Ej: 95000",
      type: "number",
      fieldset: "prices",
      validation: (rule) => rule.min(0),
    }),
    defineField({
      name: "transferPrice",
      title: "Precio por transferencia",
      description: "Opcional. Si no lo completas, se usara el precio general por transferencia.",
      placeholder: "Ej: 85000",
      type: "number",
      fieldset: "prices",
      validation: (rule) => rule.min(0),
    }),
    defineField({
      name: "stock",
      title: "Stock",
      description: "Opcional. Si no se completa, se usara el stock general del producto.",
      placeholder: "Ej: 1",
      type: "number",
      fieldset: "inventory",
      validation: (rule) => rule.integer().min(0),
    }),
  ],
  preview: {
    select: {
      title: "title",
      subtitle: "value",
      media: "thumbnail.image",
      fallbackMedia: "images.0.image",
      stock: "stock",
      basePrice: "basePrice",
    },
    prepare({ title, subtitle, media, fallbackMedia, stock, basePrice }) {
      const stockLabel = typeof stock === "number" ? `Stock ${stock}` : "Stock general";

      return {
        title: title || "Variante",
        subtitle: `${subtitle || "Sin identificador"} | ${formatPreviewPrice(basePrice)} | ${stockLabel}`,
        media: media || fallbackMedia,
      };
    },
  },
});
