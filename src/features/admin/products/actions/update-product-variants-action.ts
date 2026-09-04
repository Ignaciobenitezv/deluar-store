"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { requireAdminSession } from "@/features/admin/auth";
import { logger } from "@/lib/logger";
import { sanityFreshFetch } from "@/integrations/sanity/client";
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
import {
  adminProductImageDraftSubmitSchema,
  adminProductImageItemSchema,
  type AdminProductImageDraftSubmitInput,
  type AdminProductImageItem,
} from "../validation/product-images";
import {
  MAX_PRODUCT_IMAGE_UPLOAD_BYTES,
  isAllowedProductImageMimeType,
} from "../lib/product-image-constraints";
import type { ProductLogistics } from "@/features/catalog/logistics";
import type { ProductColorVariantDocument, ProductVariantDocument } from "@/types/cms";
import { applyAdminProductVariantDeletionUsage, loadAdminProductVariantDeletionUsage } from "../server/admin-product-variant-deletion";

type AdminProductVariantDocument = {
  _id: string;
  _rev: string;
  _updatedAt: string;
  title: string;
  slug?: string;
  basePrice: number;
  transferPrice?: number;
  stock: number;
  logistics?: ProductLogistics;
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

  if (existingImages) {
    patch.images = existingImages;
  }

  return patch;
}

function normalizeImages(images: unknown[] | undefined): AdminProductImageItem[] | null {
  const parsed = adminProductImageItemSchema.array().safeParse(images ?? []);

  if (!parsed.success) {
    return null;
  }

  return parsed.data;
}

function parseVariantImagesJson(value: string) {
  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(value);
  } catch {
    return null;
  }

  const parsed = adminProductImageDraftSubmitSchema.array().safeParse(parsedJson);

  if (!parsed.success) {
    return null;
  }

  return parsed.data;
}

function validateUploadFile(file: File) {
  if (file.size <= 0) {
    return "El archivo no puede estar vacio.";
  }

  if (file.size > MAX_PRODUCT_IMAGE_UPLOAD_BYTES) {
    return "Cada imagen puede pesar hasta 10 MB.";
  }

  if (!isAllowedProductImageMimeType(file.type)) {
    return "Solo se aceptan JPG, PNG o WebP.";
  }

  return null;
}

function getTemporaryIdFromFileField(fieldName: string) {
  if (!fieldName.startsWith("file:")) {
    return null;
  }

  const temporaryId = fieldName.slice("file:".length).trim();
  return temporaryId.length > 0 ? temporaryId : null;
}

function buildSanityImageDocument(assetRef: string, alt?: string): AdminProductImageItem {
  return {
    _key: crypto.randomUUID(),
    _type: "imageWithAlt",
    ...(alt ? { alt } : {}),
    image: {
      _type: "image",
      asset: {
        _type: "reference",
        _ref: assetRef,
      },
    },
  };
}

function buildExistingImageDocument(image: AdminProductImageItem, alt?: string): AdminProductImageItem {
  return {
    _key: image._key,
    _type: image._type,
    ...(alt ? { alt } : {}),
    image: image.image,
  };
}

function buildFinalVariantImages(args: {
  currentImages: AdminProductImageItem[];
  draftImages: AdminProductImageDraftSubmitInput[];
  uploadedAssetRefs: Map<string, string>;
}): AdminProductImageItem[] | null {
  const currentByKey = new Map(args.currentImages.map((image) => [image._key, image] as const));
  const seenExistingKeys = new Set<string>();
  const seenNewTemporaryIds = new Set<string>();
  const finalImages: AdminProductImageItem[] = [];

  for (const item of args.draftImages) {
    if (item.existing) {
      const currentImage = currentByKey.get(item.key);

      if (!currentImage || currentImage.image.asset._ref !== item.assetRef) {
        return null;
      }

      if (seenExistingKeys.has(item.key)) {
        return null;
      }

      seenExistingKeys.add(item.key);
      finalImages.push(buildExistingImageDocument(currentImage, item.alt?.trim() || undefined));
      continue;
    }

    if (seenNewTemporaryIds.has(item.temporaryId)) {
      return null;
    }

    const assetRef = args.uploadedAssetRefs.get(item.temporaryId);

    if (!assetRef) {
      return null;
    }

    seenNewTemporaryIds.add(item.temporaryId);
    finalImages.push(buildSanityImageDocument(assetRef, item.alt?.trim() || undefined));
  }

  return finalImages;
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
    preserveOriginalOption: String(formData.get("preserveOriginalOption") ?? "false"),
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
    variantImagesJson: String(formData.get("variantImagesJson") ?? "[]"),
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
    sanityFreshFetch<AdminProductVariantDocument | null>(adminProductDetailQuery, { productId: parsed.data.productId }),
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
  const variantDeletionUsage = await loadAdminProductVariantDeletionUsage(parsed.data.productId);
  const sourceVariants = applyAdminProductVariantDeletionUsage(normalizedSource.variants, variantDeletionUsage);
  const variantKey = parsed.data.variantKey?.trim() ?? "";
  const normalizedValue = normalizeTrimmed(parsed.data.value);
  const combinationKey = parsedAttributes.combinationKey;
  const targetImagesPayload = parseVariantImagesJson(parsed.data.variantImagesJson);
  if (!targetImagesPayload) {
    return buildErrorState("No pudimos leer las imágenes de la variante.", {
      variantImagesJson: ["No pudimos leer las imágenes de la variante."],
    });
  }
  const targetIndex = variantKey
    ? sourceVariants.findIndex((variant) => variant.key === variantKey)
    : -1;
  const targetVariant = targetIndex >= 0 ? sourceVariants[targetIndex] : null;
  if (parsed.data.operation === "delete") {
    if (!targetVariant) {
      return buildErrorState("No encontramos la variante para eliminar.", {
        variantKey: ["No encontramos la variante para eliminar."],
      });
    }

    if (!targetVariant.canDelete) {
      return buildErrorState("Esta variante ya tiene historial y no puede eliminarse. Podés desactivarla.", {
        variantKey: ["Esta variante ya tiene historial y no puede eliminarse. Podés desactivarla."],
      });
    }
  }
  const shouldPreserveOriginalOption =
    parsed.data.operation === "upsert" &&
    parsed.data.preserveOriginalOption &&
    sourceVariants.length === 0 &&
    !targetVariant;

  const originalVariant: AdminProductVariantData | null = shouldPreserveOriginalOption
    ? {
        key: crypto.randomUUID(),
        title: "Original",
        value: "original",
        attributes: [],
        sku: "",
        basePrice: currentProduct.basePrice,
        transferPrice: typeof currentProduct.transferPrice === "number" ? currentProduct.transferPrice : null,
        stock: Number.isFinite(currentProduct.stock) ? currentProduct.stock : 0,
        isActive: true,
        images: [],
        source: "variants",
        canDelete: true,
        logistics: currentProduct.logistics ?? null,
      }
    : null;
  const targetCurrentImages = normalizeImages(targetVariant?.images as unknown[] | undefined) ?? [];
  const filesByTemporaryId = new Map<string, File>();
  const expectedNewImages = targetImagesPayload.filter(
    (item): item is AdminProductImageDraftSubmitInput & { existing: false } => !item.existing,
  );
  const expectedTemporaryIds = new Set(expectedNewImages.map((item) => item.temporaryId));

  for (const [fieldName, value] of formData.entries()) {
    const temporaryId = getTemporaryIdFromFileField(fieldName);

    if (!temporaryId) {
      continue;
    }

    if (!expectedTemporaryIds.has(temporaryId)) {
      return buildErrorState("No coincidieron las imágenes nuevas con el estado local.", {
        variantImagesJson: ["No coincidieron las imágenes nuevas con el estado local."],
      });
    }

    if (
      !value ||
      typeof value !== "object" ||
      typeof (value as File).arrayBuffer !== "function" ||
      typeof (value as File).size !== "number"
    ) {
      return buildErrorState("No pudimos leer una de las imágenes nuevas.", {
        variantImagesJson: ["No pudimos leer una de las imágenes nuevas."],
      });
    }

    const file = value as File;
    const validationError = validateUploadFile(file);

    if (validationError) {
      return buildErrorState(validationError, {
        variantImagesJson: [validationError],
      });
    }

    filesByTemporaryId.set(temporaryId, file);
  }

  for (const item of expectedNewImages) {
    const file = filesByTemporaryId.get(item.temporaryId);

    if (!file) {
      return buildErrorState("No coincidieron las imágenes nuevas con el estado local.", {
        variantImagesJson: ["No coincidieron las imágenes nuevas con el estado local."],
      });
    }
  }

  const uploadedAssetRefs = new Map<string, string>();
  const uploadedAssetIds: string[] = [];

  try {
    const writeClient = getAdminProductsWriteClient();

    for (const item of expectedNewImages) {
      const file = filesByTemporaryId.get(item.temporaryId);

      if (!file) {
        return buildErrorState("No coincidieron las imágenes nuevas con el estado local.", {
          variantImagesJson: ["No coincidieron las imágenes nuevas con el estado local."],
        });
      }

      const uploadedAsset = await writeClient.assets.upload("image", file, {
        filename: file.name || `${parsed.data.productId}-${item.temporaryId}.jpg`,
        contentType: file.type,
      });

      uploadedAssetIds.push(uploadedAsset._id);
      uploadedAssetRefs.set(item.temporaryId, uploadedAsset._id);
    }
  } catch (error) {
    logger.error("admin.products.variants.upload_failed", {
      productId: parsed.data.productId,
      rev: parsed.data.rev,
      uploadedAssetIds,
      error: error instanceof Error ? error.message : String(error),
    });

    return buildErrorState("No pudimos guardar una de las imágenes de la variante.", {
      variantImagesJson: ["No pudimos guardar una de las imágenes de la variante."],
    });
  }

  const workingVariants = [
    ...(originalVariant ? [originalVariant] : []),
    ...sourceVariants,
  ];

  if (
    workingVariants.some(
      (variant) =>
        variant.key !== variantKey && normalizeTrimmed(variant.value) === normalizedValue,
    )
  ) {
    return buildErrorState("Ya existe otra variante con ese valor interno.", {
      value: ["Ya existe otra variante con ese valor interno."],
    });
  }

  if (
    workingVariants.some(
      (variant) =>
        variant.key !== variantKey && buildVariantCombinationKey(variant.attributes) === combinationKey,
    )
  ) {
    return buildErrorState("Ya existe otra variante con la misma combinación de atributos.", {
      attributesJson: ["La combinación de atributos ya existe."],
    });
  }

  const nextVariants = parsed.data.operation === "upsert" ? [...workingVariants] : [...sourceVariants];

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
  } else if (parsed.data.operation === "delete") {
    const deleteIndex = nextVariants.findIndex((variant) => variant.key === variantKey);

    if (deleteIndex < 0) {
      return buildErrorState("No encontramos la variante para eliminar.", {
        variantKey: ["No encontramos la variante para eliminar."],
      });
    }

    nextVariants.splice(deleteIndex, 1);
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
      images: [],
      source: "variants",
      canDelete: true,
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

  const finalVariantImages = buildFinalVariantImages({
    currentImages: targetCurrentImages,
    draftImages: targetImagesPayload,
    uploadedAssetRefs,
  });

  if (!finalVariantImages) {
    return buildErrorState("No pudimos guardar las imágenes de la variante.", {
      variantImagesJson: ["No pudimos guardar las imágenes de la variante."],
    });
  }

  if (targetVariant || nextVariants.length > 0) {
    const resolvedIndex = targetVariant ? nextVariants.findIndex((variant) => variant.key === targetVariant.key) : nextVariants.length - 1;

    if (resolvedIndex >= 0) {
      nextVariants[resolvedIndex] = {
        ...nextVariants[resolvedIndex],
        images: finalVariantImages,
      };
    }
  }

  const patchVariants = nextVariants.map((variant) => mapVariantToPatch(variant, variant.images));

  try {
    const committedProduct = (await getAdminProductsWriteClient()
      .patch(currentProduct._id)
      .ifRevisionId(parsed.data.rev)
      .set({ variants: patchVariants })
      .unset(["colorVariants"])
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
      variants: applyAdminProductVariantDeletionUsage(committedSource.variants, variantDeletionUsage),
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
