"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/features/admin/auth";
import { sanityAdminEditFetch, sanityFreshFetch } from "@/integrations/sanity/client";
import { adminProductDetailQuery } from "@/integrations/sanity/admin-queries";
import { logger } from "@/lib/logger";
import { getAdminProductsWriteClient } from "../server/admin-products-write-client";
import { cleanupProductImageAssetsAction } from "./update-product-images-action";

type AdminProductDeleteDocument = {
  _id: string;
  _rev: string;
  title: string;
  slug?: string;
  images?: Array<{
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

type HomePageReference = {
  _ref?: string;
  _key?: string;
  _type?: string;
  _weak?: boolean;
};

type HomePageProductReferencesDocument = {
  _id: string;
  spotlightProduct?: HomePageReference | null;
  featuredProducts?: HomePageReference[];
  campaignFeaturedProducts?: HomePageReference[];
};

export type DeleteProductActionState =
  | { status: "success" }
  | { status: "conflict"; message: string }
  | { status: "error"; message: string };

const homePageProductReferencesQuery = `*[_type == "homePage"][0]{
  _id,
  spotlightProduct,
  featuredProducts,
  campaignFeaturedProducts
}`;

function stripDraftPrefix(id: string) {
  return id.replace(/^drafts\./, "");
}

function referenceMatchesTarget(reference: HomePageReference | null | undefined, targetId: string) {
  const ref = reference?._ref;
  return Boolean(ref) && stripDraftPrefix(ref!) === targetId;
}

function buildRevalidationPaths(product: AdminProductDeleteDocument) {
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

/**
 * Deletes a product permanently — distinct from the "No visible" (`isActive`)
 * toggle, which keeps the document and only hides it from the storefront.
 *
 * Order history is never at risk: `OrderItem`/`ProductSnapshot` (Postgres)
 * store a denormalized copy of the product at purchase time (title, slug,
 * price, image) keyed by a plain string, not a live reference — deleting the
 * Sanity document cannot affect them. See prisma/schema.prisma.
 *
 * `homePage` is the only document type that holds a live *reference* to a
 * product (`featuredProducts[]`, `campaignFeaturedProducts[]`,
 * `spotlightProduct`), and those references are strong (not `weak: true`) —
 * Sanity refuses to delete a document that's still strongly referenced, so
 * any matching entries are cleared in the same transaction as the delete.
 */
export async function deleteProductAction(productId: string, rev: string): Promise<DeleteProductActionState> {
  await requireAdminSession();

  const trimmedProductId = productId.trim();
  const trimmedRev = rev.trim();

  if (!trimmedProductId || !trimmedRev) {
    return { status: "error", message: "No pudimos identificar el producto a eliminar." };
  }

  // Re-read on the server — the client's `rev` is only ever used below as an
  // optimistic-concurrency check, never trusted as proof the product still
  // looks like this.
  const currentProduct = await sanityAdminEditFetch<AdminProductDeleteDocument | null>(adminProductDetailQuery, {
    productId: trimmedProductId,
  });

  if (!currentProduct) {
    return { status: "error", message: "El producto ya no existe." };
  }

  if (currentProduct._rev !== trimmedRev) {
    return {
      status: "conflict",
      message: "El producto cambió desde que abriste el editor. Recargá la página antes de eliminarlo.",
    };
  }

  const assetRefs = (currentProduct.images ?? [])
    .map((image) => image.image?.asset?._ref)
    .filter((ref): ref is string => Boolean(ref));

  const targetId = stripDraftPrefix(currentProduct._id);

  try {
    const writeClient = getAdminProductsWriteClient();
    const homePage = await sanityFreshFetch<HomePageProductReferencesDocument | null>(
      homePageProductReferencesQuery,
      {},
    );

    let transaction = writeClient.transaction();

    if (homePage) {
      const homePagePatchSet: Record<string, unknown> = {};
      const homePagePatchUnset: string[] = [];

      if (referenceMatchesTarget(homePage.spotlightProduct, targetId)) {
        homePagePatchUnset.push("spotlightProduct");
      }

      const featuredProducts = homePage.featuredProducts ?? [];
      const nextFeaturedProducts = featuredProducts.filter((item) => !referenceMatchesTarget(item, targetId));
      if (nextFeaturedProducts.length !== featuredProducts.length) {
        homePagePatchSet.featuredProducts = nextFeaturedProducts;
      }

      const campaignFeaturedProducts = homePage.campaignFeaturedProducts ?? [];
      const nextCampaignFeaturedProducts = campaignFeaturedProducts.filter(
        (item) => !referenceMatchesTarget(item, targetId),
      );
      if (nextCampaignFeaturedProducts.length !== campaignFeaturedProducts.length) {
        homePagePatchSet.campaignFeaturedProducts = nextCampaignFeaturedProducts;
      }

      const homePageChanged = homePagePatchUnset.length > 0 || Object.keys(homePagePatchSet).length > 0;

      if (homePageChanged) {
        transaction = transaction.patch(homePage._id, (patch) => {
          let nextPatch = patch;

          if (Object.keys(homePagePatchSet).length > 0) {
            nextPatch = nextPatch.set(homePagePatchSet);
          }

          if (homePagePatchUnset.length > 0) {
            nextPatch = nextPatch.unset(homePagePatchUnset);
          }

          return nextPatch;
        });

        logger.info("admin.product.delete_cleared_home_page_references", {
          productId: trimmedProductId,
          clearedSpotlight: homePagePatchUnset.includes("spotlightProduct"),
          clearedFeaturedCount: featuredProducts.length - nextFeaturedProducts.length,
          clearedCampaignFeaturedCount: campaignFeaturedProducts.length - nextCampaignFeaturedProducts.length,
        });
      }
    }

    transaction = transaction.delete(currentProduct._id);

    await transaction.commit();

    logger.info("admin.product.deleted", { productId: trimmedProductId });
  } catch (error) {
    logger.error("admin.product.delete_failed", {
      productId: trimmedProductId,
      error: error instanceof Error ? error.message : String(error),
    });

    return { status: "error", message: "No pudimos eliminar el producto. Intentá de nuevo." };
  }

  for (const path of buildRevalidationPaths(currentProduct)) {
    revalidatePath(path);
  }

  // Garbage-collection of orphaned image assets is best-effort cleanup, not
  // part of the delete outcome: the product is already gone at this point,
  // so a failure here must never be reported to the user as a failed delete.
  try {
    await cleanupProductImageAssetsAction(assetRefs);
  } catch (error) {
    logger.error("admin.product.delete_asset_cleanup_failed", {
      productId: trimmedProductId,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return { status: "success" };
}
