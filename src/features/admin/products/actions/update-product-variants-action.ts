"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { requireAdminSession } from "@/features/admin/auth";
import { logger } from "@/lib/logger";
import { sanityFetch } from "@/integrations/sanity/client";
import { adminProductDetailQuery } from "@/integrations/sanity/admin-queries";
import { getAdminProductsWriteClient } from "../server/admin-products-write-client";
import { normalizeProductDetail } from "../server/admin-product-detail-service";
import {
  ADMIN_PRODUCT_DETAIL_SNAPSHOT_COOKIE,
  buildAdminProductDetailSnapshot,
  serializeAdminProductDetailSnapshot,
} from "../lib/admin-product-detail-snapshot";
import type {
  AdminProductVariantActionState,
  AdminProductVariantField,
} from "../types";
import {
  ADMIN_PRODUCT_VARIANT_ATTRIBUTE_NAMES,
  buildVariantCombinationKey,
  normalizeAdminProductVariants,
  type AdminProductVariantData,
} from "../lib/variant-editor";
import {
  adminProductVariantFormSchema,
  parseAdminProductVariantAttributes,
} from "../validation/variant-editor";
import type { ProductLogistics } from "@/features/catalog/logistics";
import type { ProductColorVariantDocument, ProductVariantDocument } from "@/types/cms";

type AdminProductVariantDocument = {
  _id: string;
  _rev: string;
  _updatedAt: string;
  title: string;
  slug?: string;
  variants?: ProductVariantDocument[] | null;
  colorVariants?: ProductColorVariantDocument[] | null;
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
};

type CanonicalVariantPatch = {
  _key: string;
  _type: "productVariant";
  title: string;
  value: string;
  attributes?: Array<{
    _key: string;
    _type: "productVariantAttribute";
    name: (typeof ADMIN_PRODUCT_VARIANT_ATTRIBUTE_NAMES)[number];
    value: string;
  }>;
  sku?: string;
  basePrice?: number;
  transferPrice?: number;
  stock: number;
  isActive: boolean;
  images?: unknown[];
  logistics?: ProductLogistics;
};

function extractFieldErrors(error: unknown) {
  if (!error || typeof error !== "object" || !("issues" in error)) {
    return {};
  }

  const issues = (error as { issues?: Array<{ path: Array<string | number>; message: string }> }).issues ?? [];
  const fieldErrors: Partial<Record<AdminProductVariantField, string[]>> = {};

  for (const issue of issues) {
    const field = issue.path[0];

    if (typeof field !== "string") {
      continue;
    }

    const key = field as AdminProductVariantField;
    fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
  }

  return fieldErrors;
}

function buildErrorState(
  message: string,
  fieldErrors?: Partial<Record<AdminProductVariantField, string[]>>,
): AdminProductVariantActionState {
  return {
    status: "error",
    message,
    fieldErrors,
  };
}

function buildRevalidationPaths(args: {
  oldSlug: string;
  newSlug: string;
  oldCategorySlug: string;
  newCategorySlug: string;
  oldSubcategorySlug: string | null;
  newSubcategorySlug: string | null;
  productId: string;
}) {
  const paths = new Set<string>([
    "/admin/productos",
    `/admin/productos/${args.productId}`,
    "/productos",
    "/",
  ]);

  if (args.oldSlug) {
    paths.add(`/productos/detalle/${args.oldSlug}`);
  }

  if (args.newSlug) {
    paths.add(`/productos/detalle/${args.newSlug}`);
  }

  if (args.oldCategorySlug) {
    paths.add(`/productos/${args.oldCategorySlug}`);

    if (args.oldSubcategorySlug) {
      paths.add(`/productos/${args.oldCategorySlug}/${args.oldSubcategorySlug}`);
    }
  }

  if (args.newCategorySlug) {
    paths.add(`/productos/${args.newCategorySlug}`);

    if (args.newSubcategorySlug) {
      paths.add(`/productos/${args.newCategorySlug}/${args.newSubcategorySlug}`);
    }
  }

  return [...paths];
}

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

function normalizeVariantSourceVariants(product: AdminProductVariantDocument) {
  return normalizeAdminProductVariants({
    variants: product.variants,
    colorVariants: product.colorVariants,
  });
}

function mapVariantToPatch(
  variant: AdminProductVariantData,
  existingImages: unknown[] | undefined,
): CanonicalVariantPatch {
  const patch: CanonicalVariantPatch = {
    _key: variant.key || crypto.randomUUID(),
    _type: "productVariant",
    title: variant.title,
    value: variant.value,
    stock: variant.stock,
    isActive: variant.isActive,
  };

  if (variant.attributes.length > 0) {
    patch.attributes = variant.attributes.map((attribute, index) => ({
      _key: `${patch._key}-attribute-${index + 1}`,
      _type: "productVariantAttribute",
      name: attribute.name,
      value: attribute.value,
    }));
  }

  if (variant.sku) {
    patch.sku = variant.sku;
  }

  if (typeof variant.basePrice === "number") {
    patch.basePrice = variant.basePrice;
  }

  if (typeof variant.transferPrice === "number") {
    patch.transferPrice = variant.transferPrice;
  }

  if (variant.logistics) {
    patch.logistics = variant.logistics;
  }

  if (existingImages && existingImages.length > 0) {
    patch.images = existingImages;
  }

  return patch;
}

function normalizeTrimmed(value: string) {
  return value.trim().toLowerCase();
}

export async function updateProductVariantsAction(
  previousState: AdminProductVariantActionState = { status: "idle" },
  formData: FormData,
): Promise<AdminProductVariantActionState> {
  void previousState;

  await requireAdminSession();

  const rawValues = {
    productId: String(formData.get("productId") ?? ""),
    rev: String(formData.get("rev") ?? ""),
    operation: String(formData.get("operation") ?? ""),
    variantKey: String(formData.get("variantKey") ?? ""),
    logisticsMode: String(formData.get("logisticsMode") ?? "inherit"),
    title: String(formData.get("title") ?? ""),
    value: String(formData.get("value") ?? ""),
    sku: formData.get("sku"),
    basePrice: formData.get("basePrice"),
    stock: formData.get("stock"),
    isActive: String(formData.get("isActive") ?? ""),
    weightGrams: formData.get("weightGrams"),
    heightCm: formData.get("heightCm"),
    widthCm: formData.get("widthCm"),
    depthCm: formData.get("depthCm"),
    attributesJson: String(formData.get("attributesJson") ?? ""),
  };

  const parsed = adminProductVariantFormSchema.safeParse(rawValues);

  if (!parsed.success) {
    return buildErrorState("Revisá los campos marcados.", extractFieldErrors(parsed.error));
  }

  let parsedAttributes: ReturnType<typeof parseAdminProductVariantAttributes>;

  try {
    parsedAttributes = parseAdminProductVariantAttributes(parsed.data.attributesJson);
  } catch {
    return buildErrorState("Revisá los campos marcados.", {
      attributesJson: [
        `Usá solo estos atributos: ${ADMIN_PRODUCT_VARIANT_ATTRIBUTE_NAMES.join(", ")}.`,
      ],
    });
  }

  const [currentProduct] = await Promise.all([
    sanityFetch<AdminProductVariantDocument | null>(
      adminProductDetailQuery,
      { productId: parsed.data.productId },
      { useToken: true },
    ),
  ]);

  if (!currentProduct) {
    return buildErrorState("No encontramos el producto para actualizar.", {
      productId: ["No encontramos el producto para actualizar."],
    });
  }


  const mutationId = crypto.randomUUID();
  logger.debug("admin.products.mutation_started", {
    mutationId,
    source: "variants",
    productId: parsed.data.productId,
    submittedRev: parsed.data.rev,
    timestamp: new Date().toISOString(),
  });

  const normalizedSource = normalizeVariantSourceVariants(currentProduct);
  const sourceVariants = normalizedSource.variants;
  const variantKey = parsed.data.variantKey?.trim() ?? "";
  const normalizedValue = normalizeTrimmed(parsed.data.value);
  const combinationKey = parsedAttributes.combinationKey;
  const targetIndex = variantKey
    ? sourceVariants.findIndex((variant) => variant.key === variantKey)
    : -1;
  const targetVariant = targetIndex >= 0 ? sourceVariants[targetIndex] : null;

  if (
    sourceVariants.some(
      (variant) =>
        variant.key !== variantKey && normalizeTrimmed(variant.value) === normalizedValue,
    )
  ) {
    return buildErrorState("Ya existe otra variante con ese valor interno.", {
      value: ["Ya existe otra variante con ese valor interno."],
    });
  }

  if (
    sourceVariants.some(
      (variant) =>
        variant.key !== variantKey && buildVariantCombinationKey(variant.attributes) === combinationKey,
    )
  ) {
    return buildErrorState("Ya existe otra variante con la misma combinación de atributos.", {
      attributesJson: ["La combinación de atributos ya existe."],
    });
  }

  const nextVariants = [...sourceVariants];

  if (parsed.data.operation === "deactivate") {
    if (!targetVariant) {
      return buildErrorState("No encontramos la variante para desactivar.", {
        variantKey: ["No encontramos la variante para desactivar."],
      });
    }

    nextVariants[targetIndex] = {
      ...targetVariant,
      isActive: false,
    };
  } else {
    const nextVariant: AdminProductVariantData = {
      key: targetVariant?.key ?? crypto.randomUUID(),
      title: parsed.data.title.trim(),
      value: parsed.data.value.trim(),
      attributes: parsedAttributes.attributes,
      sku: typeof parsed.data.sku === "string" ? parsed.data.sku.trim() : "",
      basePrice: parsed.data.basePrice ?? null,
      transferPrice: targetVariant?.transferPrice ?? null,
      stock: parsed.data.stock,
      isActive: parsed.data.isActive,
      images: targetVariant?.images ?? [],
      source: "variants",
      logistics:
        parsed.data.logisticsMode === "custom"
          ? {
              weightGrams: parsed.data.weightGrams as number,
              heightCm: parsed.data.heightCm as number,
              widthCm: parsed.data.widthCm as number,
              depthCm: parsed.data.depthCm as number,
            }
          : null,
    };

    if (targetIndex >= 0) {
      nextVariants[targetIndex] = nextVariant;
    } else {
      nextVariants.push(nextVariant);
    }
  }

  const patchVariants = nextVariants.map((variant) =>
    mapVariantToPatch(variant, variant.images),
  );

  try {
    const committedProduct = (await getAdminProductsWriteClient()
      .patch(currentProduct._id)
      .ifRevisionId(parsed.data.rev)
      .set({ variants: patchVariants })
      .commit({ returnDocuments: true })) as AdminProductVariantDocument;

    const committedSource = normalizeVariantSourceVariants(committedProduct);

    logger.debug("admin.products.mutation_committed", {
      mutationId,
      source: "variants",
      productId: parsed.data.productId,
      previousRev: parsed.data.rev,
      committedRev: committedProduct._rev,
      updatedAt: committedProduct._updatedAt,
    });

    const cookieStore = await cookies();
    cookieStore.set(
      ADMIN_PRODUCT_DETAIL_SNAPSHOT_COOKIE,
      serializeAdminProductDetailSnapshot(
        buildAdminProductDetailSnapshot(
          parsed.data.productId,
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

    for (const path of buildRevalidationPaths({
      oldSlug: currentProduct.slug ?? "",
      newSlug: currentProduct.slug ?? "",
      oldCategorySlug: currentProduct.category?.slug ?? "",
      newCategorySlug: currentProduct.category?.slug ?? "",
      oldSubcategorySlug: currentProduct.subcategory?.slug ?? null,
      newSubcategorySlug: currentProduct.subcategory?.slug ?? null,
      productId: parsed.data.productId,
    })) {
      revalidatePath(path);
    }

    return {
      status: "success",
      message:
        parsed.data.operation === "deactivate"
          ? "Variante desactivada."
          : targetVariant
            ? "Variante actualizada."
            : "Variante agregada.",
      rev: committedProduct._rev,
      updatedAt: committedProduct._updatedAt,
      variants: committedSource.variants,
      variantSource: committedSource.source,
      legacyColorVariantCount: committedSource.legacyColorVariantCount,
    };
  } catch (error) {
    if (isRevisionConflictError(error)) {
      return {
        status: "conflict",
        message: "El producto cambió desde que abriste el editor. Recargá y volvé a intentar.",
      };
    }

    logger.error("admin.products.variants.failed", {
      productId: parsed.data.productId,
      rev: parsed.data.rev,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      status: "error",
      message: "No pudimos guardar la variante. Intentalo de nuevo.",
    };
  }
}
