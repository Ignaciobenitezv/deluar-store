"use client";

import Image from "next/image";
import { Reorder } from "framer-motion";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { dashboardUi } from "@/features/admin/dashboard/lib/dashboard-ui";
import { cn } from "@/lib/utils";
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_PRODUCT_IMAGE_UPLOAD_BYTES,
  MAX_PRODUCT_IMAGE_UPLOAD_TOTAL_BYTES,
  isAllowedProductImageMimeType,
} from "../lib/product-image-constraints";
import type {
  AdminProductImageDraftItem,
  AdminProductImageDraftNewItem,
} from "../types";

type VariantImagesEditorProps = {
  productTitle: string;
  initialImages: AdminProductImageDraftItem[];
  fieldName?: string;
  onCanSaveChange?: (canSave: boolean) => void;
};

export type AdminProductVariantImagesEditorHandle = {
  getDraftImages: () => AdminProductImageDraftItem[];
};

const TOTAL_UPLOAD_LIMIT_MESSAGE =
  "Las imágenes seleccionadas superan el tamaño máximo permitido. Subí menos imágenes por vez.";

function formatUploadLimit(bytes: number) {
  const megabytes = bytes / (1024 * 1024);
  return `${megabytes.toFixed(megabytes % 1 === 0 ? 0 : 1)} MB`;
}

function buildFileSignature(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}:${file.type}`;
}

function getTotalFileSize(files: Array<{ size: number }>) {
  return files.reduce((total, file) => total + file.size, 0);
}

function buildSubmitItem(image: AdminProductImageDraftItem) {
  if (image.existing) {
    return {
      existing: true as const,
      key: image.key,
      assetRef: image.assetRef,
      alt: image.alt.trim(),
    };
  }

  return {
    existing: false as const,
    temporaryId: image.temporaryId,
    fileSignature: image.fileSignature,
    alt: image.alt.trim(),
  };
}

function buildInitialDraftImages(images: AdminProductImageDraftItem[]): AdminProductImageDraftItem[] {
  return images.map((image) => ({ ...image }));
}

function cloneDraftImages(images: AdminProductImageDraftItem[]) {
  return images.map((image) => ({ ...image }));
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

function ChevronUpIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="m5 11 5-5 5 5" />
    </svg>
  );
}

export const AdminProductVariantImagesEditor = forwardRef<AdminProductVariantImagesEditorHandle, VariantImagesEditorProps>(function AdminProductVariantImagesEditor({
  productTitle,
  initialImages,
  fieldName = "variantImagesJson",
  onCanSaveChange,
}: VariantImagesEditorProps,
  ref,
) {
  const [draftImages, setDraftImages] = useState<AdminProductImageDraftItem[]>(() =>
    cloneDraftImages(buildInitialDraftImages(initialImages)),
  );
  const [selectionMessage, setSelectionMessage] = useState<string | null>(null);
  const [dropActive, setDropActive] = useState(false);
  const objectUrlsRef = useRef(new Set<string>());
  const draftImagesRef = useRef<AdminProductImageDraftItem[]>(draftImages);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    draftImagesRef.current = draftImages;
  }, [draftImages]);

  useEffect(() => {
    const objectUrls = objectUrlsRef.current;

    return () => {
      for (const url of objectUrls) {
        window.URL.revokeObjectURL(url);
      }
      objectUrls.clear();
    };
  }, []);

  const newImageFiles = useMemo(
    () => draftImages.filter((image): image is AdminProductImageDraftNewItem => !image.existing),
    [draftImages],
  );

  const newImageFilesTotalSize = useMemo(
    () => getTotalFileSize(newImageFiles.map((image) => image.file)),
    [newImageFiles],
  );

  const exceedsTotalUploadLimit = newImageFilesTotalSize > MAX_PRODUCT_IMAGE_UPLOAD_TOTAL_BYTES;

  useEffect(() => {
    onCanSaveChange?.(!exceedsTotalUploadLimit);
  }, [exceedsTotalUploadLimit, onCanSaveChange]);

  const displaySelectionMessage = exceedsTotalUploadLimit ? TOTAL_UPLOAD_LIMIT_MESSAGE : selectionMessage;

  useImperativeHandle(
    ref,
    () => ({
      getDraftImages: () => cloneDraftImages(draftImages),
    }),
    [draftImages],
  );

  const addFiles = (selection: { files: FileList | File[] }) => {
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

  const handleRemoveImage = (imageId: string) => {
    const currentImages = draftImagesRef.current;
    const image = currentImages.find((item) => item.id === imageId);
    const nextImages = currentImages.filter((item) => item.id !== imageId);

    if (image && !image.existing) {
      window.URL.revokeObjectURL(image.previewUrl);
      objectUrlsRef.current.delete(image.previewUrl);
    }

    setDraftImages(nextImages);

    const nextNewImageTotalSize = getTotalFileSize(
      nextImages.filter((item): item is AdminProductImageDraftNewItem => !item.existing).map((item) => item.file),
    );

    if (nextNewImageTotalSize <= MAX_PRODUCT_IMAGE_UPLOAD_TOTAL_BYTES) {
      setSelectionMessage((current) => (current === TOTAL_UPLOAD_LIMIT_MESSAGE ? null : current));
    }
  };

  const handleMakePrimary = (imageId: string) => {
    setDraftImages((current) => {
      const currentImage = current.find((item) => item.id === imageId);

      if (!currentImage) {
        return current;
      }

      return [currentImage, ...current.filter((item) => item.id !== imageId)];
    });
  };

  const galleryCount = draftImages.length;
  const dirtyLabel = galleryCount > 0 ? "Imágenes cargadas" : "Sin imágenes propias";
  const canSave = !exceedsTotalUploadLimit;

  return (
    <div className="grid gap-4 rounded-[22px] border border-slate-200 bg-slate-50 p-4">
      <div className="grid gap-2">
        <p className="text-sm font-medium text-slate-700">Imágenes de la variante</p>
        <p className="text-xs text-slate-500">
          Arrastrá imágenes o hacé clic para seleccionarlas. Si no cargás imágenes, la variante usará las del producto.
        </p>
      </div>

      <input type="hidden" name={fieldName} value={JSON.stringify(draftImages.map(buildSubmitItem))} />

      <div
        onDrop={handleDrop}
        onDragLeave={() => setDropActive(false)}
        onDragOver={(event) => {
          event.preventDefault();
          setDropActive(true);
        }}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        className={cn(
          "grid cursor-pointer gap-3 rounded-[20px] border border-dashed p-4 transition",
          dropActive
            ? "border-[#314158] bg-slate-50"
            : "border-slate-300 bg-slate-50/80 hover:border-slate-400",
        )}
      >
        <div className="grid gap-1 text-center">
          <p className="text-sm font-semibold text-slate-900">Arrastrá imágenes o hacé clic para seleccionarlas.</p>
          <p className="text-xs text-slate-500">
            JPG, PNG o WebP · Máx. {formatUploadLimit(MAX_PRODUCT_IMAGE_UPLOAD_BYTES)} c/u
          </p>
          <p className="text-xs text-slate-500">
            Tamaño total máximo por guardado: {formatUploadLimit(MAX_PRODUCT_IMAGE_UPLOAD_TOTAL_BYTES)}.
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_IMAGE_MIME_TYPES.join(",")}
          multiple
          className="hidden"
          onChange={handleFilesChange}
        />
      </div>

      {displaySelectionMessage ? <p className="text-xs text-amber-800">{displaySelectionMessage}</p> : null}

      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{dirtyLabel}</p>
          <p className="text-xs text-slate-500">La primera imagen es la principal.</p>
        </div>
        <span className={dashboardUi.labelPill}>{galleryCount} imágenes</span>
      </div>

      <div className="overflow-x-auto pb-2">
        {galleryCount > 0 ? (
          <Reorder.Group
            axis="x"
            values={draftImages.map((image) => image.id)}
            onReorder={(orderedIds) => setDraftImages((current) => reorderDraftImages(current, orderedIds))}
            className="flex min-w-max gap-3"
          >
            {draftImages.map((image, index) => {
              const isPrimary = index === 0;
              const previewUrl = image.existing ? image.imageUrl : image.previewUrl;

              return (
                <Reorder.Item
                  key={image.id}
                  value={image.id}
                  className="group relative h-32 w-32 shrink-0 flex-none overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_8px_18px_rgba(15,23,42,0.03)]"
                  style={{ touchAction: "pan-y" }}
                  whileDrag={{ scale: 1.03, zIndex: 20 }}
                >
                  <div className="relative h-full w-full cursor-grab active:cursor-grabbing select-none">
                    {previewUrl ? (
                      <Image
                        src={previewUrl}
                        alt={image.alt || productTitle}
                        fill
                        unoptimized={Boolean(!image.existing)}
                        sizes="128px"
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

                    {!isPrimary ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleMakePrimary(image.id);
                        }}
                        className="absolute left-2 bottom-2 inline-flex items-center gap-1 rounded-full border border-white/70 bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-slate-700 shadow-[0_4px_10px_rgba(15,23,42,0.12)] transition hover:bg-white"
                      >
                        <ChevronUpIcon />
                        Principal
                      </button>
                    ) : null}
                  </div>
                </Reorder.Item>
              );
            })}
          </Reorder.Group>
        ) : (
          <div className="rounded-[18px] border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-600">
            Sin imágenes propias. Se usarán las imágenes del producto.
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 rounded-[18px] border border-slate-200 bg-white px-4 py-3">
        <p className="text-xs text-slate-500">Guardá los cambios para actualizar la variante.</p>
        <span className={cn(dashboardUi.labelPill, canSave ? "" : "opacity-60")}>{galleryCount} imágenes</span>
      </div>
    </div>
  );
});
