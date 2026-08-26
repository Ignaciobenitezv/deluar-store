import { defineField, defineType } from "sanity";

export const productAttributeSchema = defineType({
  name: "productAttribute",
  title: "Característica del producto",
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
      description: "Ejemplo: Algodón, Beige, 50 x 70 cm.",
      placeholder: "Ej: Algodón",
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
        title: title || "Característica",
        subtitle: subtitle || "Sin valor",
      };
    },
  },
});
