import "server-only";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { logger } from "@/lib/logger";
import { sanityFetch } from "@/integrations/sanity/client";
import { adminProductQuickEditQuery } from "@/integrations/sanity/admin-queries";
import { getAdminProductsWriteClient } from "./admin-products-write-client";
import { normalizeProductDetail } from "./admin-product-detail-service";
import {
  ADMIN_PRODUCT_DETAIL_SNAPSHOT_COOKIE,
  buildAdminProductDetailSnapshot,
  serializeAdminProductDetailSnapshot,
} from "../lib/admin-product-detail-snapshot";
import type {
  ProductColorVariantDocument,
  ProductVariantDocument,
  SanityImageWithAlt,
} from "@/types/cms";
import { hasProductVariants } from "../lib/product-commercial";
import type { AdminProductQuickEditField } from "../types";
import type { AdminProductQuickEditFormValues } from "../validation/quick-edit-product";

type AdminProductQuickEditDocument = {
  _id: string;
  _rev: string;
  _updatedAt: string;
  slug?: string;
  title: string;
  stock: number;
  isActive?: boolean;
  isOnOffer?: boolean;
  showInNewIn?: boolean;
  newInOrder?: number;
  basePrice: number;
  transferPrice?: number;
  images?: SanityImageWithAlt[];
  category?: {
    _id: string;
    title?: string;
    slug?: string;
  };
  subcategory?: {
    _id: string;
    title?: string;
    slug?: string;
  };
  variants?: Pick<ProductVariantDocument, "_key" | "title" | "value" | "stock" | "isActive">[];
  colorVariants?: Pick<ProductColorVariantDocument, "_key" | "title" | "value" | "stock">[];
};

type AdminProductQuickEditMutationResult =
  | {
      status: "success";
      message: string;
      rev: string;
      updatedAt: string;
    }
  | {
      status: "error";
      message: string;
      fieldErrors?: Partial<Record<AdminProductQuickEditField | "productId" | "rev", string[]>>;
    };

function buildRevalidationPaths(product: AdminProductQuickEditDocument) {
  const paths = new Set<string>(["/admin/productos", "/", "/productos"]);
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

export async function updateAdminProductQuickEdit(
  input: AdminProductQuickEditFormValues,
): Promise<AdminProductQuickEditMutationResult> {
  const product = await sanityFetch<AdminProductQuickEditDocument | null>(
    adminProductQuickEditQuery,
    {
      productId: input.productId,
    },
    {
      useToken: true,
    },
  );

  if (!product) {
    return {
      status: "error",
      message: "No encontramos el producto para actualizar.",
      fieldErrors: {
        productId: ["No encontramos el producto para actualizar."],
      },
    };
  }


  const mutationId = crypto.randomUUID();
  logger.debug("admin.products.mutation_started", {
    mutationId,
    source: "quick_edit",
    productId: input.productId,
    submittedRev: input.rev,
    timestamp: new Date().toISOString(),
  });

  const hasActiveVariants = hasProductVariants({
    title: product.title,
    basePrice: product.basePrice,
    transferPrice: product.transferPrice,
    stock: product.stock,
    images: product.images ?? [],
    variants: product.variants as ProductVariantDocument[] | undefined,
    colorVariants: product.colorVariants as ProductColorVariantDocument[] | undefined,
  });

  if (hasActiveVariants && typeof input.stock === "number") {
    return {
      status: "error",
      message: "El stock está administrado por variantes en este producto.",
      fieldErrors: {
        stock: ["Stock administrado por variantes."],
      },
    };
  }

  if (!hasActiveVariants && typeof input.stock !== "number") {
    return {
      status: "error",
      message: "El stock es obligatorio para productos simples.",
      fieldErrors: {
        stock: ["Ingresá un stock válido."],
      },
    };
  }

  const patchSet: Record<string, unknown> = {
    isActive: input.isActive,
    isOnOffer: input.isOnOffer,
    showInNewIn: input.showInNewIn,
  };

  if (!hasActiveVariants && typeof input.stock === "number") {
    patchSet.stock = input.stock;
  }

  if (input.showInNewIn && typeof input.newInOrder === "number") {
    patchSet.newInOrder = input.newInOrder;
  }

  try {
    const committedProduct = (await getAdminProductsWriteClient()
      .patch(product._id)
      .set(patchSet)
      .commit({ returnDocuments: true })) as AdminProductQuickEditDocument;

    logger.debug("admin.products.mutation_committed", {
      mutationId,
      source: "quick_edit",
      productId: input.productId,
      previousRev: input.rev,
      committedRev: committedProduct._rev,
      updatedAt: committedProduct._updatedAt,
    });

    const cookieStore = await cookies();
    cookieStore.set(
      ADMIN_PRODUCT_DETAIL_SNAPSHOT_COOKIE,
      serializeAdminProductDetailSnapshot(
        buildAdminProductDetailSnapshot(
          input.productId,
          committedProduct._rev,
          committedProduct._updatedAt,
          normalizeProductDetail(committedProduct as never).images,
        ),
      ),
      {
        httpOnly: true,
        sameSite: "lax",
        path: "/admin/productos",
        maxAge: 120,
      },
    );

    for (const path of buildRevalidationPaths(product)) {
      revalidatePath(path);
    }

    return {
      status: "success",
      message: "Cambios guardados.",
      rev: committedProduct._rev,
      updatedAt: committedProduct._updatedAt,
    };
  } catch (error) {
    logger.error("admin.products.quick_edit.failed", {
      productId: input.productId,
      rev: input.rev,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      status: "error",
      message: "No pudimos guardar los cambios. Intentalo de nuevo.",
    };
  }
}

export type { AdminProductQuickEditMutationResult };
