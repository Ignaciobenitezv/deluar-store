import { defineArrayMember, defineField, defineType } from "sanity";

function formatPreviewPrice(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "Precio general";
  }

  return `$${new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 0,
  }).format(value)}`;
}

function formatVariantAttributes(attributes: unknown) {
  if (!Array.isArray(attributes) || attributes.length === 0) {
    return "Sin atributos";
  }

  return attributes
    .map((attribute) => {
      if (typeof attribute !== "object" || attribute === null) {
        return "";
      }

      const typedAttribute = attribute as { name?: string; value?: string };
      const name = typedAttribute.name?.trim();
      const value = typedAttribute.value?.trim();

      if (!name && !value) {
        return "";
      }

      if (!name) {
        return value ?? "";
      }

      if (!value) {
        return name;
      }

      return `${name}: ${value}`;
    })
    .filter(Boolean)
    .join(" · ");
}

export const productVariantSchema = defineType({
  name: "productVariant",
  title: "Variante",
  type: "object",
  fieldsets: [
    { name: "general", title: "Información general" },
    {
      name: "media",
      title: "Imágenes",
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
    {
      name: "logistics",
      title: "Logística / envíos",
      options: { collapsible: true, collapsed: true },
    },
  ],
  fields: [
    defineField({
      name: "title",
      title: "Nombre visible",
      description: "Nombre comercial que verá la persona que compra.",
      placeholder: "Ej: King Size",
      type: "string",
      fieldset: "general",
      validation: (rule) => rule.required().min(2).max(120),
    }),
    defineField({
      name: "value",
      title: "Identificador interno",
      description:
        "Valor estable para identificar esta variante en carrito, órdenes e importación.",
      placeholder: "king-size",
      type: "string",
      fieldset: "general",
      validation: (rule) => rule.required().min(2).max(80),
    }),
    defineField({
      name: "attributes",
      title: "Atributos",
      description: "Agregá los atributos necesarios para describir esta variante.",
      type: "array",
      fieldset: "general",
      of: [defineArrayMember({ type: "productVariantAttribute" })],
      validation: (rule) => rule.max(4),
    }),
    defineField({
      name: "sku",
      title: "SKU interno",
      description: "Opcional. Código interno si tu operación lo necesita.",
      placeholder: "Ej: VAR-KING-BEIGE",
      type: "string",
      fieldset: "general",
    }),
    defineField({
      name: "images",
      title: "Imágenes",
      description:
        "Opcional. Si no cargás imágenes, la variante seguirá siendo válida para el importador.",
      type: "array",
      fieldset: "media",
      of: [defineArrayMember({ type: "imageWithAlt" })],
    }),
    defineField({
      name: "basePrice",
      title: "Precio de lista",
      description: "Opcional. Si no lo completás, podrá heredar el precio del producto.",
      placeholder: "Ej: 100000",
      type: "number",
      fieldset: "prices",
      validation: (rule) => rule.min(0),
    }),
    defineField({
      name: "transferPrice",
      title: "Precio por transferencia",
      description: "Opcional. Si no lo completás, podrá heredar el precio del producto.",
      placeholder: "Ej: 90000",
      type: "number",
      fieldset: "prices",
      validation: (rule) => rule.min(0),
    }),
    defineField({
      name: "stock",
      title: "Stock disponible",
      description:
        "Opcional. Si está presente, será la fuente de verdad para esta variante.",
      placeholder: "Ej: 3",
      type: "number",
      fieldset: "inventory",
      validation: (rule) => rule.integer().min(0),
    }),
    defineField({
      name: "logistics",
      title: "Logística / envíos",
      description:
        "Opcional. Si esta variante tiene embalaje propio, cargá peso y dimensiones completas.",
      type: "productLogistics",
      fieldset: "logistics",
    }),
    defineField({
      name: "isActive",
      title: "Visible en tienda",
      description: "Si está desactivada, la variante no se mostrará en la tienda.",
      type: "boolean",
      fieldset: "inventory",
      initialValue: true,
    }),
  ],
  preview: {
    select: {
      title: "title",
      value: "value",
      attributes: "attributes",
      stock: "stock",
      basePrice: "basePrice",
      isActive: "isActive",
    },
    prepare({ title, value, attributes, stock, basePrice, isActive }) {
      const status = isActive === false ? "Inactiva" : "Activa";
      const stockLabel = typeof stock === "number" ? `Stock ${stock}` : "Stock sin definir";
      const attributeLabel = formatVariantAttributes(attributes);

      return {
        title: title || "Variante",
        subtitle: [status, value || "Sin identificador", attributeLabel, formatPreviewPrice(basePrice), stockLabel]
          .filter(Boolean)
          .join(" | "),
      };
    },
  },
});
