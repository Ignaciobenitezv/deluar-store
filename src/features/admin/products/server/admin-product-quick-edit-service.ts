import "server-only";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { logger } from "@/lib/logger";
import { sanityFreshFetch } from "@/integrations/sanity/client";
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
import { mapAdminProductListItem } from "../lib/admin-product-item";
import type { AdminProductListItem, AdminProductQuickEditField } from "../types";
import { hasCompleteAdminProductLogistics } from "../validation/product-logistics";
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
  logistics?: {
    weightGrams?: number;
    heightCm?: number;
    widthCm?: number;
    depthCm?: number;
  };
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

type StockValueItem = {
  key: string;
  kind: "base" | "variant";
  stock: number;
};

type AdminProductQuickEditMutationResult =
  | {
      status: "success";
      message: string;
      rev: string;
      updatedAt: string;
      product: AdminProductListItem;
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

function normalizeStock(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : null;
}

function buildVariantStockPath(collection: "variants" | "colorVariants", key: string) {
  return `${collection}[_key==${JSON.stringify(key)}].stock`;
}

function parseStockValuesJson(rawValue: string) {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawValue);
  } catch {
    return null;
  }

  if (!Array.isArray(parsed)) {
    return null;
  }

  const items: StockValueItem[] = [];

  for (const entry of parsed) {
    if (!entry || typeof entry !== "object") {
      return null;
    }

    const candidate = entry as Partial<StockValueItem> & { stock?: unknown };
    const key = typeof candidate.key === "string" ? candidate.key.trim() : "";
    const kind = candidate.kind === "base" || candidate.kind === "variant" ? candidate.kind : null;
    const stock = normalizeStock(candidate.stock);

    if (!key || !kind || stock === null) {
      return null;
    }

    items.push({
      key,
      kind,
      stock,
    });
  }

  return items;
}

function getActiveVariantSource(product: AdminProductQuickEditDocument) {
  if ((product.variants ?? []).length > 0) {
    return "variants" as const;
  }

  if ((product.colorVariants ?? []).length > 0) {
    return "colorVariants" as const;
  }

  return null;
}

function buildErrorState(
  message: string,
  fieldErrors?: Partial<Record<AdminProductQuickEditField | "productId" | "rev", string[]>>,
): AdminProductQuickEditMutationResult {
  return {
    status: "error",
    message,
    fieldErrors,
  };
}

export async function updateAdminProductQuickEdit(
  input: AdminProductQuickEditFormValues,
): Promise<AdminProductQuickEditMutationResult> {
  const product = await sanityFreshFetch<AdminProductQuickEditDocument | null>(adminProductQuickEditQuery, {
    productId: input.productId,
  });

  if (!product) {
    return buildErrorState("No encontramos el producto para actualizar.", {
      productId: ["No encontramos el producto para actualizar."],
    });
  }

  const stockValues = parseStockValuesJson(input.stockValuesJson);

  if (!stockValues) {
    return buildErrorState("Revisa los campos marcados.", {
      stock: ["No pudimos leer los stocks enviados."],
    });
  }

  const baseStockItem = stockValues.find((item) => item.kind === "base");
  const variantStockItems = stockValues.filter((item) => item.kind === "variant");
  const activeVariantSource = getActiveVariantSource(product);
  const activeVariantItems = activeVariantSource === "variants" ? product.variants ?? [] : product.colorVariants ?? [];

  if (!baseStockItem) {
    return buildErrorState("Revisa los campos marcados.", {
      stock: ["Falta el stock del producto base."],
    });
  }

  if (activeVariantItems.length === 0 && variantStockItems.length > 0) {
    return buildErrorState("Revisa los campos marcados.", {
      stock: ["No coinciden los stocks enviados con las variantes del producto."],
    });
  }

  if (activeVariantItems.length > 0 && variantStockItems.length !== activeVariantItems.length) {
    return buildErrorState("Revisa los campos marcados.", {
      stock: ["No coinciden los stocks enviados con las variantes del producto."],
    });
  }

  const expectedVariantKeys = new Set(
    activeVariantItems
      .map((variant) => variant._key?.trim())
      .filter((key): key is string => Boolean(key)),
  );
  const submittedVariantKeys = new Set(
    variantStockItems
      .map((variant) => variant.key)
      .filter((key): key is string => Boolean(key)),
  );

  if (
    activeVariantItems.length > 0 &&
    (expectedVariantKeys.size !== submittedVariantKeys.size ||
      [...submittedVariantKeys].some((key) => !expectedVariantKeys.has(key)))
  ) {
    return buildErrorState("Revisa los campos marcados.", {
      stock: ["No coinciden los stocks enviados con el estado local."],
    });
  }

  const mutationId = crypto.randomUUID();
  logger.debug("admin.products.mutation_started", {
    mutationId,
    source: "quick_edit",
    productId: input.productId,
    submittedRev: input.rev,
    submittedStock: baseStockItem.stock,
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

  if (input.isActive && !hasCompleteAdminProductLogistics(product.logistics)) {
    return buildErrorState("Completa peso y dimensiones antes de publicar el producto.", {
      weightGrams: ["Completa peso y dimensiones antes de publicar el producto."],
      heightCm: ["Completa peso y dimensiones antes de publicar el producto."],
      widthCm: ["Completa peso y dimensiones antes de publicar el producto."],
      depthCm: ["Completa peso y dimensiones antes de publicar el producto."],
    });
  }

  const patchSet: Record<string, unknown> = {
    isActive: input.isActive,
    isOnOffer: input.isOnOffer,
    showInNewIn: input.showInNewIn,
    stock: baseStockItem.stock,
  };

  if (input.showInNewIn && typeof input.newInOrder === "number") {
    patchSet.newInOrder = input.newInOrder;
  }

  try {
    let patch = getAdminProductsWriteClient()
      .patch(product._id)
      .ifRevisionId(input.rev)
      .set(patchSet);

    if (hasActiveVariants) {
      const collection = activeVariantSource;

      if (collection) {
        for (const variantItem of variantStockItems) {
          patch = patch.set({
            [buildVariantStockPath(collection, variantItem.key)]: variantItem.stock,
          });
        }
      }
    }

    const committedProduct = (await patch.commit({ returnDocuments: true })) as AdminProductQuickEditDocument;

    logger.debug("admin.products.mutation_committed", {
      mutationId,
      source: "quick_edit",
      productId: input.productId,
      previousRev: input.rev,
      committedRev: committedProduct._rev,
      committedStock: committedProduct.stock,
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
      product: mapAdminProductListItem(committedProduct),
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
