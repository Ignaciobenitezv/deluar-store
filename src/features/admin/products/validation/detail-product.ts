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
  stock: optionalIntegerSchema.optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  isOnOffer: z.boolean().optional(),
  showInNewIn: z.boolean().optional(),
  newInOrder: adminProductDetailNewInOrderDeltaSchema.optional(),
  seo: adminProductDetailSeoDeltaSchema.optional(),
});

/**
 * The all-or-nothing logistics rule, factored out so it can be applied to
 * more than one object shape — Zod's `.omit()` only exists on a plain
 * `ZodObject`; once `.superRefine()` wraps it in a `ZodEffects`, `.omit()`
 * throws at *module evaluation* time (".omit() cannot be used on object
 * schemas containing refinements"), not at some later call site. That bit
 * `adminProductFinalizeFormSchema` below when it tried to omit fields from
 * the already-refined `adminProductDetailFormSchema` — every route that
 * imports this module (directly or transitively, e.g. through the finalize
 * action) failed before any client code ran. Applying this refinement to
 * the *unrefined* base object separately, once per schema, avoids the
 * `ZodEffects` entirely.
 */
function refineProductLogistics<Shape extends Partial<Record<(typeof PRODUCT_LOGISTICS_FIELD_NAMES)[number], unknown>>>(
  value: Shape,
  context: z.RefinementCtx,
) {
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
}

const adminProductDetailBaseObjectSchema = z.object({
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
});

export const adminProductDetailFormSchema = adminProductDetailBaseObjectSchema.superRefine(refineProductLogistics);

export type AdminProductDetailFormValues = z.infer<typeof adminProductDetailFormSchema>;
export type AdminProductDetailDeltaValues = z.infer<typeof adminProductDetailDeltaSchema>;

/**
 * Finalizing a draft ("Crear producto") validates the exact same field set
 * as a normal edit — the draft-backed create flow shares one editor with
 * Editar producto, so it shares this schema too, just without
 * `productId`/`rev` inline (the finalize action takes those as separate
 * arguments, since it already knows the draft's id/rev from context rather
 * than trusting them from form fields).
 */
export const adminProductFinalizeFormSchema = adminProductDetailBaseObjectSchema
  .omit({ productId: true, rev: true })
  .superRefine(refineProductLogistics);

export type AdminProductFinalizeFormValues = z.infer<typeof adminProductFinalizeFormSchema>;

export function parseAdminProductDetailDescription(rawValue: string) {
  const parsed = JSON.parse(rawValue) as unknown;
  return adminProductDetailBlocksSchema.parse(parsed);
}
