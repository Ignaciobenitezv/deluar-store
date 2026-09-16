import { z } from "zod";
import { normalizeAdminProductSlug } from "@/features/admin/products/lib/product-slug";

// The slug-normalization rules aren't product-specific (diacritics stripped,
// lowercased, dash-joined) — reused as-is instead of re-implementing the
// same string logic under a new name.
const slugSchema = z
  .string()
  .trim()
  .min(1, "La URL es obligatoria.")
  .transform((value) => normalizeAdminProductSlug(value))
  .refine((value) => value.length > 0, "La URL no puede quedar vacía.");

const optionalOrderSchema = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? undefined : value),
  z.coerce.number().int().min(0).optional(),
);

const optionalDescriptionSchema = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? undefined : value),
  z.string().trim().max(2000).optional(),
);

export const adminCategoryFormSchema = z.object({
  title: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres.").max(120),
  slug: slugSchema,
  description: optionalDescriptionSchema,
  order: optionalOrderSchema,
});

export type AdminCategoryFormValues = z.infer<typeof adminCategoryFormSchema>;

export const adminSubcategoryFormSchema = adminCategoryFormSchema.extend({
  parentId: z.string().trim().min(1, "Elegí una categoría o subcategoría padre."),
});

export type AdminSubcategoryFormValues = z.infer<typeof adminSubcategoryFormSchema>;
