import { z } from "zod";
import { normalizeAdminProductSlug } from "../lib/product-slug";
import { emptyToUndefined, optionalIntegerSchema } from "./product-form-shared";

/**
 * Everything the product schema marks required except the images, which have
 * their own editor on the detail page and their own independent action. Asking
 * for the description here is deliberate: the detail form refuses to save
 * without one, so a product created without it would trap the next edit.
 */
export const adminProductCreateFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres.")
    .max(160, "El nombre no puede superar 160 caracteres."),
  slug: z
    .string()
    .trim()
    .min(1, "La URL es obligatoria.")
    .transform((value) => normalizeAdminProductSlug(value))
    .refine((value) => value.length > 0, "La URL no puede quedar vacía."),
  categoryId: z.string().trim().min(1, "Elegí una categoría."),
  subcategoryId: z.string().trim().optional(),
  shortDescription: z
    .string()
    .trim()
    .min(10, "La descripción corta debe tener al menos 10 caracteres.")
    .max(240, "La descripción corta no puede superar 240 caracteres."),
  description: z
    .string()
    .trim()
    .min(10, "La descripción debe tener al menos 10 caracteres."),
  basePrice: z.preprocess(
    emptyToUndefined,
    z.coerce.number().finite().positive("El precio debe ser mayor a cero."),
  ),
  transferPrice: z.preprocess(
    emptyToUndefined,
    z.coerce.number().finite().min(0, "El precio por transferencia no puede ser negativo.").optional(),
  ),
  stock: optionalIntegerSchema,
});

export type AdminProductCreateFormValues = z.infer<typeof adminProductCreateFormSchema>;

export type AdminProductCreateField = keyof AdminProductCreateFormValues;
