"use server";

import { requireAdminSession } from "@/features/admin/auth";
import { logger } from "@/lib/logger";
import { AdminCategorySlugTakenError, createAdminCategory } from "../server/admin-category-service";
import { adminCategoryFormSchema } from "../validation/category";
import type { AdminCategoryActionState, AdminCategoryField } from "../types";

const DEFAULT_STATE: AdminCategoryActionState = { status: "idle" };

function extractFieldErrors(error: unknown) {
  if (!error || typeof error !== "object" || !("issues" in error)) {
    return {};
  }

  const issues = (error as { issues?: Array<{ path: Array<string | number>; message: string }> }).issues ?? [];
  const fieldErrors: Partial<Record<AdminCategoryField, string[]>> = {};

  for (const issue of issues) {
    const field = issue.path[0];
    if (typeof field !== "string") {
      continue;
    }

    const key = field as AdminCategoryField;
    fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
  }

  return fieldErrors;
}

export async function createCategoryAction(
  previousState: AdminCategoryActionState = DEFAULT_STATE,
  formData: FormData,
): Promise<AdminCategoryActionState> {
  void previousState;
  await requireAdminSession();

  const parsed = adminCategoryFormSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    description: String(formData.get("description") ?? ""),
    order: String(formData.get("order") ?? ""),
  });

  if (!parsed.success) {
    return { status: "error", message: "Revisá los campos marcados.", fieldErrors: extractFieldErrors(parsed.error) };
  }

  try {
    const node = await createAdminCategory(parsed.data);
    return { status: "success", message: "Categoría creada.", node };
  } catch (error) {
    if (error instanceof AdminCategorySlugTakenError) {
      return { status: "error", message: "Esa URL ya está en uso.", fieldErrors: { slug: [error.message] } };
    }

    logger.error("admin.category.create_failed", { error: error instanceof Error ? error.message : String(error) });
    return { status: "error", message: "No pudimos crear la categoría. Intentá de nuevo." };
  }
}
