"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { requireAdminSession } from "@/features/admin/auth";
import { sanityAdminEditFetch, sanityFreshFetch } from "@/integrations/sanity/client";
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
  SAFE_PRODUCT_IMAGE_UPLOAD_REQUEST_BYTES,
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

type UploadProductImageAssetActionState =
  | {
      status: "success";
      temporaryId: string;
      assetRef: string;
      fileSignature: string;
      fileName: string;
      fileType: string;
      fileSize: number;
    }
  | {
      status: "error";
      code:
        | "UNSUPPORTED_FORMAT"
        | "FILE_TOO_LARGE"
        | "FILE_MISMATCH"
        | "UPLOAD_FAILED"
        | "NETWORK_ERROR";
      message: string;
    };

type CleanupProductImageAssetsActionState = {
  status: "success" | "error";
  deletedAssetRefs: string[];
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

type UploadedAdminProductImageDraftSubmitInput = AdminProductImageDraftSubmitInput & {
  existing: false;
  assetRef: string;
  uploadFileSignature: string;
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

function hasUploadedAssetInfo(
  item: AdminProductImageDraftSubmitInput & { existing: false },
): item is UploadedAdminProductImageDraftSubmitInput {
  return Boolean(item.assetRef?.trim() && item.uploadFileSignature?.trim());
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
  return `${file.name}:${file.size}:${file.type}`;
}

function buildDraftImagesLog(draftImages: AdminProductImageDraftSubmitInput[]) {
  const existing: Array<{ position: number; key: string; alt: string }> = [];
  const newImages: Array<{
    position: number;
    temporaryId: string;
    fileSignature: string;
    uploadFileSignature: string;
    assetRef: string;
    alt: string;
  }> = [];

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
      uploadFileSignature: item.uploadFileSignature ?? "",
      assetRef: item.assetRef ?? "",
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
}): AdminProductImageItem[] | null {
  const currentByKey = new Map(args.currentImages.map((image) => [image._key, image] as const));
  const seenExistingKeys = new Set<string>();
  const seenNewTemporaryIds = new Set<string>();
  const seenNewAssetRefs = new Set<string>();
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

    if (!hasUploadedAssetInfo(item)) {
      return null;
    }

    if (seenNewAssetRefs.has(item.assetRef)) {
      return null;
    }

    seenNewTemporaryIds.add(item.temporaryId);
    seenNewAssetRefs.add(item.assetRef);
    finalImages.push(buildSanityImageDocument(item.assetRef, item.alt?.trim() || undefined));
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

async function countAssetReferences(assetRef: string) {
  return sanityFreshFetch<number>(
    `count(*[_id != $assetRef && references($assetRef)])`,
    { assetRef },
  );
}

export async function uploadProductImageAssetAction(formData: FormData): Promise<UploadProductImageAssetActionState> {
  await requireAdminSession();

  const productId = String(formData.get("productId") ?? "");
  const temporaryId = String(formData.get("temporaryId") ?? "");
  const expectedFileSignature = String(formData.get("fileSignature") ?? "");
  const value = formData.get("file");

  if (!productId.trim() || !temporaryId.trim() || !expectedFileSignature.trim()) {
    return {
      status: "error",
      code: "FILE_MISMATCH",
      message: "No pudimos validar una de las imagenes nuevas.",
    };
  }

  if (!isUploadFileLike(value)) {
    logger.warn("admin.products.images.single_upload_rejected", {
      productId,
      temporaryId,
      reason: "not_file_like",
      ...describeUploadValue(value),
    });
    return {
      status: "error",
      code: "FILE_MISMATCH",
      message: "No pudimos leer una de las imagenes nuevas.",
    };
  }

  const validationError = validateUploadFile(value);

  if (validationError) {
    logger.warn("admin.products.images.single_upload_rejected", {
      productId,
      temporaryId,
      reason: validationError,
      ...describeUploadValue(value),
    });
    return {
      status: "error",
      code: !isAllowedProductImageMimeType(value.type) ? "UNSUPPORTED_FORMAT" : "FILE_TOO_LARGE",
      message: validationError,
    };
  }

  if (value.size > SAFE_PRODUCT_IMAGE_UPLOAD_REQUEST_BYTES) {
    logger.warn("admin.products.images.single_upload_rejected", {
      productId,
      temporaryId,
      reason: "safe_request_limit_exceeded",
      fileName: value.name,
      fileType: value.type,
      fileSize: value.size,
      safeLimit: SAFE_PRODUCT_IMAGE_UPLOAD_REQUEST_BYTES,
    });
    return {
      status: "error",
      code: "FILE_TOO_LARGE",
      message: "La imagen sigue siendo demasiado pesada para subirla de forma segura.",
    };
  }

  const serverFileSignature = buildFileSignature(value);

  if (serverFileSignature !== expectedFileSignature) {
    logger.warn("admin.products.images.single_upload_rejected", {
      productId,
      temporaryId,
      reason: "file_signature_mismatch",
      expectedFileSignature,
      serverFileSignature,
      fileName: value.name,
      fileType: value.type,
      fileSize: value.size,
    });
    return {
      status: "error",
      code: "FILE_MISMATCH",
      message: "Una imagen cambio antes de subirse. Volve a seleccionarla.",
    };
  }

  try {
    const writeClient = getAdminProductsWriteClient();
    logger.debug("admin.products.images.single_upload_started", {
      productId,
      temporaryId,
      fileName: value.name,
      fileType: value.type,
      fileSize: value.size,
    });

    const uploadedAsset = await writeClient.assets.upload("image", value, {
      filename: value.name || `${productId}-${temporaryId}.jpg`,
      contentType: value.type,
    });

    logger.debug("admin.products.images.single_upload_finished", {
      productId,
      temporaryId,
      assetRef: uploadedAsset._id,
      fileName: value.name,
      fileType: value.type,
      fileSize: value.size,
    });

    return {
      status: "success",
      temporaryId,
      assetRef: uploadedAsset._id,
      fileSignature: serverFileSignature,
      fileName: value.name,
      fileType: value.type,
      fileSize: value.size,
    };
  } catch (error) {
    logger.error("admin.products.images.single_upload_failed", {
      productId,
      temporaryId,
      fileName: value.name,
      fileType: value.type,
      fileSize: value.size,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      status: "error",
      code: "UPLOAD_FAILED",
      message: "No pudimos subir una de las imagenes nuevas.",
    };
  }
}

export async function cleanupProductImageAssetsAction(
  assetRefs: string[],
): Promise<CleanupProductImageAssetsActionState> {
  await requireAdminSession();

  const uniqueAssetRefs = [...new Set(assetRefs.filter((assetRef) => assetRef.startsWith("image-")))];
  const deletedAssetRefs: string[] = [];

  if (uniqueAssetRefs.length === 0) {
    return {
      status: "success",
      deletedAssetRefs,
    };
  }

  const writeClient = getAdminProductsWriteClient();

  for (const assetRef of uniqueAssetRefs) {
    try {
      const referencesCount = await countAssetReferences(assetRef);

      if (referencesCount > 0) {
        logger.warn("admin.products.images.cleanup_skipped_referenced_asset", {
          assetRef,
          referencesCount,
        });
        continue;
      }

      await writeClient.delete(assetRef);
      deletedAssetRefs.push(assetRef);
    } catch (error) {
      logger.error("admin.products.images.cleanup_failed", {
        assetRef,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    status: deletedAssetRefs.length === uniqueAssetRefs.length ? "success" : "error",
    deletedAssetRefs,
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

  // `sanityAdminEditFetch`, not `sanityFreshFetch`: Galería is usable from
  // the moment Crear producto opens, before the draft is finalized — see
  // the doc comment on `sanityAdminEditFetch` in
  // src/integrations/sanity/client.ts.
  const [currentProduct] = await Promise.all([
    sanityAdminEditFetch<AdminProductImageDocument | null>(adminProductDetailQuery, { productId: parsed.data.productId }),
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

  const submittedNewImages = draftImages.filter(
    (item): item is AdminProductImageDraftSubmitInput & { existing: false } => !item.existing,
  );
  const missingUploadedAssetInfo = submittedNewImages.filter((item) => !hasUploadedAssetInfo(item));

  if (missingUploadedAssetInfo.length > 0) {
    const state = buildErrorState("No coincidieron las imagenes nuevas con el estado local.", {
      draftImagesJson: ["Una imagen nueva no fue subida antes de guardar la galeria."],
    });
    logCommitResult("missing_uploaded_asset_info", state, {
      missingTemporaryIds: missingUploadedAssetInfo.map((item) => item.temporaryId),
    });
    return state;
  }

  const expectedNewImages = submittedNewImages.filter(hasUploadedAssetInfo);
  const unexpectedFileFields: string[] = [];

  for (const [fieldName, value] of formData.entries()) {
    const temporaryId = getTemporaryIdFromFileField(fieldName);

    if (!temporaryId) {
      continue;
    }

    unexpectedFileFields.push(fieldName);
    logger.warn("admin.products.images.file_rejected", {
      productId: parsed.data.productId,
      rev: parsed.data.rev,
      fieldName,
      temporaryId,
      reason: "commit_does_not_accept_file_bytes",
      ...describeUploadValue(value),
    });
  }

  if (unexpectedFileFields.length > 0) {
    const state = buildErrorState("No pudimos guardar los cambios porque el commit recibio archivos inesperados.", {
      files: unexpectedFileFields.map((fieldName) => `Archivo ${fieldName}: subilo antes de guardar la galeria.`),
    });
    logCommitResult("unexpected_commit_files", state, {
      expectedNewImages: expectedNewImages.length,
      unexpectedFileFields,
    });
    return state;
  }

  const expectedTemporaryIds = new Set<string>();
  const expectedAssetRefs = new Set<string>();

  for (const item of expectedNewImages) {
    if (expectedTemporaryIds.has(item.temporaryId) || expectedAssetRefs.has(item.assetRef)) {
      const state = buildErrorState("No coincidieron las imagenes nuevas con el estado local.", {
        draftImagesJson: ["Hay imagenes nuevas duplicadas en el estado local."],
      });
      logCommitResult("duplicate_new_image", state, {
        temporaryId: item.temporaryId,
        assetRef: item.assetRef,
      });
      return state;
    }

    expectedTemporaryIds.add(item.temporaryId);
    expectedAssetRefs.add(item.assetRef);
  }

  const writeClient = getAdminProductsWriteClient();
  const newAssetRefs = [...expectedAssetRefs];

  try {
    if (newAssetRefs.length > 0) {
      const existingAssets = await sanityFreshFetch<Array<{ _id: string }>>(
        `*[_type == "sanity.imageAsset" && _id in $assetRefs]{_id}`,
        { assetRefs: newAssetRefs },
      );
      const existingAssetRefs = new Set(existingAssets.map((asset) => asset._id));
      const missingAssetRefs = newAssetRefs.filter((assetRef) => !existingAssetRefs.has(assetRef));

      if (missingAssetRefs.length > 0) {
        const state = buildErrorState("No pudimos validar una de las imagenes nuevas.", {
          draftImagesJson: ["Una imagen nueva no tiene asset valido."],
        });
        logCommitResult("missing_uploaded_asset", state, {
          missingAssetRefs,
        });
        return state;
      }
    }

    const finalImages = buildFinalImages({
      currentImages,
      draftImages,
    });

    if (!finalImages) {
      const state = buildErrorState("No pudimos guardar los cambios porque el estado local ya no coincide con el producto.", {
        draftImagesJson: ["No pudimos guardar los cambios porque el estado local ya no coincide con el producto."],
      });
      logCommitResult("final_images_invalid", state, {
        uploadedFiles: expectedNewImages.length,
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
      uploadedFiles: expectedNewImages.length,
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
      uploadedFiles: expectedNewImages.length,
      finalImages: finalImages.length,
    });
    return successState;
  } catch (error) {
    if (isRevisionConflictError(error)) {
      const state: AdminProductImageActionState = {
        status: "conflict",
        message: "El producto cambió desde que abriste el editor. Recargá y volvé a intentar.",
      };
      logCommitResult("patch_conflict", state, {
        productId: parsed.data.productId,
        rev: parsed.data.rev,
        uploadedFiles: expectedNewImages.length,
        assetRefs: newAssetRefs,
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
      uploadedFiles: expectedNewImages.length,
      assetRefs: newAssetRefs,
    });
    return state;
  }
}
