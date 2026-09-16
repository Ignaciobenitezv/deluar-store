"use server";

import { requireAdminSession } from "@/features/admin/auth";
import { logger } from "@/lib/logger";
import { cancelProductDraft } from "../server/admin-product-draft-service";

export type CancelProductDraftResult = { status: "success" } | { status: "error"; message: string };

/** The one abandonment path this task implements: an explicit Cancelar
 * deletes the draft. Closing the tab without cancelling leaves it orphaned
 * on purpose — see admin-product-draft-service.ts's `cancelProductDraft` doc
 * comment. */
export async function cancelProductDraftAction(publishedId: string): Promise<CancelProductDraftResult> {
  await requireAdminSession();

  if (!/^[a-zA-Z0-9_-]{8,64}$/.test(publishedId)) {
    return { status: "error", message: "Identificador de borrador inválido." };
  }

  try {
    await cancelProductDraft(publishedId);
    return { status: "success" };
  } catch (error) {
    logger.error("admin.product.draft_cancel_failed", {
      publishedId,
      error: error instanceof Error ? error.message : String(error),
    });

    return { status: "error", message: "No pudimos cancelar el borrador. Intentá de nuevo." };
  }
}
