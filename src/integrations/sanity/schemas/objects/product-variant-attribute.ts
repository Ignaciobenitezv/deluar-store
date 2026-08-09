import { defineField, defineType } from "sanity";

const allowedVariantAttributeNames = ["Color", "Tamaño", "Modelo", "Talle"] as const;

export const productVariantAttributeSchema = defineType({
  name: "productVariantAttribute",
  title: "Atributo de variante",
  type: "object",
  fields: [
    defineField({
      name: "name",
      title: "Nombre",
      description: "Usa uno de los atributos permitidos: Color, Tamaño, Modelo o Talle.",
      type: "string",
      options: {
        list: [...allowedVariantAttributeNames],
      },
      validation: (rule) =>
        rule.required().custom((value) => {
          if (typeof value !== "string") {
            return "El nombre del atributo es obligatorio.";
          }

          return allowedVariantAttributeNames.includes(value as (typeof allowedVariantAttributeNames)[number])
            ? true
            : "Usa uno de los atributos permitidos: Color, Tamaño, Modelo o Talle.";
        }),
    }),
    defineField({
      name: "value",
      title: "Valor",
      description: "Valor concreto del atributo para esta variante.",
      placeholder: "Ej: Beige",
      type: "string",
      validation: (rule) => rule.required().min(1).max(80),
    }),
  ],
  preview: {
    select: {
      title: "name",
      subtitle: "value",
    },
    prepare({ title, subtitle }) {
      return {
        title: title || "Atributo",
        subtitle: subtitle || "Sin valor",
      };
    },
  },
});
