"use server";

import { requireAdminSession } from "@/features/admin/auth";
import { logger } from "@/lib/logger";
import {
  AdminCategoryNotFoundError,
  AdminCategoryParentInvalidError,
  AdminCategorySlugTakenError,
  createAdminSubcategory,
} from "../server/admin-category-service";
import { adminSubcategoryFormSchema } from "../validation/category";
import type { AdminSubcategoryActionState, AdminSubcategoryField } from "../types";

const DEFAULT_STATE: AdminSubcategoryActionState = { status: "idle" };

function extractFieldErrors(error: unknown) {
  if (!error || typeof error !== "object" || !("issues" in error)) {
    return {};
  }

  const issues = (error as { issues?: Array<{ path: Array<string | number>; message: string }> }).issues ?? [];
  const fieldErrors: Partial<Record<AdminSubcategoryField, string[]>> = {};

  for (const issue of issues) {
    const field = issue.path[0];
    if (typeof field !== "string") {
      continue;
    }

    const key = field as AdminSubcategoryField;
    fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
  }

  return fieldErrors;
}

export async function createSubcategoryAction(
  previousState: AdminSubcategoryActionState = DEFAULT_STATE,
  formData: FormData,
): Promise<AdminSubcategoryActionState> {
  void previousState;
  await requireAdminSession();

  const parsed = adminSubcategoryFormSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    description: String(formData.get("description") ?? ""),
    order: String(formData.get("order") ?? ""),
    parentId: String(formData.get("parentId") ?? ""),
  });

  if (!parsed.success) {
    return { status: "error", message: "Revisá los campos marcados.", fieldErrors: extractFieldErrors(parsed.error) };
  }

  try {
    const node = await createAdminSubcategory(parsed.data);
    return { status: "success", message: "Subcategoría creada.", node };
  } catch (error) {
    if (error instanceof AdminCategorySlugTakenError) {
      return { status: "error", message: "Esa URL ya está en uso.", fieldErrors: { slug: [error.message] } };
    }

    if (error instanceof AdminCategoryParentInvalidError || error instanceof AdminCategoryNotFoundError) {
      return { status: "error", message: error.message, fieldErrors: { parentId: [error.message] } };
    }

    logger.error("admin.subcategory.create_failed", { error: error instanceof Error ? error.message : String(error) });
    return { status: "error", message: "No pudimos crear la subcategoría. Intentá de nuevo." };
  }
}
