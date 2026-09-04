"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { requireAdminSession } from "@/features/admin/auth";
import { sanityFreshFetch } from "@/integrations/sanity/client";
import { adminProductDetailQuery } from "@/integrations/sanity/admin-queries";
import { getSanityImageUrl } from "@/integrations/sanity/image";
import { logger } from "@/lib/logger";
import { getAdminProductsWriteClient } from "../server/admin-products-write-client";
import {
  ADMIN_PRODUCT_DETAIL_SNAPSHOT_COOKIE,
  buildAdminProductDetailSnapshot,
  deserializeAdminProductDetailSnapshot,
  serializeAdminProductDetailSnapshot,
} from "../lib/admin-product-detail-snapshot";
import {
  adminProductImageCommitFormSchema,
  adminProductImageDraftSubmitSchema,
  adminProductImageItemSchema,
  type AdminProductImageCommitFormValues,
  type AdminProductImageDraftSubmitInput,
  type AdminProductImageItem,
} from "../validation/product-images";
import {
  MAX_PRODUCT_IMAGE_UPLOAD_BYTES,
  isAllowedProductImageMimeType,
} from "../lib/product-image-constraints";
import type {
  AdminProductImageActionState,
  AdminProductImageData,
  AdminProductImageField,
} from "../types";
import type { SanityImageWithAlt } from "@/types/cms";
import type { AdminProductDetailSnapshot } from "../lib/admin-product-detail-snapshot";

type AdminProductImageDocument = {
  _id: string;
  _rev: string;
  _updatedAt: string;
  title: string;
  slug?: string;
  images?: AdminProductImageQueryItem[];
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

type ParsedFormValues =
  | {
      success: true;
      data: AdminProductImageCommitFormValues;
    }
  | {
      success: false;
      fieldErrors: Partial<Record<AdminProductImageField, string[]>>;
    };

type ParsedDraftImagesResult =
  | {
      success: true;
      data: AdminProductImageDraftSubmitInput[];
    }
  | {
      success: false;
      fieldErrors: Partial<Record<AdminProductImageField, string[]>>;
    };

const DEFAULT_ACTION_STATE: AdminProductImageActionState = {
  status: "idle",
};

function extractFieldErrors(error: unknown) {
  if (!error || typeof error !== "object" || !("issues" in error)) {
    return {};
  }

  const issues = (error as { issues?: Array<{ path: Array<string | number>; message: string }> }).issues ?? [];
  const fieldErrors: Partial<Record<AdminProductImageField, string[]>> = {};

  for (const issue of issues) {
    const field = issue.path[0];

    if (typeof field !== "string") {
      continue;
    }

    const key = field as AdminProductImageField;
    fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
  }

  return fieldErrors;
}

function buildErrorState(
  message: string,
  fieldErrors?: Partial<Record<AdminProductImageField, string[]>>,
): AdminProductImageActionState {
  return {
    status: "error",
    message,
    fieldErrors,
  };
}

function buildPartialState(
  message: string,
  fieldErrors?: Partial<Record<AdminProductImageField, string[]>>,
): AdminProductImageActionState {
  return {
    status: "partial",
    message,
    fieldErrors,
  };
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

function buildRevalidationPaths(product: AdminProductImageDocument) {
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

function normalizeImages(images: SanityImageWithAlt[] | undefined): AdminProductImageItem[] | null {
  const parsed = adminProductImageItemSchema.array().safeParse(images ?? []);

  if (!parsed.success) {
    return null;
  }

  return parsed.data;
}

function normalizeCommittedImages(images: AdminProductImageQueryItem[] | undefined): AdminProductImageData[] {
  return (images ?? [])
    .flatMap((image) => {
      const assetRef = image.image.asset?._ref;

      if (!assetRef) {
        return [];
      }

      return [
        {
          key: image._key?.trim() || crypto.randomUUID(),
          alt: image.alt?.trim() || "",
          url: getSanityImageUrl(image, 640, 640),
          assetRef,
        },
      ];
    });
}

function normalizeSnapshotImages(snapshot: AdminProductDetailSnapshot | null): AdminProductImageItem[] | null {
  if (!snapshot) {
    return null;
  }

  return snapshot.images.map((image) => ({
    _key: image.key,
    _type: "imageWithAlt" as const,
    alt: image.alt,
    image: {
      _type: "image" as const,
      asset: {
        _type: "reference" as const,
        _ref: image.assetRef,
      },
    },
  }));
}

async function writeAdminProductDetailSnapshotCookie(args: {
  productId: string;
  rev: string;
  updatedAt: string;
  images: AdminProductImageData[];
}) {
  const cookieStore = await cookies();
  const snapshot = buildAdminProductDetailSnapshot(args.productId, args.rev, args.updatedAt, args.images);

  cookieStore.set(ADMIN_PRODUCT_DETAIL_SNAPSHOT_COOKIE, serializeAdminProductDetailSnapshot(snapshot), {
    httpOnly: true,
    sameSite: "lax",
    path: "/admin/productos",
    maxAge: 120,
  });
}

function parseDraftImagesJson(value: string): ParsedDraftImagesResult {
  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(value);
  } catch {
    return {
      success: false,
      fieldErrors: {
        draftImagesJson: ["No pudimos leer el estado local de las imagenes."],
      },
    };
  }

  const parsed = z.array(adminProductImageDraftSubmitSchema).safeParse(parsedJson);

  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: extractFieldErrors(parsed.error),
    };
  }

  return {
    success: true,
    data: parsed.data,
  };
}

function logCommitStage(stage: string, context?: Record<string, unknown>) {
  logger.debug("admin.products.images.commit_stage", {
    stage,
    ...context,
  });
}

function logCommitResult(
  stage: string,
  result: AdminProductImageActionState,
  context?: Record<string, unknown>,
) {
  logger.debug("admin.products.images.commit_result", {
    stage,
    status: result.status,
    message: "message" in result ? result.message : undefined,
    ...context,
  });
}

type UploadFileLike = {
  name: string;
  type: string;
  size: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
};

type AdminProductImageQueryItem = SanityImageWithAlt & {
  _key?: string;
};

function isUploadFileLike(value: unknown): value is File & UploadFileLike {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<UploadFileLike> & { constructor?: { name?: string } };

  return (
    typeof candidate.name === "string" &&
    typeof candidate.type === "string" &&
    typeof candidate.size === "number" &&
    typeof candidate.arrayBuffer === "function"
  );
}

function describeUploadValue(value: unknown) {
  if (!value || typeof value !== "object") {
    return {
      kind: typeof value,
    };
  }

  const candidate = value as {
    constructor?: { name?: string };
    name?: unknown;
    type?: unknown;
    size?: unknown;
    arrayBuffer?: unknown;
  };

  return {
    kind: "object",
    constructorName: candidate.constructor?.name ?? null,
    name: typeof candidate.name === "string" ? candidate.name : null,
    type: typeof candidate.type === "string" ? candidate.type : null,
    size: typeof candidate.size === "number" ? candidate.size : null,
    hasArrayBuffer: typeof candidate.arrayBuffer === "function",
  };
}

function buildFileSignature(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}:${file.type}`;
}

function buildDraftImagesLog(draftImages: AdminProductImageDraftSubmitInput[]) {
  const existing: Array<{ position: number; key: string; alt: string }> = [];
  const newImages: Array<{ position: number; temporaryId: string; fileSignature: string; alt: string }> = [];

  for (const [index, item] of draftImages.entries()) {
    const position = index + 1;

    if (item.existing) {
      existing.push({
        position,
        key: item.key,
        alt: item.alt?.trim() ?? "",
      });
      continue;
    }

    newImages.push({
      position,
      temporaryId: item.temporaryId,
      fileSignature: item.fileSignature,
      alt: item.alt?.trim() ?? "",
    });
  }

  return {
    total: draftImages.length,
    existing: existing.length,
    new: newImages,
  };
}

function getTemporaryIdFromFileField(fieldName: string) {
  if (!fieldName.startsWith("file:")) {
    return null;
  }

  const temporaryId = fieldName.slice("file:".length).trim();

  return temporaryId.length > 0 ? temporaryId : null;
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

function buildFinalImages(args: {
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

async function commitRevalidatedPatch(args: {
  product: AdminProductImageDocument;
  rev: string;
  patch: {
    ifRevisionId(rev: string): {
      commit(options?: { returnDocuments?: boolean }): Promise<unknown>;
    };
  };
}): Promise<AdminProductImageDocument> {
  const committedProduct = (await args.patch.ifRevisionId(args.rev).commit({ returnDocuments: true })) as AdminProductImageDocument;

  for (const path of buildRevalidationPaths(args.product)) {
    revalidatePath(path);
  }

  return committedProduct;
}

function parseFormValues(formData: FormData): ParsedFormValues {
  const rawValues = {
    productId: String(formData.get("productId") ?? ""),
    rev: String(formData.get("rev") ?? ""),
    draftImagesJson: String(formData.get("draftImagesJson") ?? ""),
  };

  const parsed = adminProductImageCommitFormSchema.safeParse(rawValues);

  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: extractFieldErrors(parsed.error),
    };
  }

  return {
    success: true,
    data: parsed.data,
  };
}

export async function commitProductImagesAction(
  previousState: AdminProductImageActionState = DEFAULT_ACTION_STATE,
  formData: FormData,
): Promise<AdminProductImageActionState> {
  void previousState;

  await requireAdminSession();
  const cookieStore = await cookies();
  const snapshot = deserializeAdminProductDetailSnapshot(cookieStore.get(ADMIN_PRODUCT_DETAIL_SNAPSHOT_COOKIE)?.value);

  const parsed = parseFormValues(formData);

  if (!parsed.success) {
    return buildErrorState("Revisa los campos marcados.", parsed.fieldErrors);
  }

  const draftImagesResult = parseDraftImagesJson(parsed.data.draftImagesJson);

  if (!draftImagesResult.success) {
    return buildErrorState("No pudimos leer el estado local de las imagenes.", draftImagesResult.fieldErrors);
  }

  const draftImages = draftImagesResult.data;
  const mutationId = crypto.randomUUID();
  logCommitStage("commit_received", {
    productId: parsed.data.productId,
    submittedRev: parsed.data.rev,
    draftImagesCount: draftImages.length,
  });
  logger.debug("admin.products.mutation_started", {
    mutationId,
    source: "images",
    productId: parsed.data.productId,
    submittedRev: parsed.data.rev,
    timestamp: new Date().toISOString(),
  });
  logCommitStage("received_draft", {
    productId: parsed.data.productId,
    rev: parsed.data.rev,
    ...buildDraftImagesLog(draftImages),
  });

  if (draftImages.length <= 0) {
    return buildErrorState("El producto no puede quedar sin imagenes.", {
      draftImagesJson: ["El producto no puede quedar sin imagenes."],
    });
  }

  const [currentProduct] = await Promise.all([
    sanityFreshFetch<AdminProductImageDocument | null>(adminProductDetailQuery, { productId: parsed.data.productId }),
  ]);

  if (!currentProduct) {
    return buildErrorState("No encontramos el producto para actualizar.", {
      productId: ["No encontramos el producto para actualizar."],
    });
  }

  const snapshotMatches = snapshot?.productId === parsed.data.productId && snapshot?.rev === parsed.data.rev;
  const snapshotCurrentImages = snapshotMatches ? normalizeSnapshotImages(snapshot) : null;
  const validationBaseImages = snapshotCurrentImages ?? normalizeImages(currentProduct.images);
  const currentImages = validationBaseImages;

  logger.debug("admin.products.images.current_document", {
    id: currentProduct._id,
    submittedRev: parsed.data.rev,
    currentRev: currentProduct._rev,
    updatedAt: currentProduct._updatedAt,
    imagesCount: currentProduct.images?.length ?? 0,
    revMatches: currentProduct._rev === parsed.data.rev,
    snapshotRev: snapshot?.rev ?? null,
    snapshotUpdatedAt: snapshot?.updatedAt ?? null,
    snapshotMatches,
  });

  logger.debug("admin.products.images.snapshot_validation", {
    productId: parsed.data.productId,
    submittedRev: parsed.data.rev,
    snapshotRev: snapshot?.rev ?? null,
    snapshotMatches,
    auxiliaryCurrentRev: currentProduct._rev,
    auxiliaryReadIsStale: currentProduct._rev !== parsed.data.rev,
    validationBase: snapshotCurrentImages ? "snapshot" : "current_document",
    validationBaseImagesCount: validationBaseImages?.length ?? 0,
  });

  if (!currentImages) {
    return buildErrorState("No pudimos leer las imagenes actuales. Recargá y volvé a intentar.");
  }

  const filesByTemporaryId = new Map<string, File>();
  const receivedFiles: Array<{
    fieldName: string;
    temporaryId: string;
    constructorName: string | null;
    name: string | null;
    type: string | null;
    size: number | null;
    hasArrayBuffer: boolean;
    draftFileSignature: string | null;
    serverFileSignature: string | null;
    matchesDraftSignature: boolean | null;
  }> = [];
  const uploadValidationErrors: string[] = [];
  const expectedNewImages = draftImages.filter(
    (item): item is AdminProductImageDraftSubmitInput & { existing: false } => !item.existing,
  );
  const expectedTemporaryIds = new Set(expectedNewImages.map((item) => item.temporaryId));

  for (const [fieldName, value] of formData.entries()) {
    const temporaryId = getTemporaryIdFromFileField(fieldName);

    if (!temporaryId) {
      continue;
    }

    if (!expectedTemporaryIds.has(temporaryId)) {
      uploadValidationErrors.push(`Archivo ${fieldName}: no coincide con una imagen nueva del editor.`);
      logger.warn("admin.products.images.file_rejected", {
        productId: parsed.data.productId,
        rev: parsed.data.rev,
        fieldName,
        temporaryId,
        reason: "unexpected_temporary_id",
        ...describeUploadValue(value),
      });
      continue;
    }

    if (!isUploadFileLike(value)) {
      uploadValidationErrors.push(`Archivo ${fieldName}: no se pudo leer como archivo.`);
      logger.warn("admin.products.images.file_rejected", {
        productId: parsed.data.productId,
        rev: parsed.data.rev,
        fieldName,
        temporaryId,
        reason: "not_file_like",
        ...describeUploadValue(value),
      });
      continue;
    }

    const validationError = validateUploadFile(value);

    if (validationError) {
      uploadValidationErrors.push(validationError);
      logger.warn("admin.products.images.file_rejected", {
        productId: parsed.data.productId,
        rev: parsed.data.rev,
        fieldName,
        temporaryId,
        reason: validationError,
        ...describeUploadValue(value),
      });
      continue;
    }

    const draftItem = expectedNewImages.find((item) => item.temporaryId === temporaryId);
    const serverFileSignature = buildFileSignature(value);

    receivedFiles.push({
      fieldName,
      temporaryId,
      constructorName: value.constructor?.name ?? null,
      name: value.name ?? null,
      type: value.type ?? null,
      size: value.size ?? null,
      hasArrayBuffer: typeof value.arrayBuffer === "function",
      draftFileSignature: draftItem?.fileSignature ?? null,
      serverFileSignature,
      matchesDraftSignature: draftItem ? draftItem.fileSignature === serverFileSignature : null,
    });

    filesByTemporaryId.set(temporaryId, value);
  }

  logger.debug("admin.products.images.received_files", {
    productId: parsed.data.productId,
    rev: parsed.data.rev,
    count: receivedFiles.length,
    files: receivedFiles,
  });

  if (uploadValidationErrors.length > 0) {
    const state = buildErrorState("No pudimos guardar los cambios porque hay archivos invalidos.", {
      files: uploadValidationErrors,
    });
    logCommitResult("invalid_upload_files", state, {
      expectedFiles: expectedNewImages.length,
      receivedFiles: receivedFiles.length,
    });
    return state;
  }

  for (const item of expectedNewImages) {
    logger.debug("admin.products.images.correlation_debug", {
      draftTemporaryId: item.temporaryId,
      draftTemporaryIdJson: JSON.stringify(item.temporaryId),
      draftTemporaryIdLength: item.temporaryId.length,
      availableKeys: [...filesByTemporaryId.keys()],
      availableKeysJson: JSON.stringify([...filesByTemporaryId.keys()]),
      availableKeyLengths: [...filesByTemporaryId.keys()].map((key) => key.length),
      mapHas: filesByTemporaryId.has(item.temporaryId),
    });

    if (!filesByTemporaryId.has(item.temporaryId)) {
      logger.debug("admin.products.images.correlation_missing_debug", {
        requestedTemporaryId: item.temporaryId,
        availableTemporaryIds: [...filesByTemporaryId.keys()],
      });

      const state = buildErrorState("No coincidieron los archivos nuevos con el estado local.", {
        files: ["No pudimos encontrar uno de los archivos nuevos en el formulario."],
        draftImagesJson: ["No coincidieron los archivos nuevos con el estado local."],
      });
      logCommitResult("correlation_missing", state, {
        temporaryId: item.temporaryId,
        expectedFiles: expectedNewImages.length,
        receivedFiles: receivedFiles.length,
      });
      return state;
    }
  }

  const writeClient = getAdminProductsWriteClient();
  const uploadedAssetIds: string[] = [];
  const uploadedAssetRefs = new Map<string, string>();

  try {
    for (const item of draftImages) {
      if (item.existing) {
        continue;
      }

      const file = filesByTemporaryId.get(item.temporaryId);

      if (!file) {
        logger.debug("admin.products.images.correlation_missing_debug", {
          requestedTemporaryId: item.temporaryId,
          availableTemporaryIds: [...filesByTemporaryId.keys()],
        });

        const state = buildErrorState("No coincidieron los archivos nuevos con el estado local.", {
          files: ["No pudimos encontrar uno de los archivos nuevos en el formulario."],
          draftImagesJson: ["No coincidieron los archivos nuevos con el estado local."],
        });
        logCommitResult("correlation_missing", state, {
          temporaryId: item.temporaryId,
          expectedFiles: expectedNewImages.length,
          receivedFiles: receivedFiles.length,
        });
        return state;
      }

      try {
        logCommitStage("uploading", {
          productId: parsed.data.productId,
          rev: parsed.data.rev,
          temporaryId: item.temporaryId,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        });

        const uploadedAsset = await writeClient.assets.upload("image", file, {
          filename: file.name || `${parsed.data.productId}-${item.temporaryId}.jpg`,
          contentType: file.type,
        });

        uploadedAssetIds.push(uploadedAsset._id);
        uploadedAssetRefs.set(item.temporaryId, uploadedAsset._id);
        logCommitStage("uploaded", {
          productId: parsed.data.productId,
          rev: parsed.data.rev,
          temporaryId: item.temporaryId,
          assetId: uploadedAsset._id,
        });
      } catch (error) {
        if (uploadedAssetIds.length > 0) {
          logger.error("admin.products.images.orphan_asset", {
            productId: parsed.data.productId,
            rev: parsed.data.rev,
            assetIds: uploadedAssetIds,
            error: error instanceof Error ? error.message : String(error),
          });
        }

        const state = buildPartialState("No pudimos guardar los cambios porque fallo una de las imagenes nuevas.", {
          files: [`Archivo ${file.name || item.temporaryId}: no se pudo subir.`],
        });
        logCommitResult("upload_failed", state, {
          temporaryId: item.temporaryId,
          assetIds: uploadedAssetIds,
        });
        return state;
      }
    }

    const finalImages = buildFinalImages({
      currentImages,
      draftImages,
      uploadedAssetRefs,
    });

    if (!finalImages) {
      const state = buildErrorState("No pudimos guardar los cambios porque el estado local ya no coincide con el producto.", {
        draftImagesJson: ["No pudimos guardar los cambios porque el estado local ya no coincide con el producto."],
      });
      logCommitResult("final_images_invalid", state, {
        uploadedFiles: uploadedAssetRefs.size,
      });
      return state;
    }

    logCommitStage("final_images_built", {
      productId: parsed.data.productId,
      rev: parsed.data.rev,
      total: finalImages.length,
    });
    logCommitStage("patch_started", {
      productId: parsed.data.productId,
      rev: parsed.data.rev,
      total: finalImages.length,
    });

    logger.debug("admin.products.images.pre_patch", {
      productId: parsed.data.productId,
      submittedRev: parsed.data.rev,
      snapshotRev: snapshot?.rev ?? null,
      auxiliaryCurrentRev: currentProduct._rev,
      auxiliaryReadIsStale: currentProduct._rev !== parsed.data.rev,
      finalImagesCount: finalImages.length,
    });

    const committedProduct = await commitRevalidatedPatch({
      product: currentProduct,
      rev: parsed.data.rev,
      patch: writeClient.patch(currentProduct._id).set({ images: finalImages }),
    });

    logCommitStage("patch_committed", {
      productId: parsed.data.productId,
      rev: parsed.data.rev,
      uploadedFiles: uploadedAssetRefs.size,
      finalImages: finalImages.length,
    });

    const successState: AdminProductImageActionState = {
      status: "success",
      message: "Cambios guardados correctamente.",
      rev: committedProduct._rev,
      updatedAt: committedProduct._updatedAt,
      images: normalizeCommittedImages(committedProduct.images),
    };
    logger.debug("admin.products.mutation_committed", {
      mutationId,
      source: "images",
      productId: parsed.data.productId,
      previousRev: parsed.data.rev,
      committedRev: committedProduct._rev,
      updatedAt: committedProduct._updatedAt,
    });
    await writeAdminProductDetailSnapshotCookie({
      productId: parsed.data.productId,
      rev: committedProduct._rev,
      updatedAt: committedProduct._updatedAt,
      images: successState.images,
    });
    logCommitResult("success", successState, {
      productId: parsed.data.productId,
      rev: committedProduct._rev,
      uploadedFiles: uploadedAssetRefs.size,
      finalImages: finalImages.length,
    });
    return successState;
  } catch (error) {
    if (uploadedAssetIds.length > 0) {
      logger.error("admin.products.images.orphan_asset", {
        productId: parsed.data.productId,
        rev: parsed.data.rev,
        assetIds: uploadedAssetIds,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    if (isRevisionConflictError(error)) {
      const state: AdminProductImageActionState = {
        status: "conflict",
        message: "El producto cambió desde que abriste el editor. Recargá y volvé a intentar.",
      };
      logCommitResult("patch_conflict", state, {
        productId: parsed.data.productId,
        rev: parsed.data.rev,
        uploadedFiles: uploadedAssetRefs.size,
      });
      return state;
    }

    logger.error("admin.products.images.failed", {
      productId: parsed.data.productId,
      rev: parsed.data.rev,
      error: error instanceof Error ? error.message : String(error),
    });

    const state: AdminProductImageActionState = {
      status: "error",
      message: "No pudimos guardar los cambios de imagen. Intentalo de nuevo.",
    };
    logCommitResult("patch_failed", state, {
      productId: parsed.data.productId,
      rev: parsed.data.rev,
      uploadedFiles: uploadedAssetRefs.size,
    });
    return state;
  }
}
