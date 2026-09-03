import { z } from "zod";
import { PRODUCT_LOGISTICS_FIELD_NAMES } from "@/features/catalog/logistics";
import { normalizeAdminProductSlug } from "../lib/product-slug";
import {
  booleanSelectSchema,
  emptyToUndefined,
  optionalIntegerSchema,
} from "./product-form-shared";

const optionalTrimmedString = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? undefined : value),
  z
    .string()
    .trim()
    .max(200)
    .optional(),
);

const requiredTrimmedString = z.string().trim().min(1);

const logisticsValueSchema = z.preprocess(
  emptyToUndefined,
  z.coerce.number().finite().positive().optional(),
);

const portableTextSpanSchema = z.object({
  _type: z.literal("span"),
  _key: z.string().min(1),
  text: z.string(),
  marks: z.array(z.string()).default([]),
});

const portableTextMarkDefSchema = z.object({
  _key: z.string().min(1),
  _type: z.literal("link"),
  href: z.string().trim().min(1),
});

const portableTextBlockSchema = z.object({
  _type: z.literal("block"),
  _key: z.string().min(1),
  style: z.literal("normal"),
  children: z.array(portableTextSpanSchema).min(1),
  markDefs: z.array(portableTextMarkDefSchema).default([]),
  listItem: z.enum(["bullet", "number"]).optional(),
  level: z.number().int().min(1).max(2).optional(),
});

export const adminProductDetailBlocksSchema = z.array(portableTextBlockSchema).min(1, "La descripción es obligatoria.");

const adminProductDetailDeltaFieldSchema = z.enum([
  "title",
  "slug",
  "shortDescription",
  "description",
  "category",
  "subcategory",
  "basePrice",
  "transferPrice",
  "stock",
  "isActive",
  "isFeatured",
  "isOnOffer",
  "showInNewIn",
  "newInOrder",
  "logistics",
  "seo",
]);

const adminProductDetailSubcategoryDeltaSchema = z.discriminatedUnion("operation", [
  z.object({
    operation: z.literal("set"),
    value: requiredTrimmedString,
  }),
  z.object({
    operation: z.literal("unset"),
  }),
]);

const adminProductDetailTransferPriceDeltaSchema = z.discriminatedUnion("operation", [
  z.object({
    operation: z.literal("set"),
    value: z.coerce.number().finite().min(0),
  }),
  z.object({
    operation: z.literal("unset"),
  }),
]);

const adminProductDetailNewInOrderDeltaSchema = z.discriminatedUnion("operation", [
  z.object({
    operation: z.literal("set"),
    value: optionalIntegerSchema,
  }),
  z.object({
    operation: z.literal("unset"),
  }),
]);

const adminProductDetailSeoDeltaSchema = z.discriminatedUnion("operation", [
  z.object({
    operation: z.literal("set"),
    title: optionalTrimmedString,
    description: optionalTrimmedString,
  }),
  z.object({
    operation: z.literal("unset"),
  }),
]);

export const adminProductDetailDeltaSchema = z.object({
  changedFields: z.array(adminProductDetailDeltaFieldSchema).min(1),
  title: optionalTrimmedString,
  slug: optionalTrimmedString,
  shortDescription: optionalTrimmedString,
  descriptionJson: optionalTrimmedString,
  categoryId: optionalTrimmedString,
  subcategory: adminProductDetailSubcategoryDeltaSchema.optional(),
  basePrice: z.coerce.number().finite().positive().optional(),
  transferPrice: adminProductDetailTransferPriceDeltaSchema.optional(),
  stock: optionalIntegerSchema.optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  isOnOffer: z.boolean().optional(),
  showInNewIn: z.boolean().optional(),
  newInOrder: adminProductDetailNewInOrderDeltaSchema.optional(),
  seo: adminProductDetailSeoDeltaSchema.optional(),
});

export const adminProductDetailFormSchema = z.object({
  productId: requiredTrimmedString,
  rev: requiredTrimmedString,
  title: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres.").max(160),
  slug: z
    .string()
    .trim()
    .min(1, "La URL es obligatoria.")
    .transform((value) => normalizeAdminProductSlug(value))
    .refine((value) => value.length > 0, "La URL no puede quedar vacía."),
  shortDescription: z
    .string()
    .trim()
    .min(10, "La descripción corta debe tener al menos 10 caracteres.")
    .max(240, "La descripción corta no puede superar 240 caracteres."),
  descriptionJson: requiredTrimmedString,
  categoryId: requiredTrimmedString,
  subcategoryId: z.string().trim().optional(),
  basePrice: z.preprocess(emptyToUndefined, z.coerce.number().finite().positive("El precio debe ser mayor a cero.")),
  transferPrice: z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? undefined : value),
    z.coerce.number().finite().min(0).optional(),
  ),
  stock: optionalIntegerSchema,
  isActive: booleanSelectSchema,
  isFeatured: booleanSelectSchema,
  isOnOffer: booleanSelectSchema,
  showInNewIn: booleanSelectSchema,
  newInOrder: optionalIntegerSchema,
  weightGrams: logisticsValueSchema,
  heightCm: logisticsValueSchema,
  widthCm: logisticsValueSchema,
  depthCm: logisticsValueSchema,
  seoTitle: optionalTrimmedString,
  seoDescription: optionalTrimmedString,
}).superRefine((value, context) => {
  const filledFields = PRODUCT_LOGISTICS_FIELD_NAMES.filter((field) => {
    const numericValue = value[field];
    return typeof numericValue === "number" && Number.isFinite(numericValue);
  });

  if (filledFields.length === 0) {
    return;
  }

  if (filledFields.length !== PRODUCT_LOGISTICS_FIELD_NAMES.length) {
    for (const field of PRODUCT_LOGISTICS_FIELD_NAMES) {
      if (typeof value[field] !== "number") {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: "Completá peso y dimensiones o dejalos vacíos.",
        });
      }
    }
  }
});

export type AdminProductDetailFormValues = z.infer<typeof adminProductDetailFormSchema>;
export type AdminProductDetailDeltaValues = z.infer<typeof adminProductDetailDeltaSchema>;

export function parseAdminProductDetailDescription(rawValue: string) {
  const parsed = JSON.parse(rawValue) as unknown;
  return adminProductDetailBlocksSchema.parse(parsed);
}
