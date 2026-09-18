"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/features/admin/auth";
import { sanityAdminEditFetch } from "@/integrations/sanity/client";
import { adminProductDetailQuery } from "@/integrations/sanity/admin-queries";
import { TIENDANUBE_PLACEHOLDER_IMAGE_ASSET_REF } from "@/integrations/sanity/image";
import { logger } from "@/lib/logger";
import { getAdminProductsWriteClient } from "../server/admin-products-write-client";
import { adminImageHotspotSchema, type AdminImageHotspot } from "../validation/product-images";

type AdminProductImageHotspotDocument = {
  _id: string;
  _rev: string;
  slug?: string;
  images?: Array<{
    _key?: string;
    image?: {
      asset?: {
        _ref?: string;
      };
    };
  }>;
  category?: {
    slug?: string;
  };
  subcategory?: {
    slug?: string;
  };
};

export type UpdateProductImageHotspotActionState =
  | {
      status: "success";
      rev: string;
      updatedAt: string;
      hotspot: AdminImageHotspot | null;
    }
  | { status: "conflict"; message: string }
  | { status: "error"; message: string };

function isRevisionConflictError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as {
    statusCode?: number;
    response?: { statusCode?: number };
    code?: number;
    message?: string;
  };

  return (
    candidate.statusCode === 409 ||
    candidate.code === 409 ||
    candidate.response?.statusCode === 409 ||
    (typeof candidate.message === "string" && candidate.message.toLowerCase().includes("revision"))
  );
}

function buildRevalidationPaths(product: AdminProductImageHotspotDocument) {
  const paths = new Set<string>(["/admin/productos", `/admin/productos/${product._id}`, "/productos", "/"]);
  const slug = product.slug?.trim();
  const categorySlug = product.category?.slug?.trim();
  const subcategorySlug = product.subcategory?.slug?.trim();

  if (slug) {
    paths.add(`/productos/detalle/${slug}`);
  }

  if (categorySlug) {
    paths.add(`/productos/${categorySlug}`);

    if (subcategorySlug) {
      paths.add(`/productos/${categorySlug}/${subcategorySlug}`);
    }
  }

  return [...paths];
}

function buildImageHotspotPath(imageKey: string) {
  return `images[_key==${JSON.stringify(imageKey)}].image.hotspot`;
}

/**
 * Small, dedicated action for "Ajustar encuadre" — deliberately separate
 * from commitProductImagesAction (alt text / order / upload), which this
 * doesn't touch. Persists (or clears) exactly one image's Sanity-native
 * `image.hotspot`, `_rev`-guarded, via a single array-path patch so the rest
 * of `images[]` is never re-sent or re-validated.
 */
export async function updateProductImageHotspotAction(input: {
  productId: string;
  rev: string;
  imageKey: string;
  hotspot: AdminImageHotspot | null;
}): Promise<UpdateProductImageHotspotActionState> {
  await requireAdminSession();

  const productId = input.productId.trim();
  const imageKey = input.imageKey.trim();
  const rev = input.rev.trim();

  if (!productId || !imageKey || !rev) {
    return { status: "error", message: "No pudimos identificar la imagen a ajustar." };
  }

  if (input.hotspot) {
    const parsedHotspot = adminImageHotspotSchema.safeParse(input.hotspot);

    if (!parsedHotspot.success) {
      return { status: "error", message: "El encuadre enviado no es válido." };
    }
  }

  // Re-read on the server — the client's `rev`/`imageKey` are only ever used
  // below as identifiers and an optimistic-concurrency check, never trusted
  // as proof this image still looks like this.
  const currentProduct = await sanityAdminEditFetch<AdminProductImageHotspotDocument | null>(
    adminProductDetailQuery,
    { productId },
  );

  if (!currentProduct) {
    return { status: "error", message: "No encontramos el producto para ajustar el encuadre." };
  }

  const targetImage = (currentProduct.images ?? []).find((image) => image._key === imageKey);

  if (!targetImage) {
    return { status: "error", message: "No encontramos esa imagen en el producto." };
  }

  if (targetImage.image?.asset?._ref === TIENDANUBE_PLACEHOLDER_IMAGE_ASSET_REF) {
    return { status: "error", message: "El placeholder de Tiendanube no admite ajuste de encuadre." };
  }

  try {
    const writeClient = getAdminProductsWriteClient();
    const hotspotPath = buildImageHotspotPath(imageKey);
    const patch = writeClient.patch(currentProduct._id).ifRevisionId(rev);

    const committedProduct = (await (input.hotspot
      ? patch.set({ [hotspotPath]: input.hotspot })
      : patch.unset([hotspotPath])
    ).commit({ returnDocuments: true })) as { _rev: string; _updatedAt: string };

    for (const path of buildRevalidationPaths(currentProduct)) {
      revalidatePath(path);
    }

    logger.info("admin.product.image_hotspot_updated", {
      productId,
      imageKey,
      cleared: !input.hotspot,
    });

    return {
      status: "success",
      rev: committedProduct._rev,
      updatedAt: committedProduct._updatedAt,
      hotspot: input.hotspot,
    };
  } catch (error) {
    if (isRevisionConflictError(error)) {
      return {
        status: "conflict",
        message: "El producto cambió desde que abriste el editor. Recargá la página antes de ajustar el encuadre.",
      };
    }

    logger.error("admin.product.image_hotspot_update_failed", {
      productId,
      imageKey,
      error: error instanceof Error ? error.message : String(error),
    });

    return { status: "error", message: "No pudimos guardar el encuadre. Intentá de nuevo." };
  }
}
