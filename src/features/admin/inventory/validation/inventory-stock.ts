import { z } from "zod";
import { requiredIntegerSchema } from "@/features/admin/products/validation/product-form-shared";

const inventoryStockChangeRowSchema = z.object({
  key: z.string().trim().min(1),
  kind: z.enum(["base", "variant"]),
  originalStock: requiredIntegerSchema,
  newStock: requiredIntegerSchema,
});

const inventoryStockChangeProductSchema = z.object({
  productId: z.string().trim().min(1),
  rows: z.array(inventoryStockChangeRowSchema).min(1),
});

export const inventoryStockChangesSchema = z.array(inventoryStockChangeProductSchema).min(1);

export type InventoryStockChangeRow = z.infer<typeof inventoryStockChangeRowSchema>;
export type InventoryStockChangeProduct = z.infer<typeof inventoryStockChangeProductSchema>;

export function parseInventoryStockChangesJson(rawValue: string) {
  const parsed = JSON.parse(rawValue) as unknown;
  return inventoryStockChangesSchema.parse(parsed);
}
