import { z } from "zod";
import { booleanSelectSchema, optionalIntegerSchema, requiredIntegerSchema } from "./product-form-shared";

export const adminProductQuickEditFormSchema = z.object({
  productId: z.string().trim().min(1, "Seleccioná un producto válido."),
  rev: z.string().trim().min(1, "La revisión del producto es obligatoria."),
  stock: optionalIntegerSchema,
  isActive: booleanSelectSchema,
  isOnOffer: booleanSelectSchema,
  showInNewIn: booleanSelectSchema,
  newInOrder: optionalIntegerSchema,
});

export const adminProductQuickEditSimpleStockSchema = requiredIntegerSchema;

export type AdminProductQuickEditFormValues = z.infer<typeof adminProductQuickEditFormSchema>;
