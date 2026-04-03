import { defineField, defineType } from "sanity";

export const productAttributeSchema = defineType({
  name: "productAttribute",
  title: "Atributo del producto",
  type: "object",
  fields: [
    defineField({
      name: "label",
      title: "Nombre del atributo",
      description: "Ejemplo: Material, Color, Medidas.",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "value",
      title: "Valor",
      description: "Ejemplo: Algodon, Beige, 50 x 70 cm.",
      type: "string",
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: {
      title: "label",
      subtitle: "value",
    },
  },
});
