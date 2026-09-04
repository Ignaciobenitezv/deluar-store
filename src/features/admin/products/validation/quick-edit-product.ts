import { z } from "zod";
import { booleanSelectSchema, optionalIntegerSchema, requiredIntegerSchema } from "./product-form-shared";

const requiredTrimmedString = z.string().trim().min(1);

export const adminProductQuickEditFormSchema = z.object({
  productId: requiredTrimmedString,
  rev: requiredTrimmedString,
  stockValuesJson: requiredTrimmedString,
  isActive: booleanSelectSchema,
  isOnOffer: booleanSelectSchema,
  showInNewIn: booleanSelectSchema,
  newInOrder: optionalIntegerSchema,
});

export const adminProductQuickEditSimpleStockSchema = requiredIntegerSchema;

export type AdminProductQuickEditFormValues = z.infer<typeof adminProductQuickEditFormSchema>;
