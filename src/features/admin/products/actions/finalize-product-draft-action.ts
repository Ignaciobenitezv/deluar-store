"use server";

import { requireAdminSession } from "@/features/admin/auth";
import { logger } from "@/lib/logger";
import {
  AdminProductCategoryMissingError,
  AdminProductDraftConflictError,
  AdminProductDraftNotFoundError,
  AdminProductSlugTakenError,
  AdminProductUnreadableError,
  finalizeProductDraft,
} from "../server/admin-product-draft-service";
import { parseAdminProductLogisticsFormData } from "../validation/product-logistics";
import { adminProductFinalizeFormSchema } from "../validation/detail-product";
import type { AdminProductDetailActionState, AdminProductDetailField } from "../types";

const DEFAULT_ACTION_STATE: AdminProductDetailActionState = { status: "idle" };

type FieldErrors = Partial<Record<AdminProductDetailField, string[]>>;

function extractFieldErrors(error: unknown): FieldErrors {
  if (!error || typeof error !== "object" || !("issues" in error)) {
    return {};
  }

  const issues = (error as { issues?: Array<{ path: Array<string | number>; message: string }> }).issues ?? [];
  const fieldErrors: FieldErrors = {};

  for (const issue of issues) {
    const field = issue.path[0];

    if (typeof field !== "string") {
      continue;
    }

    // `descriptionJson` is the wire field; the rich text editor renders its
    // error under `description`, same as the delta/update path does.
    const key = (field === "descriptionJson" ? "description" : field) as AdminProductDetailField;
    fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
  }

  return fieldErrors;
}

/**
 * "Crear producto" while the screen is still showing a draft. Reuses the
 * exact validation Editar producto already enforces (same schema, full
 * values rather than a delta — a draft has no prior "saved" baseline to
 * diff against). On success the draft is gone and a real published document
 * exists; on failure the draft is untouched and the admin keeps editing.
 */
export async function finalizeProductDraftAction(
  previousState: AdminProductDetailActionState = DEFAULT_ACTION_STATE,
  formData: FormData,
): Promise<AdminProductDetailActionState> {
  void previousState;

  await requireAdminSession();

  const publishedId = String(formData.get("productId") ?? "");
  const rev = String(formData.get("rev") ?? "");

  const parsed = adminProductFinalizeFormSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    shortDescription: String(formData.get("shortDescription") ?? ""),
    descriptionJson: String(formData.get("descriptionJson") ?? ""),
    categoryId: String(formData.get("categoryId") ?? ""),
    subcategoryId: String(formData.get("subcategoryId") ?? ""),
    basePrice: String(formData.get("basePrice") ?? ""),
    stock: String(formData.get("stock") ?? ""),
    isActive: String(formData.get("isActive") ?? "false"),
    isFeatured: String(formData.get("isFeatured") ?? "false"),
    isOnOffer: String(formData.get("isOnOffer") ?? "false"),
    showInNewIn: String(formData.get("showInNewIn") ?? "false"),
    newInOrder: String(formData.get("newInOrder") ?? ""),
    weightGrams: String(formData.get("weightGrams") ?? ""),
    heightCm: String(formData.get("heightCm") ?? ""),
    widthCm: String(formData.get("widthCm") ?? ""),
    depthCm: String(formData.get("depthCm") ?? ""),
    seoTitle: String(formData.get("seoTitle") ?? ""),
    seoDescription: String(formData.get("seoDescription") ?? ""),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisá los campos marcados.",
      fieldErrors: extractFieldErrors(parsed.error),
    };
  }

  // Reuses the same all-or-nothing logistics rule Editar producto enforces
  // (its own errors, since it's parsed separately from the schema above).
  const logisticsResult = parseAdminProductLogisticsFormData(formData);

  if (logisticsResult.status === "error") {
    return { status: "error", message: "Revisá los campos marcados.", fieldErrors: logisticsResult.fieldErrors };
  }

  try {
    const product = await finalizeProductDraft({ publishedId, rev, values: parsed.data });

    return {
      status: "success",
      message: "Producto creado.",
      rev: product.rev,
      updatedAt: product.updatedAt,
      product,
    };
  } catch (error) {
    if (error instanceof AdminProductSlugTakenError) {
      return { status: "error", message: "Esa URL ya está en uso.", fieldErrors: { slug: [error.message] } };
    }

    if (error instanceof AdminProductCategoryMissingError) {
      return { status: "error", message: error.message, fieldErrors: { categoryId: [error.message] } };
    }

    if (error instanceof AdminProductDraftNotFoundError) {
      return { status: "error", message: error.message };
    }

    if (error instanceof AdminProductDraftConflictError) {
      return { status: "conflict", message: error.message };
    }

    if (error instanceof AdminProductUnreadableError) {
      return { status: "error", message: error.message };
    }

    logger.error("admin.product.draft_finalize_failed", {
      publishedId,
      error: error instanceof Error ? error.message : String(error),
    });

    return { status: "error", message: "No pudimos crear el producto. Intentá de nuevo." };
  }
}
