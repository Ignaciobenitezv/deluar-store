import { defineField, defineType } from "sanity";

export const productAttributeSchema = defineType({
  name: "productAttribute",
  title: "Caracteristica del producto",
  type: "object",
  fields: [
    defineField({
      name: "label",
      title: "Etiqueta",
      description: "Ejemplo: Material, Color, Medidas.",
      placeholder: "Ej: Material",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "value",
      title: "Valor",
      description: "Ejemplo: Algodon, Beige, 50 x 70 cm.",
      placeholder: "Ej: Algodon",
      type: "string",
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: {
      title: "label",
      subtitle: "value",
    },
    prepare({ title, subtitle }) {
      return {
        title: title || "Caracteristica",
        subtitle: subtitle || "Sin valor",
      };
    },
  },
});
