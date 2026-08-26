"use server";

import { requireAdminSession } from "@/features/admin/auth";
import { updateAdminProductQuickEdit } from "../server/admin-product-quick-edit-service";
import {
  adminProductQuickEditFormSchema,
  type AdminProductQuickEditFormValues,
} from "../validation/quick-edit-product";
import type { AdminProductQuickEditActionState, AdminProductQuickEditField } from "../types";

const DEFAULT_ACTION_STATE: AdminProductQuickEditActionState = {
  status: "idle",
};

function extractFieldErrors(error: unknown) {
  if (!error || typeof error !== "object" || !("issues" in error)) {
    return {};
  }

  const issues = (error as { issues?: Array<{ path: Array<string | number>; message: string }> }).issues ?? [];
  const fieldErrors: Partial<Record<AdminProductQuickEditField | "productId" | "rev", string[]>> = {};

  for (const issue of issues) {
    const field = issue.path[0];

    if (typeof field !== "string") {
      continue;
    }

    const key = field as AdminProductQuickEditField | "productId" | "rev";
    fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
  }

  return fieldErrors;
}

function buildErrorState(
  message: string,
  fieldErrors?: Partial<Record<AdminProductQuickEditField | "productId" | "rev", string[]>>,
) {
  return {
    status: "error" as const,
    message,
    fieldErrors,
  };
}

export async function updateProductQuickEditAction(
  previousState: AdminProductQuickEditActionState = DEFAULT_ACTION_STATE,
  formData: FormData,
): Promise<AdminProductQuickEditActionState> {
  void previousState;

  await requireAdminSession();

  const rawValues = {
    productId: String(formData.get("productId") ?? ""),
    rev: String(formData.get("rev") ?? ""),
    stock: formData.get("stock"),
    isActive: String(formData.get("isActive") ?? ""),
    isOnOffer: String(formData.get("isOnOffer") ?? ""),
    showInNewIn: String(formData.get("showInNewIn") ?? ""),
    newInOrder: formData.get("newInOrder"),
  };

  const parsed = adminProductQuickEditFormSchema.safeParse(rawValues);

  if (!parsed.success) {
    return buildErrorState("Revisá los campos marcados.", extractFieldErrors(parsed.error));
  }

  const result = await updateAdminProductQuickEdit(parsed.data as AdminProductQuickEditFormValues);

  if (result.status === "success") {
    return result;
  }

  return result;
}
