import { z } from "zod";
import { ADMIN_PRODUCT_VARIANT_ATTRIBUTE_NAMES, buildVariantCombinationKey, normalizeVariantAttributeValue } from "../lib/variant-editor";

function emptyToUndefined(value: unknown) {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }

  return value;
}

const requiredTrimmedString = z.string().trim().min(1);

const variantAttributeSchema = z.object({
  name: z.enum(ADMIN_PRODUCT_VARIANT_ATTRIBUTE_NAMES),
  value: z.string().trim().min(1, "El valor del atributo es obligatorio.").max(80),
});

export const adminProductVariantFormSchema = z.object({
  productId: requiredTrimmedString,
  rev: requiredTrimmedString,
  operation: z.enum(["upsert", "deactivate"]),
  variantKey: z.string().trim().optional(),
  title: z.string().trim().min(1, "El nombre de la variante es obligatorio.").max(120),
  value: z
    .string()
    .trim()
    .min(1, "El valor interno es obligatorio.")
    .max(80)
    .refine((value) => normalizeVariantAttributeValue(value).length > 0, "El valor interno es obligatorio."),
  sku: z.preprocess(emptyToUndefined, z.string().trim().max(80).optional()),
  basePrice: z.preprocess(emptyToUndefined, z.coerce.number().finite().positive().optional()),
  stock: z.preprocess(emptyToUndefined, z.coerce.number().finite().int().min(0)),
  isActive: z.enum(["true", "false"]).transform((value) => value === "true"),
  attributesJson: requiredTrimmedString,
});

export type AdminProductVariantFormValues = z.infer<typeof adminProductVariantFormSchema>;
export type AdminProductVariantAttributeInput = z.infer<typeof variantAttributeSchema>;

export function parseAdminProductVariantAttributes(rawValue: string) {
  const parsed = JSON.parse(rawValue) as unknown;
  const attributes = z.array(variantAttributeSchema).parse(parsed);
  const deduped = new Map<string, AdminProductVariantAttributeInput>();

  for (const attribute of attributes) {
    if (!deduped.has(attribute.name)) {
      deduped.set(attribute.name, attribute);
    }
  }

  const normalized = [...deduped.values()];
  const combinationKey = buildVariantCombinationKey(
    normalized.map((attribute) => ({
      name: attribute.name,
      value: attribute.value,
    })),
  );

  return {
    attributes: normalized,
    combinationKey,
  };
}
