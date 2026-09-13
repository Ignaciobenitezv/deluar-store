"use server";

import { requireAdminSession } from "@/features/admin/auth";
import { logger } from "@/lib/logger";
import {
  AdminProductCategoryMissingError,
  AdminProductSlugTakenError,
  createAdminProduct,
} from "../server/admin-product-create-service";
import { AdminProductsWriteUnavailableError } from "../server/admin-products-write-client";
import {
  adminProductCreateFormSchema,
  type AdminProductCreateField,
} from "../validation/create-product";
import type { AdminProductCreateActionState } from "../types";

const DEFAULT_ACTION_STATE: AdminProductCreateActionState = { status: "idle" };

type FieldErrors = Partial<Record<AdminProductCreateField, string[]>>;

function extractFieldErrors(error: unknown): FieldErrors {
  if (!error || typeof error !== "object" || !("issues" in error)) {
    return {};
  }

  const issues =
    (error as { issues?: Array<{ path: Array<string | number>; message: string }> }).issues ?? [];
  const fieldErrors: FieldErrors = {};

  for (const issue of issues) {
    const field = issue.path[0];

    if (typeof field !== "string") {
      continue;
    }

    const key = field as AdminProductCreateField;
    fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
  }

  return fieldErrors;
}

export async function createProductAction(
  previousState: AdminProductCreateActionState = DEFAULT_ACTION_STATE,
  formData: FormData,
): Promise<AdminProductCreateActionState> {
  void previousState;

  await requireAdminSession();

  const parsed = adminProductCreateFormSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    categoryId: String(formData.get("categoryId") ?? ""),
    subcategoryId: String(formData.get("subcategoryId") ?? ""),
    shortDescription: String(formData.get("shortDescription") ?? ""),
    description: String(formData.get("description") ?? ""),
    basePrice: String(formData.get("basePrice") ?? ""),
    transferPrice: String(formData.get("transferPrice") ?? ""),
    stock: String(formData.get("stock") ?? ""),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisá los campos marcados.",
      fieldErrors: extractFieldErrors(parsed.error),
    };
  }

  try {
    const result = await createAdminProduct(parsed.data);

    return {
      status: "success",
      message: "Producto creado. Agregá las imágenes para poder publicarlo.",
      productId: result.productId,
      slug: result.slug,
    };
  } catch (error) {
    if (error instanceof AdminProductSlugTakenError) {
      return {
        status: "error",
        message: "Esa URL ya está en uso.",
        fieldErrors: { slug: [error.message] },
      };
    }

    if (error instanceof AdminProductCategoryMissingError) {
      return {
        status: "error",
        message: error.message,
        fieldErrors: { categoryId: [error.message] },
      };
    }

    if (error instanceof AdminProductsWriteUnavailableError) {
      return {
        status: "error",
        message: "No hay credenciales de escritura de Sanity configuradas.",
      };
    }

    logger.error("admin.product.create_failed", {
      error: error instanceof Error ? error.message : "unknown_error",
    });

    return {
      status: "error",
      message: "No pudimos crear el producto. Intentá de nuevo.",
    };
  }
}
