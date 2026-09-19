"use server";

import { requireAdminSession } from "@/features/admin/auth";
import { applyAdminInventoryStockChanges } from "../server/admin-inventory-stock-service";
import { inventoryStockChangesSchema } from "../validation/inventory-stock";
import type { AdminInventoryApplyResult } from "../server/admin-inventory-stock-service";

export type ApplyInventoryStockChangesState =
  | { status: "success"; result: AdminInventoryApplyResult }
  | { status: "error"; message: string };

export async function applyInventoryStockChangesAction(
  changesJson: string,
): Promise<ApplyInventoryStockChangesState> {
  await requireAdminSession();

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(changesJson);
  } catch {
    return { status: "error", message: "No pudimos interpretar los cambios enviados." };
  }

  const parsed = inventoryStockChangesSchema.safeParse(parsedJson);

  if (!parsed.success) {
    return { status: "error", message: "Revisá los cambios: alguno tiene un valor inválido." };
  }

  const result = await applyAdminInventoryStockChanges(parsed.data);

  return { status: "success", result };
}
