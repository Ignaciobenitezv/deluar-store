"use server";

import { updateTag } from "next/cache";
import { getBetterAuthSession, isBetterAuthAdminRole } from "@/features/admin/better-auth";
import {
  MAX_PRODUCT_IMAGE_UPLOAD_BYTES,
  isAllowedProductImageMimeType,
} from "@/features/admin/products/lib/product-image-constraints";
import { STOREFRONT_COPY_CACHE_TAG } from "@/features/storefront-copy/server/get-storefront-copy";
import { isImageAssetRef } from "@/features/storefront-copy/storefront-copy-document";
import type { ProductSummary } from "@/features/storefront-copy/editor";
import { sanityFreshFetch, sanityWriteClient } from "@/integrations/sanity/client";
import { productPickerSearchQuery } from "@/integrations/sanity/queries";
import { logger } from "@/lib/logger";
import type { ProductDocument } from "@/types/cms";
import { toProductSummary } from "../server/storefront-copy-data";
import {
  discardCopyDraft,
  guardCopyWrite,
  publishCopy,
  readCopySnapshot,
  saveCopyDraft,
  type CopyWriteInput,
  type CopyWriteResult,
} from "../server/storefront-copy-service";
import { createSanityCopyStore } from "../server/storefront-copy-store";

// Configuración → Textos writes. Owner and admin only (editor excluded), checked
// on every call without redirecting, like the Apariencia actions.

async function isCopyAdmin() {
  const session = await getBetterAuthSession();

  return Boolean(session && isBetterAuthAdminRole(session.user.role));
}

const logFailure = (operation: string) => (error: unknown) =>
  logger.error(`admin.storefront_copy.${operation}_failed`, {
    error: error instanceof Error ? error.message : String(error),
  });

export async function saveStorefrontCopyDraftAction(input: CopyWriteInput): Promise<CopyWriteResult> {
  return guardCopyWrite(isCopyAdmin, createSanityCopyStore(), (store) => saveCopyDraft(store, input), logFailure("save_draft"));
}

export async function publishStorefrontCopyAction(input: CopyWriteInput): Promise<CopyWriteResult> {
  return guardCopyWrite(
    isCopyAdmin,
    createSanityCopyStore(),
    async (store) => {
      const result = await publishCopy(store, input, () => {
        updateTag(STOREFRONT_COPY_CACHE_TAG);
      });

      if (result.status === "success") {
        logger.info("admin.storefront_copy.published");
      }

      return result;
    },
    logFailure("publish"),
  );
}

export async function discardStorefrontCopyDraftAction(input: { savedRevision: unknown }): Promise<CopyWriteResult> {
  return guardCopyWrite(isCopyAdmin, createSanityCopyStore(), (store) => discardCopyDraft(store, input), logFailure("discard_draft"));
}

export type HeroImageUploadResult =
  | { status: "success"; assetRef: string }
  | { status: "error"; message: string };

/**
 * Uploads a hero photo to Sanity's asset store and returns its id. Nothing on
 * the store changes: the slide only uses it once the texts draft that
 * references it is published. Same file limits as product photos.
 */
export async function uploadHeroImageAction(formData: FormData): Promise<HeroImageUploadResult> {
  if (!(await isCopyAdmin())) {
    return { status: "error", message: "Tu usuario no tiene permiso para cambiar fotos de la tienda." };
  }

  const client = sanityWriteClient;

  if (!client) {
    return { status: "error", message: "Faltan las credenciales de escritura de Sanity en el servidor." };
  }

  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Elegí una imagen." };
  }

  if (!isAllowedProductImageMimeType(file.type)) {
    return { status: "error", message: "La foto tiene que ser JPG, PNG o WebP." };
  }

  if (file.size > MAX_PRODUCT_IMAGE_UPLOAD_BYTES) {
    return { status: "error", message: "La foto supera los 10 MB." };
  }

  try {
    const asset = await client.assets.upload("image", file, { filename: file.name || "hero.jpg", contentType: file.type });

    if (!isImageAssetRef(asset._id)) {
      throw new Error(`Unexpected asset id ${asset._id}`);
    }

    logger.info("admin.storefront_copy.hero_image_uploaded", { assetRef: asset._id });
    return { status: "success", assetRef: asset._id };
  } catch (error) {
    logFailure("hero_image_upload")(error);
    return { status: "error", message: "No pudimos subir la foto. Intentá de nuevo." };
  }
}

export type ProductSearchResult =
  | { status: "success"; products: ProductSummary[] }
  | { status: "error"; message: string };

/** Product picker search: published products by title, for adding to a home list. */
export async function searchPickerProductsAction(term: string): Promise<ProductSearchResult> {
  if (!(await isCopyAdmin())) {
    return { status: "error", message: "Tu usuario no tiene permiso para elegir productos de la tienda." };
  }

  // Words only: GROQ `match` treats * and quotes specially. Each word matches a title word prefix.
  const words = String(term ?? "")
    .normalize("NFC")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6);

  if (words.length === 0) {
    return { status: "success", products: [] };
  }

  try {
    const products = await sanityFreshFetch<ProductDocument[]>(productPickerSearchQuery, {
      term: words.map((word) => `${word.slice(0, 40)}*`),
    });

    return { status: "success", products: products.map(toProductSummary) };
  } catch (error) {
    logFailure("product_search")(error);
    return { status: "error", message: "No pudimos buscar productos. Intentá de nuevo." };
  }
}

export async function reloadStorefrontCopyAction(): Promise<CopyWriteResult> {
  return guardCopyWrite(
    isCopyAdmin,
    createSanityCopyStore(),
    async (store) => ({ status: "success", message: "Versión actual cargada.", snapshot: await readCopySnapshot(store) }),
    logFailure("reload"),
  );
}
