import { defineField, defineType } from "sanity";

const logisticsFieldValidation = (label: string) =>
  (rule: import("sanity").NumberRule) =>
    rule.custom((value) => {
      if (value === undefined || value === null) {
        return true;
      }

      if (typeof value !== "number" || Number.isNaN(value) || !Number.isFinite(value) || value <= 0) {
        return `${label} debe ser un número mayor a cero.`;
      }

      return true;
    });

export const productLogisticsSchema = defineType({
  name: "productLogistics",
  title: "Logística / envíos",
  type: "object",
  fields: [
    defineField({
      name: "weightGrams",
      title: "Peso (g)",
      description: "Peso total del producto o la variante en gramos.",
      type: "number",
      validation: logisticsFieldValidation("El peso"),
    }),
    defineField({
      name: "heightCm",
      title: "Alto (cm)",
      description: "Medida vertical del paquete o producto en centímetros.",
      type: "number",
      validation: logisticsFieldValidation("El alto"),
    }),
    defineField({
      name: "widthCm",
      title: "Ancho (cm)",
      description: "Medida horizontal del paquete o producto en centímetros.",
      type: "number",
      validation: logisticsFieldValidation("El ancho"),
    }),
    defineField({
      name: "depthCm",
      title: "Profundidad (cm)",
      description: "Profundidad o largo del paquete o producto en centímetros.",
      type: "number",
      validation: logisticsFieldValidation("La profundidad"),
    }),
  ],
  validation: (rule) =>
    rule.custom((value) => {
      if (!value || typeof value !== "object") {
        return true;
      }

      const candidate = value as Record<string, unknown>;
      const fields = ["weightGrams", "heightCm", "widthCm", "depthCm"] as const;
      const present = fields.filter((field) => {
        const candidateValue = candidate[field];
        return typeof candidateValue === "number" && Number.isFinite(candidateValue);
      });

      if (present.length === 0) {
        return true;
      }

      if (present.length !== fields.length) {
        return "Completá peso y dimensiones o dejá todos los campos vacíos.";
      }

      return true;
    }),
  preview: {
    select: {
      weightGrams: "weightGrams",
      heightCm: "heightCm",
      widthCm: "widthCm",
      depthCm: "depthCm",
    },
    prepare({ weightGrams, heightCm, widthCm, depthCm }) {
      const hasValues =
        typeof weightGrams === "number" &&
        typeof heightCm === "number" &&
        typeof widthCm === "number" &&
        typeof depthCm === "number";

      return {
        title: hasValues ? `${weightGrams} g` : "Logística sin definir",
        subtitle: hasValues ? `${heightCm} × ${widthCm} × ${depthCm} cm` : "Completar peso y dimensiones",
      };
    },
  },
});
