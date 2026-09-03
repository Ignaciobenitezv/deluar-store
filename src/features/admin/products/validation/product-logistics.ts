import { z } from "zod";
import {
  PRODUCT_LOGISTICS_FIELD_NAMES,
  type ProductLogistics,
} from "@/features/catalog/logistics";
import { emptyToUndefined } from "./product-form-shared";

const logisticsValueSchema = z.preprocess(
  emptyToUndefined,
  z.coerce.number().finite().positive().optional(),
);

export const adminProductLogisticsFormSchema = z
  .object({
    weightGrams: logisticsValueSchema,
    heightCm: logisticsValueSchema,
    widthCm: logisticsValueSchema,
    depthCm: logisticsValueSchema,
  })
  .superRefine((value, context) => {
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

export type AdminProductLogisticsFormValues = z.infer<typeof adminProductLogisticsFormSchema>;

export function normalizeAdminProductLogistics(
  value?: Partial<ProductLogistics> | null,
): ProductLogistics | null {
  if (!value) {
    return null;
  }

  if (!PRODUCT_LOGISTICS_FIELD_NAMES.every((field) => {
    const candidateValue = value[field];
    return typeof candidateValue === "number" && Number.isFinite(candidateValue) && candidateValue > 0;
  })) {
    return null;
  }

  return {
    weightGrams: value.weightGrams as number,
    heightCm: value.heightCm as number,
    widthCm: value.widthCm as number,
    depthCm: value.depthCm as number,
  };
}

export function hasCompleteAdminProductLogistics(
  value?: Partial<ProductLogistics> | null,
) {
  return normalizeAdminProductLogistics(value) !== null;
}

export function parseAdminProductLogisticsFormData(formData: FormData) {
  const parsed = adminProductLogisticsFormSchema.safeParse({
    weightGrams: formData.get("weightGrams"),
    heightCm: formData.get("heightCm"),
    widthCm: formData.get("widthCm"),
    depthCm: formData.get("depthCm"),
  });

  if (!parsed.success) {
    const fieldErrors: Partial<Record<(typeof PRODUCT_LOGISTICS_FIELD_NAMES)[number], string[]>> = {};

    for (const issue of parsed.error.issues) {
      const field = issue.path[0];

      if (typeof field !== "string") {
        continue;
      }

      const key = field as (typeof PRODUCT_LOGISTICS_FIELD_NAMES)[number];
      fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
    }

    return {
      status: "error" as const,
      fieldErrors,
    };
  }

  if (!filledLogistics(parsed.data)) {
    return {
      status: "unset" as const,
    };
  }

  return {
    status: "set" as const,
    value: {
      weightGrams: parsed.data.weightGrams as number,
      heightCm: parsed.data.heightCm as number,
      widthCm: parsed.data.widthCm as number,
      depthCm: parsed.data.depthCm as number,
    } satisfies ProductLogistics,
  };
}

function filledLogistics(value: AdminProductLogisticsFormValues) {
  return PRODUCT_LOGISTICS_FIELD_NAMES.every((field) => typeof value[field] === "number");
}
