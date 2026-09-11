"use client";
/* eslint-disable react-hooks/exhaustive-deps */

import Image from "next/image";
import { Reorder } from "framer-motion";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";
import { dashboardUi } from "@/features/admin/dashboard/lib/dashboard-ui";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_PRODUCT_IMAGE_UPLOAD_BYTES,
  MAX_PRODUCT_IMAGE_UPLOAD_TOTAL_BYTES,
  PRODUCT_IMAGE_OPTIMIZATION_MAX_EDGE,
  PRODUCT_IMAGE_OPTIMIZATION_QUALITY,
  SAFE_PRODUCT_IMAGE_UPLOAD_REQUEST_BYTES,
  isAllowedProductImageMimeType,
} from "../lib/product-image-constraints";
import {
  cleanupProductImageAssetsAction,
  commitProductImagesAction,
  uploadProductImageAssetAction,
} from "../actions/update-product-images-action";
import { useAdminProductRevision } from "../context/admin-product-revision-context";
import type {
  AdminProductDetailData,
  AdminProductImageActionState,
  AdminProductImageData,
  AdminProductImageDraftExistingItem,
  AdminProductImageDraftItem,
  AdminProductImageDraftNewItem,
  AdminProductImageDraftSubmitItem,
} from "../types";

const INITIAL_STATE: AdminProductImageActionState = {
  status: "idle",
};

type PendingUploadSelection = {
  files: FileList | File[];
};

type UploadedDraftAsset = {
  temporaryId: string;
  assetRef: string;
  originalFileSignature: string;
  uploadFileSignature: string;
};

type ImageOptimizationResult = {
  file: File;
  fileSignature: string;
  optimized: boolean;
};

function formatUploadLimit(bytes: number) {
  const megabytes = bytes / (1024 * 1024);
  return `${megabytes.toFixed(megabytes % 1 === 0 ? 0 : 1)} MB`;
}

const TOTAL_UPLOAD_LIMIT_MESSAGE =
  "Las imágenes seleccionadas superan el tamaño máximo permitido. Subí menos imágenes por vez.";

function buildFileSignature(file: File) {
  return `${file.name}:${file.size}:${file.type}`;
}

function getTotalFileSize(files: Array<{ size: number }>) {
  return files.reduce((total, file) => total + file.size, 0);
}

function getFileExtension(fileName: string) {
  const extension = fileName.split(".").pop()?.trim().toLowerCase();
  return extension ? `.${extension}` : "";
}

function isHeicLikeFile(file: File) {
  const extension = getFileExtension(file.name);
  return file.type === "image/heic" || file.type === "image/heif" || extension === ".heic" || extension === ".heif";
}

function replaceFileExtension(fileName: string, extension: string) {
  const trimmedName = fileName.trim() || "producto";
  const dotIndex = trimmedName.lastIndexOf(".");
  const baseName = dotIndex > 0 ? trimmedName.slice(0, dotIndex) : trimmedName;

  return `${baseName}${extension}`;
}

function loadImageElement(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = window.URL.createObjectURL(file);
    const image = new window.Image();

    image.onload = () => {
      window.URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      window.URL.revokeObjectURL(url);
      reject(new Error("image_load_failed"));
    };
    image.src = url;
  });
}

function getOptimizedDimensions(width: number, height: number) {
  const longestEdge = Math.max(width, height);

  if (longestEdge <= PRODUCT_IMAGE_OPTIMIZATION_MAX_EDGE) {
    return { width, height };
  }

  const scale = PRODUCT_IMAGE_OPTIMIZATION_MAX_EDGE / longestEdge;

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
}

function detectCanvasAlpha(canvas: HTMLCanvasElement) {
  const sampleSize = 96;
  const sampleCanvas = document.createElement("canvas");
  const context = sampleCanvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    return false;
  }

  sampleCanvas.width = sampleSize;
  sampleCanvas.height = sampleSize;
  context.drawImage(canvas, 0, 0, sampleSize, sampleSize);

  const data = context.getImageData(0, 0, sampleSize, sampleSize).data;

  for (let index = 3; index < data.length; index += 4) {
    if (data[index] < 255) {
      return true;
    }
  }

  return false;
}

async function optimizeImageForSafeUpload(file: File): Promise<ImageOptimizationResult> {
  if (file.size <= SAFE_PRODUCT_IMAGE_UPLOAD_REQUEST_BYTES) {
    return {
      file,
      fileSignature: buildFileSignature(file),
      optimized: false,
    };
  }

  const image = await loadImageElement(file);
  const dimensions = getOptimizedDimensions(image.naturalWidth || image.width, image.naturalHeight || image.height);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { alpha: true });

  if (!context) {
    throw new Error("OPTIMIZATION_FAILED");
  }

  canvas.width = dimensions.width;
  canvas.height = dimensions.height;
  context.drawImage(image, 0, 0, dimensions.width, dimensions.height);

  const sourceHasAlpha = file.type === "image/png" && detectCanvasAlpha(canvas);
  const prefersWebp = file.type === "image/png" || file.type === "image/webp";
  const targetType = prefersWebp ? "image/webp" : "image/jpeg";
  const targetExtension = prefersWebp ? ".webp" : ".jpg";
  let blob = await canvasToBlob(canvas, targetType, PRODUCT_IMAGE_OPTIMIZATION_QUALITY);

  if (prefersWebp && (!blob || blob.type !== "image/webp")) {
    blob = sourceHasAlpha
      ? await canvasToBlob(canvas, "image/png")
      : await canvasToBlob(canvas, "image/jpeg", PRODUCT_IMAGE_OPTIMIZATION_QUALITY);
  }

  if (!blob || blob.size <= 0 || blob.size > SAFE_PRODUCT_IMAGE_UPLOAD_REQUEST_BYTES) {
    throw new Error("FILE_TOO_LARGE");
  }

  const optimizedFile = new File([blob], replaceFileExtension(file.name, targetExtension), {
    type: blob.type || targetType,
    lastModified: Date.now(),
  });

  return {
    file: optimizedFile,
    fileSignature: buildFileSignature(optimizedFile),
    optimized: true,
  };
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path
        d="M9 3.75h6M4.75 6h14.5M9.75 6v-.75h4.5V6m-7 0 .75 12.25a1.75 1.75 0 0 0 1.75 1.6h4.5a1.75 1.75 0 0 0 1.75-1.6L16.25 6"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.75"
      />
    </svg>
  );
}

function buildInitialDraftImages(images: AdminProductDetailData["images"]): AdminProductImageDraftExistingItem[] {
  return images.map((image) => ({
    id: `existing:${image.key}`,
    existing: true,
    key: image.key,
    assetRef: image.assetRef,
    imageUrl: image.url,
    alt: image.alt,
  }));
}

function cloneDraftImages(images: AdminProductImageDraftItem[]): AdminProductImageDraftItem[] {
  return images.map((image) => {
    if (image.existing) {
      return { ...image };
    }

    return { ...image };
  });
}

function buildCommittedDraftImages(
  draftImages: AdminProductImageDraftItem[],
  savedImages: AdminProductImageData[],
): AdminProductImageDraftExistingItem[] {
  return savedImages.flatMap((savedImage, index) => {
    const draftImage = draftImages[index];

    if (!draftImage) {
      return [];
    }

    return [
      {
        id: `existing:${savedImage.key}`,
        existing: true,
        key: savedImage.key,
        assetRef: savedImage.assetRef,
        imageUrl: savedImage.url ?? (draftImage.existing ? draftImage.imageUrl : null),
        previewUrl: draftImage.previewUrl,
        alt: savedImage.alt,
      },
    ];
  });
}

function buildDraftImageSignature(image: AdminProductImageDraftItem) {
  if (image.existing) {
    return `existing:${image.key}:${image.assetRef}:${image.alt.trim()}`;
  }

  return `new:${image.temporaryId}:${image.alt.trim()}:${buildFileSignature(image.file)}`;
}

function buildDraftImagesSignature(images: AdminProductImageDraftItem[]) {
  return images.map(buildDraftImageSignature).join("|");
}

function buildSubmitItem(
  image: AdminProductImageDraftItem,
  uploadedAssets: Map<string, UploadedDraftAsset>,
): AdminProductImageDraftSubmitItem {
  if (image.existing) {
    return {
      existing: true,
      key: image.key,
      assetRef: image.assetRef,
      alt: image.alt.trim(),
    };
  }

  const uploadedAsset = uploadedAssets.get(image.temporaryId);

  if (!uploadedAsset) {
    throw new Error("FILE_MISMATCH");
  }

  return {
    existing: false,
    temporaryId: image.temporaryId,
    fileSignature: image.fileSignature,
    uploadFileSignature: uploadedAsset.uploadFileSignature,
    assetRef: uploadedAsset.assetRef,
    alt: image.alt.trim(),
  };
}

function reorderDraftImages(images: AdminProductImageDraftItem[], orderedIds: string[]) {
  const imageById = new Map(images.map((image) => [image.id, image] as const));
  const nextImages: AdminProductImageDraftItem[] = [];
  const seen = new Set<string>();

  for (const id of orderedIds) {
    if (seen.has(id)) {
      return images;
    }

    const image = imageById.get(id);

    if (!image) {
      return images;
    }

    nextImages.push(image);
    seen.add(id);
  }

  return nextImages.length === images.length ? nextImages : images;
}

type AdminProductImagesSectionProps = {
  product: AdminProductDetailData;
};

export function AdminProductImagesSection({ product }: AdminProductImagesSectionProps) {
  const { currentRev, applyCommit } = useAdminProductRevision();
  const [submitState, setSubmitState] = useState<AdminProductImageActionState>(INITIAL_STATE);
  const [isSaving, setIsSaving] = useState(false);
  const initialDraftImages = useMemo(() => buildInitialDraftImages(product.images), [product.images]);
  const [savedDraftImages, setSavedDraftImages] = useState<AdminProductImageDraftItem[]>(() =>
    cloneDraftImages(initialDraftImages),
  );
  const draftImagesRef = useRef<AdminProductImageDraftItem[]>(cloneDraftImages(initialDraftImages));
  const uploadedAssetCacheRef = useRef(new Map<string, UploadedDraftAsset>());
  const newFilesInputRef = useRef<HTMLInputElement>(null);
  const objectUrlsRef = useRef(new Set<string>());
  const [draftImages, setDraftImages] = useState<AdminProductImageDraftItem[]>(() => cloneDraftImages(initialDraftImages));
  const [selectedImageId, setSelectedImageId] = useState<string | null>(() => initialDraftImages[0]?.id ?? null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorAlt, setEditorAlt] = useState("");
  const [selectionMessage, setSelectionMessage] = useState<string | null>(null);
  const [saveProgressMessage, setSaveProgressMessage] = useState<string | null>(null);
  const [dropActive, setDropActive] = useState(false);

  useEffect(() => {
    draftImagesRef.current = draftImages;
  }, [draftImages]);

  useEffect(() => {
    logger.debug("admin.products.images.client_initialized", {
      productId: product.id,
      initialRev: currentRev,
      imagesCount: product.images.length,
    });
  }, [currentRev, product.id, product.images.length]);

  useEffect(() => {
    if (submitState.status !== "success") {
      return;
    }

    const timeout = window.setTimeout(() => {
      setSubmitState(INITIAL_STATE);
    }, 1400);

    return () => window.clearTimeout(timeout);
  }, [submitState.status]);

  useEffect(() => {
    return () => {
      const objectUrls = objectUrlsRef.current;

      for (const url of objectUrls) {
        window.URL.revokeObjectURL(url);
      }
      objectUrls.clear();
    };
  }, []);

  const selectedImage = useMemo(
    () => draftImages.find((image) => image.id === selectedImageId) ?? null,
    [draftImages, selectedImageId],
  );

  const newImageFiles = useMemo(
    () => draftImages.filter((image): image is AdminProductImageDraftNewItem => !image.existing),
    [draftImages],
  );

  const newImageFilesTotalSize = useMemo(
    () => getTotalFileSize(newImageFiles.map((image) => image.file)),
    [newImageFiles],
  );

  const exceedsTotalUploadLimit = newImageFilesTotalSize > MAX_PRODUCT_IMAGE_UPLOAD_TOTAL_BYTES;

  const savedSignature = useMemo(() => buildDraftImagesSignature(savedDraftImages), [savedDraftImages]);

  const draftSignature = useMemo(() => buildDraftImagesSignature(draftImages), [draftImages]);
  const hasUnsavedChanges = draftSignature !== savedSignature;
  const canSave = hasUnsavedChanges && !isSaving && draftImages.length > 0 && !exceedsTotalUploadLimit;

  useEffect(() => {
    if (exceedsTotalUploadLimit) {
      setSelectionMessage(TOTAL_UPLOAD_LIMIT_MESSAGE);
      return;
    }

    setSelectionMessage((current) => (current === TOTAL_UPLOAD_LIMIT_MESSAGE ? null : current));
  }, [exceedsTotalUploadLimit]);

  const openEditor = (image: AdminProductImageDraftItem) => {
    setSelectedImageId(image.id);
    setEditorAlt(image.alt);
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
  };

  const addFiles = (selection: PendingUploadSelection) => {
    const incomingFiles = Array.from(selection.files);

    if (incomingFiles.length === 0) {
      return;
    }

    const incomingTotalSize = getTotalFileSize(incomingFiles);

    if (incomingTotalSize > MAX_PRODUCT_IMAGE_UPLOAD_TOTAL_BYTES) {
      setSelectionMessage(TOTAL_UPLOAD_LIMIT_MESSAGE);
      return;
    }

    const accepted: AdminProductImageDraftNewItem[] = [];
    const rejected: string[] = [];

    for (const [index, file] of incomingFiles.entries()) {
      const position = index + 1;

      if (file.size <= 0) {
        rejected.push(`Archivo ${position}: el archivo no puede estar vacio.`);
        continue;
      }

      if (file.size > MAX_PRODUCT_IMAGE_UPLOAD_BYTES) {
        rejected.push("Cada imagen puede pesar hasta 10 MB.");
        continue;
      }

      if (isHeicLikeFile(file)) {
        rejected.push(`${file.name || `Archivo ${position}`} no es compatible. UsÃ¡ JPG, PNG o WebP.`);
        continue;
      }

      if (!isAllowedProductImageMimeType(file.type)) {
        rejected.push(`Archivo ${position}: solo se aceptan JPG, PNG o WebP.`);
        continue;
      }

      const previewUrl = window.URL.createObjectURL(file);
      const temporaryId = crypto.randomUUID();
      const fileSignature = buildFileSignature(file);
      objectUrlsRef.current.add(previewUrl);

      accepted.push({
        id: `new:${temporaryId}`,
        existing: false,
        temporaryId,
        fileSignature,
        file,
        previewUrl,
        alt: "",
      });
    }

    if (accepted.length > 0) {
      setDraftImages((current) => [...current, ...accepted]);
      if (!selectedImageId) {
        setSelectedImageId(accepted[0]?.id ?? null);
      }
    }

    if (rejected.length > 0) {
      setSelectionMessage(rejected.join(" "));
    } else {
      setSelectionMessage(null);
    }
  };

  const handleFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
    addFiles({ files: event.target.files ?? [] });
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDropActive(false);
    addFiles({ files: event.dataTransfer.files });
  };

  const handleCancelChanges = async () => {
    const currentDraftImages = draftImagesRef.current;
    const cachedAssetsToCleanup = currentDraftImages
      .filter((image): image is AdminProductImageDraftNewItem => !image.existing)
      .flatMap((image) => {
        const cachedAsset = uploadedAssetCacheRef.current.get(image.temporaryId);
        return cachedAsset ? [cachedAsset] : [];
      });

    await cleanupUploadedAssets(cachedAssetsToCleanup);

    for (const image of currentDraftImages) {
      if (!image.existing) {
        window.URL.revokeObjectURL(image.previewUrl);
        objectUrlsRef.current.delete(image.previewUrl);
      }
    }

    const nextDraft = cloneDraftImages(savedDraftImages);
    setDraftImages(nextDraft);
    setSelectedImageId(nextDraft[0]?.id ?? null);
    setEditorOpen(false);
    setEditorAlt("");
    setSelectionMessage(null);
  };

  const handleReorder = (orderedIds: string[]) => {
    setDraftImages((current) => reorderDraftImages(current, orderedIds));
  };

  const handleMakePrimary = () => {
    if (!selectedImage) {
      return;
    }

    setDraftImages((current) => {
      const next = [selectedImage, ...current.filter((image) => image.id !== selectedImage.id)];
      return next;
    });
    setSelectedImageId(selectedImage.id);
  };

  const handleSaveAlt = () => {
    if (!selectedImage) {
      return;
    }

    const nextAlt = editorAlt.trim();

    setDraftImages((current) =>
      current.map((image) =>
        image.id === selectedImage.id
          ? {
              ...image,
              alt: nextAlt,
            }
          : image,
      ),
    );
    setEditorOpen(false);
  };

  const stopPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
  };

  const stopMouseDown = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
  };

  const handleRemoveImage = (imageId: string) => {
    const image = draftImagesRef.current.find((item) => item.id === imageId);

    if (!image) {
      return;
    }

    if (draftImagesRef.current.length <= 1) {
      setSelectionMessage("El producto no puede quedar sin imágenes.");
      return;
    }

    if (!window.confirm("¿Eliminar esta imagen del producto?")) {
      return;
    }

    if (!image.existing) {
      window.URL.revokeObjectURL(image.previewUrl);
      objectUrlsRef.current.delete(image.previewUrl);
      const cachedAsset = uploadedAssetCacheRef.current.get(image.temporaryId);

      if (cachedAsset) {
        void cleanupUploadedAssets([cachedAsset]);
      }
    }

    setDraftImages((current) => {
      const next = current.filter((item) => item.id !== imageId);
      if (selectedImageId === imageId) {
        setSelectedImageId(next[0]?.id ?? null);
      }
      return next;
    });

    if (selectedImageId === imageId) {
      setEditorOpen(false);
    }
  };

  async function cleanupUploadedAssets(uploadedAssets: UploadedDraftAsset[]) {
    if (uploadedAssets.length === 0) {
      return;
    }

    try {
      const cleanupResult = await cleanupProductImageAssetsAction(uploadedAssets.map((asset) => asset.assetRef));
      const deletedAssetRefs = new Set(cleanupResult.deletedAssetRefs);

      for (const asset of uploadedAssets) {
        if (deletedAssetRefs.has(asset.assetRef)) {
          uploadedAssetCacheRef.current.delete(asset.temporaryId);
        }
      }
    } catch (error) {
      logger.error("admin.products.images.client_cleanup_failed", {
        productId: product.id,
        assetRefs: uploadedAssets.map((asset) => asset.assetRef),
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function uploadDraftImage(
    image: AdminProductImageDraftNewItem,
    index: number,
    total: number,
  ): Promise<{ asset: UploadedDraftAsset; createdInThisRun: boolean }> {
    const cachedAsset = uploadedAssetCacheRef.current.get(image.temporaryId);

    if (cachedAsset?.originalFileSignature === image.fileSignature) {
      return {
        asset: cachedAsset,
        createdInThisRun: false,
      };
    }

    if (isHeicLikeFile(image.file)) {
      throw new Error(`${image.file.name || "La imagen"} no es compatible. Usa JPG, PNG o WebP.`);
    }

    setSaveProgressMessage(`Subiendo imagen ${index + 1} de ${total}...`);

    let uploadFile: ImageOptimizationResult;

    try {
      uploadFile = await optimizeImageForSafeUpload(image.file);
    } catch (error) {
      const code = error instanceof Error ? error.message : "OPTIMIZATION_FAILED";

      if (code === "FILE_TOO_LARGE") {
        throw new Error(
          `${image.file.name || "La imagen"} supera el limite seguro por request y no pudimos reducirla lo suficiente.`,
        );
      }

      throw new Error(`No pudimos optimizar ${image.file.name || "una imagen"} antes de subirla.`);
    }

    const formData = new FormData();
    formData.set("productId", product.id);
    formData.set("temporaryId", image.temporaryId);
    formData.set("fileSignature", uploadFile.fileSignature);
    formData.set("file", uploadFile.file, uploadFile.file.name);

    let uploadResult: Awaited<ReturnType<typeof uploadProductImageAssetAction>>;

    try {
      uploadResult = await uploadProductImageAssetAction(formData);
    } catch {
      throw new Error("No pudimos conectar para subir una de las imagenes. Revisá la conexión e intentá de nuevo.");
    }

    if (uploadResult.status !== "success") {
      throw new Error(uploadResult.message);
    }

    if (uploadResult.temporaryId !== image.temporaryId || uploadResult.fileSignature !== uploadFile.fileSignature) {
      throw new Error("Una imagen no coincide con el archivo que se intentó subir.");
    }

    const uploadedAsset: UploadedDraftAsset = {
      temporaryId: image.temporaryId,
      assetRef: uploadResult.assetRef,
      originalFileSignature: image.fileSignature,
      uploadFileSignature: uploadResult.fileSignature,
    };

    logger.debug("admin.products.images.client_single_upload_result", {
      productId: product.id,
      temporaryId: image.temporaryId,
      assetRef: uploadResult.assetRef,
      originalFileSize: image.file.size,
      uploadedFileSize: uploadResult.fileSize,
      optimized: uploadFile.optimized,
    });

    uploadedAssetCacheRef.current.set(image.temporaryId, uploadedAsset);

    return {
      asset: uploadedAsset,
      createdInThisRun: true,
    };
  }

  const handleSaveChanges = async () => {
    if (!canSave) {
      if (exceedsTotalUploadLimit) {
        setSubmitState({
          status: "error",
          message: TOTAL_UPLOAD_LIMIT_MESSAGE,
        });
      }

      return;
    }

    const currentDraftImages = draftImagesRef.current;
    const currentSelectedImageId = selectedImageId;
    const currentNewFiles = currentDraftImages.filter(
      (image): image is AdminProductImageDraftNewItem => !image.existing,
    );
    const currentNewFilesTotalSize = getTotalFileSize(currentNewFiles.map((image) => image.file));

    if (currentNewFilesTotalSize > MAX_PRODUCT_IMAGE_UPLOAD_TOTAL_BYTES) {
      setSelectionMessage(TOTAL_UPLOAD_LIMIT_MESSAGE);
      setSubmitState({
        status: "error",
        message: TOTAL_UPLOAD_LIMIT_MESSAGE,
      });
      return;
    }

    setSubmitState(INITIAL_STATE);
    setSaveProgressMessage(null);
    setIsSaving(true);

    const uploadedAssets = new Map<string, UploadedDraftAsset>();
    const uploadedAssetsThisRun: UploadedDraftAsset[] = [];

    try {
      for (const [index, image] of currentNewFiles.entries()) {
        const uploadResult = await uploadDraftImage(image, index, currentNewFiles.length);
        uploadedAssets.set(image.temporaryId, uploadResult.asset);

        if (uploadResult.createdInThisRun) {
          uploadedAssetsThisRun.push(uploadResult.asset);
        }
      }

      const formData = new FormData();
      formData.set("productId", product.id);
      formData.set("rev", currentRev);
      formData.set(
        "draftImagesJson",
        JSON.stringify(currentDraftImages.map((image) => buildSubmitItem(image, uploadedAssets))),
      );

      setSaveProgressMessage("Guardando galerÃ­a...");
      const nextState = await commitProductImagesAction(INITIAL_STATE, formData);
      setSubmitState(nextState);

      if (nextState.status === "success") {
        const committedImages = buildCommittedDraftImages(currentDraftImages, nextState.images);
        const selectedIndex = currentSelectedImageId
          ? currentDraftImages.findIndex((image) => image.id === currentSelectedImageId)
          : -1;
        const nextSelectedId = committedImages[selectedIndex]?.id ?? committedImages[0]?.id ?? null;

        logger.debug("admin.products.revision.action_result", {
          source: "images",
          returnedRev: nextState.rev,
          updatedAt: nextState.updatedAt,
        });
        logger.debug("admin.products.revision.apply_commit", {
          source: "images",
          providerRevBefore: currentRev,
          incomingRev: nextState.rev,
        });

        applyCommit({
          source: "images",
          rev: nextState.rev,
          updatedAt: nextState.updatedAt,
        });
        setSavedDraftImages(committedImages);
        setDraftImages(committedImages);
        setSelectedImageId(nextSelectedId);
        setEditorOpen(false);
        setSelectionMessage(null);
        uploadedAssetCacheRef.current.clear();
      } else {
        await cleanupUploadedAssets(uploadedAssetsThisRun);
      }
    } catch (error) {
      await cleanupUploadedAssets(uploadedAssetsThisRun);
      setSubmitState({
        status: "error",
        message: error instanceof Error ? error.message : "No pudimos guardar los cambios de imagen. Intentalo de nuevo.",
      });
      console.error("admin.products.images.submit_failed", error);
    } finally {
      setSaveProgressMessage(null);
      setIsSaving(false);
    }
  };

  const galleryCount = draftImages.length;
  const dirtyLabel = hasUnsavedChanges ? "Cambios sin guardar" : "Sin cambios";
  const statusBoxClass =
    submitState.status === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : submitState.status === "partial"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : submitState.status === "conflict"
          ? "border-amber-200 bg-amber-50 text-amber-900"
          : "border-rose-200 bg-rose-50 text-rose-900";

  return (
    <section className={`${dashboardUi.card} overflow-hidden`}>
      <div className={`${dashboardUi.cardHeader} border-b border-slate-200/60`}>
        <div className="min-w-0">
          <h2 className={dashboardUi.sectionTitle}>Imágenes</h2>
          <p className={dashboardUi.sectionDescription}>Arrastrá imágenes o hacé clic para seleccionarlas.</p>
        </div>
      </div>

      <div className={dashboardUi.cardBody}>
        {submitState.status !== "idle" ? (
          <div aria-live="polite" className={cn("mb-4 rounded-[18px] border px-4 py-3 text-sm", statusBoxClass)}>
            {submitState.message}
          </div>
        ) : null}

        {saveProgressMessage ? (
          <div
            aria-live="polite"
            className="mb-4 rounded-[18px] border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-950"
          >
            {saveProgressMessage}
          </div>
        ) : null}

        <div
          onDrop={handleDrop}
          onDragLeave={() => setDropActive(false)}
          onDragOver={(event) => {
            event.preventDefault();
            setDropActive(true);
          }}
          onClick={() => newFilesInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              newFilesInputRef.current?.click();
            }
          }}
          className={cn(
            "grid cursor-pointer gap-4 rounded-[24px] border border-dashed p-4 transition",
            dropActive
              ? "border-[#314158] bg-slate-50"
              : "border-slate-300 bg-slate-50/80 hover:border-slate-400",
          )}
        >
          <div className="grid gap-2 text-center">
            <p className="text-sm font-semibold text-slate-900">Arrastrá imágenes o hacé clic para seleccionarlas.</p>
            <p className="text-xs text-slate-500">
              JPG, PNG o WebP · Máx. {formatUploadLimit(MAX_PRODUCT_IMAGE_UPLOAD_BYTES)} c/u
            </p>
            <p className="text-xs text-slate-500">
              Tamaño total máximo por guardado: {formatUploadLimit(MAX_PRODUCT_IMAGE_UPLOAD_TOTAL_BYTES)}.
            </p>
          </div>

          <input
            ref={newFilesInputRef}
            type="file"
            accept={ALLOWED_IMAGE_MIME_TYPES.join(",")}
            multiple
            className="hidden"
            onChange={handleFilesChange}
          />
        </div>

        {selectionMessage ? <p className="mt-3 text-xs text-amber-800">{selectionMessage}</p> : null}

        <div className="mt-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">Galería</p>
            <p className="text-xs text-slate-500">La primera imagen sigue siendo la principal.</p>
          </div>
          <span className={dashboardUi.labelPill}>{galleryCount} imágenes</span>
        </div>

        <div className="mt-3 overflow-x-auto pb-2">
          {galleryCount > 0 ? (
            <Reorder.Group
              axis="x"
              values={draftImages.map((image) => image.id)}
              onReorder={handleReorder}
              className="flex min-w-max gap-4"
            >
              {draftImages.map((image, index) => {
                const isPrimary = index === 0;
                const imageSource = "imageUrl" in image ? image.imageUrl : null;

                return (
                  <Reorder.Item
                    key={image.id}
                    value={image.id}
                    className="group relative h-36 w-36 shrink-0 flex-none overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_8px_18px_rgba(15,23,42,0.03)] transition-shadow"
                    style={{ touchAction: "pan-y" }}
                    whileDrag={{ scale: 1.03, zIndex: 20 }}
                  >
                    <div className="relative h-full w-full cursor-grab active:cursor-grabbing select-none">
                      {imageSource ? (
                        <Image
                          src={imageSource}
                          alt={image.alt || product.title}
                          fill
                          unoptimized={Boolean(image.previewUrl)}
                          sizes="144px"
                          draggable={false}
                          onDragStart={(event) => event.preventDefault()}
                          className="pointer-events-none select-none object-cover"
                        />
                      ) : !image.existing ? (
                        <Image
                          src={image.previewUrl}
                          alt={image.alt || product.title}
                          fill
                          unoptimized
                          sizes="144px"
                          draggable={false}
                          onDragStart={(event) => event.preventDefault()}
                          className="pointer-events-none select-none object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-200 to-slate-100 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Sin imagen
                        </div>
                      )}

                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent" />

                      <button
                        type="button"
                        aria-label="Eliminar imagen"
                        onPointerDown={stopPointerDown}
                        onMouseDown={stopMouseDown}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleRemoveImage(image.id);
                        }}
                        className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/80 bg-white/90 text-slate-700 shadow-[0_4px_10px_rgba(15,23,42,0.18)] transition hover:bg-white hover:text-rose-700 sm:opacity-0 sm:group-hover:opacity-100"
                      >
                        <TrashIcon />
                      </button>

                      {isPrimary ? (
                        <span className="absolute left-2 top-2 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-emerald-900 shadow-[0_4px_10px_rgba(15,23,42,0.12)]">
                          Principal
                        </span>
                      ) : null}

                      {!image.existing ? (
                        <span className="absolute left-2 bottom-2 rounded-full border border-white/70 bg-white/90 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-700 shadow-[0_4px_10px_rgba(15,23,42,0.12)]">
                          Nueva
                        </span>
                      ) : null}

                      <button
                        type="button"
                        onPointerDown={stopPointerDown}
                        onMouseDown={stopMouseDown}
                        onClick={(event) => {
                          event.stopPropagation();
                          openEditor(image);
                        }}
                        className="absolute bottom-2 right-2 rounded-full border border-white/70 bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-slate-700 shadow-[0_4px_10px_rgba(15,23,42,0.12)] transition hover:bg-white sm:opacity-0 sm:group-hover:opacity-100"
                      >
                        Editar
                      </button>
                    </div>
                  </Reorder.Item>
                );
              })}
            </Reorder.Group>
          ) : (
            <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600">
              Este producto todavía no tiene imágenes.
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
          <div className="grid gap-1">
            <p className="text-sm font-semibold text-slate-900">{dirtyLabel}</p>
            <p className="text-xs text-slate-500">Guardá los cambios para actualizar la galería.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCancelChanges}
              disabled={!hasUnsavedChanges || isSaving}
              className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancelar cambios
            </button>
            <button
              type="button"
              onClick={handleSaveChanges}
              disabled={!canSave}
              className={cn(
                "rounded-full border px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300",
                dashboardUi.primaryAction,
              )}
            >
              {isSaving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>

        {editorOpen && selectedImage ? (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#243247]/55 p-3 sm:items-center sm:p-6">
            <div className="w-full max-w-4xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
              <div className="grid gap-0 md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
                <div className="relative min-h-[18rem] bg-slate-100">
                  {(() => {
                    const selectedImageSource =
                      "imageUrl" in selectedImage ? selectedImage.imageUrl : null;

                    return selectedImageSource ? (
                    <Image
                      src={selectedImageSource}
                      alt={selectedImage.alt || product.title}
                      fill
                      unoptimized={Boolean(selectedImage.previewUrl)}
                      sizes="(max-width: 768px) 100vw, 55vw"
                      className="object-cover"
                    />
                    ) : selectedImage.existing ? (
                    <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-200 to-slate-100 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Sin vista previa
                    </div>
                    ) : (
                    <Image
                      src={selectedImage.previewUrl}
                      alt={selectedImage.alt || selectedImage.file.name}
                      fill
                      unoptimized
                      sizes="(max-width: 768px) 100vw, 55vw"
                      className="object-cover"
                    />
                    );
                  })()}
                </div>

                <div className="flex flex-col gap-5 px-5 py-5 sm:px-6 sm:py-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className={dashboardUi.mutedLabel}>Editar imagen</p>
                      <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-slate-950">
                        Imagen {draftImages.findIndex((image) => image.id === selectedImage.id) + 1}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {draftImages.findIndex((image) => image.id === selectedImage.id) === 0
                          ? "Principal"
                          : "No principal"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={closeEditor}
                      className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                      Cerrar
                    </button>
                  </div>

                  <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    <p className="font-medium text-slate-900">Alt actual</p>
                    <p className="mt-1 break-words">{selectedImage.alt || "Sin texto alternativo"}</p>
                  </div>

                  <label className="grid gap-2 text-sm font-medium text-slate-700">
                    <span>Texto alternativo</span>
                    <input
                      type="text"
                      value={editorAlt}
                      onChange={(event) => setEditorAlt(event.target.value)}
                      maxLength={200}
                      className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                      placeholder="Ej: Vista frontal del producto"
                    />
                  </label>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleSaveAlt}
                      className={cn(
                        "rounded-full border px-4 py-2.5 text-sm font-semibold",
                        dashboardUi.primaryAction,
                      )}
                    >
                      Guardar
                    </button>
                    {!selectedImageId || draftImages[0]?.id === selectedImageId ? null : (
                      <button
                        type="button"
                        onClick={handleMakePrimary}
                        className="rounded-full border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-900 transition hover:bg-sky-100"
                      >
                        Hacer principal
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(selectedImage.id)}
                      disabled={draftImages.length <= 1}
                      className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-900 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Eliminar imagen
                    </button>
                  </div>

                  {draftImages.length <= 1 ? (
                    <p className="text-xs text-slate-500">No se puede eliminar la última imagen del producto.</p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
