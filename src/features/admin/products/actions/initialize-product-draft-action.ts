"use server";

import { requireAdminSession } from "@/features/admin/auth";
import { logger } from "@/lib/logger";
import { initializeProductDraft } from "../server/admin-product-draft-service";
import type { AdminProductDetailData } from "../types";

export type InitializeProductDraftResult =
  | { status: "success"; product: AdminProductDetailData }
  | { status: "error"; message: string };

/**
 * `publishedId` is generated once, client-side, when the Crear producto
 * screen first mounts (`useState(() => crypto.randomUUID())`) — stable
 * across React Strict Mode's double-invoke, Fast Refresh, and an accidental
 * retry, so this can be called more than once with the same id and still
 * only ever produce one draft (`initializeProductDraft` uses
 * `createIfNotExists`).
 */
export async function initializeProductDraftAction(publishedId: string): Promise<InitializeProductDraftResult> {
  await requireAdminSession();

  if (!/^[a-zA-Z0-9_-]{8,64}$/.test(publishedId)) {
    return { status: "error", message: "Identificador de borrador inválido." };
  }

  try {
    const product = await initializeProductDraft(publishedId);
    return { status: "success", product };
  } catch (error) {
    logger.error("admin.product.draft_init_failed", {
      publishedId,
      error: error instanceof Error ? error.message : String(error),
    });

    return { status: "error", message: "No pudimos preparar el borrador." };
  }
}
