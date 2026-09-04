"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useActionState, useLayoutEffect, useRef, useState, useTransition, type ChangeEvent, type FormEvent } from "react";
import { updateProductVariantsAction } from "../actions/update-product-variants-action";
import { dashboardUi } from "@/features/admin/dashboard/lib/dashboard-ui";
import { getSanityImageUrl } from "@/integrations/sanity/image";
import {
  createProductLogisticsDraft,
  formatProductLogisticsSummary,
} from "@/features/catalog/logistics";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import type { AdminProductDetailData, AdminProductVariantActionState } from "../types";
import type { AdminProductImageDraftItem } from "../types";
import {
  AdminProductVariantImagesEditor,
  type AdminProductVariantImagesEditorHandle,
} from "./admin-product-variant-images-editor";
import {
  ADMIN_PRODUCT_VARIANT_ATTRIBUTE_NAMES,
  type AdminProductVariantAttribute,
  type AdminProductVariantData,
} from "../lib/variant-editor";
import { useAdminProductRevision } from "../context/admin-product-revision-context";

const INITIAL_STATE: AdminProductVariantActionState = {
  status: "idle",
};

type VariantDraft = {
  variantKey: string;
  title: string;
  value: string;
  sku: string;
  basePrice: string;
  stock: string;
  isActive: boolean;
  logisticsMode: "inherit" | "custom";
  weightGrams: string;
  heightCm: string;
  widthCm: string;
  depthCm: string;
  attributes: AdminProductVariantAttribute[];
};

type FirstVariantChoice = "preserve-original" | "variants-only";

const HISTORICAL_VARIANT_DELETE_MESSAGE =
  "Esta variante ya tiene historial y no puede eliminarse. Podés desactivarla.";

type AdminProductVariantsSectionProps = {
  product: AdminProductDetailData;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

function getFieldError(
  state: AdminProductVariantActionState,
  field:
    | "productId"
    | "rev"
    | "operation"
    | "variantKey"
    | "title"
    | "value"
    | "sku"
    | "basePrice"
    | "stock"
    | "isActive"
    | "logisticsMode"
    | "weightGrams"
    | "heightCm"
    | "widthCm"
    | "depthCm"
    | "variantImagesJson"
    | "attributesJson",
) {
  if (!("fieldErrors" in state) || !state.fieldErrors) {
    return null;
  }

  return state.fieldErrors[field]?.[0] ?? null;
}

function createEmptyDraft(): VariantDraft {
  return {
    variantKey: "",
    title: "",
    value: "",
    sku: "",
    basePrice: "",
    stock: "0",
    isActive: true,
    logisticsMode: "inherit",
    weightGrams: "",
    heightCm: "",
    widthCm: "",
    depthCm: "",
    attributes: [
      {
        name: ADMIN_PRODUCT_VARIANT_ATTRIBUTE_NAMES[0],
        value: "",
      },
    ],
  };
}

function normalizeAttributes(attributes: AdminProductVariantAttribute[]) {
  return attributes
    .map((attribute) => ({
      name: attribute.name,
      value: attribute.value.trim(),
    }))
    .filter((attribute) => attribute.value.length > 0);
}

function getVariantAttributesSummary(attributes: AdminProductVariantAttribute[]) {
  if (attributes.length === 0) {
    return "Sin atributos";
  }

  return attributes.map((attribute) => `${attribute.name}: ${attribute.value}`).join(" · ");
}

function draftFromVariant(variant: AdminProductVariantData): VariantDraft {
  const logisticsDraft = createProductLogisticsDraft(variant.logistics);

  return {
    variantKey: variant.key,
    title: variant.title,
    value: variant.value,
    sku: variant.sku,
    basePrice: typeof variant.basePrice === "number" ? String(variant.basePrice) : "",
    stock: String(variant.stock),
    isActive: variant.isActive,
    logisticsMode: variant.logistics ? "custom" : "inherit",
    weightGrams: logisticsDraft.weightGrams,
    heightCm: logisticsDraft.heightCm,
    widthCm: logisticsDraft.widthCm,
    depthCm: logisticsDraft.depthCm,
    attributes:
      variant.attributes.length > 0
        ? variant.attributes
        : [
            {
              name: ADMIN_PRODUCT_VARIANT_ATTRIBUTE_NAMES[0],
              value: "",
            },
          ],
  };
}

function buildVariantImageDrafts(images: AdminProductVariantData["images"]): AdminProductImageDraftItem[] {
  return images.flatMap((image) => {
    const assetRef = image.image.asset?._ref;
    const imageKey = image._key ?? assetRef;

    if (!assetRef || !imageKey) {
      return [];
    }

    return [
      {
        id: `existing:${imageKey}`,
        existing: true,
        key: imageKey,
        assetRef,
        imageUrl: getSanityImageUrl(image, 640, 640),
        alt: image.alt ?? "",
      } as AdminProductImageDraftItem,
    ];
  });
}

export function AdminProductVariantsSection({ product }: AdminProductVariantsSectionProps) {
  const { currentRev, applyCommit } = useAdminProductRevision();
  const [state, formAction, pending] = useActionState(updateProductVariantsAction, INITIAL_STATE);
  const formRef = useRef<HTMLFormElement>(null);
  const variantImagesEditorRef = useRef<AdminProductVariantImagesEditorHandle>(null);
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<VariantDraft>(createEmptyDraft());
  const [operation, setOperation] = useState<"upsert" | "deactivate">("upsert");
  const [firstVariantChoiceOpen, setFirstVariantChoiceOpen] = useState(false);
  const [firstVariantChoice, setFirstVariantChoice] = useState<FirstVariantChoice>("variants-only");
  const [variantImagesCanSave, setVariantImagesCanSave] = useState(true);
  const [displayedVariants, setDisplayedVariants] = useState<AdminProductVariantData[]>(() => product.variants);
  const [variantSource, setVariantSource] = useState(product.variantSource);
  const [legacyColorVariantCount, setLegacyColorVariantCount] = useState(product.legacyColorVariantCount);

  useLayoutEffect(() => {
    if (state.status !== "success") {
      return;
    }

    logger.debug("admin.products.revision.action_result", {
      source: "variants",
      returnedRev: state.rev,
      updatedAt: state.updatedAt,
    });
    logger.debug("admin.products.revision.apply_commit", {
      source: "variants",
      providerRevBefore: currentRev,
      incomingRev: state.rev,
    });

    setDisplayedVariants(state.variants);
    setVariantSource(state.variantSource);
    setLegacyColorVariantCount(state.legacyColorVariantCount);
    applyCommit({
      source: "variants",
      rev: state.rev,
      updatedAt: state.updatedAt,
    });
    setOpen(false);
  }, [applyCommit, currentRev, state]);

  const legacyMode = variantSource === "colorVariants" && legacyColorVariantCount > 0;

  const openCreateModal = () => {
    if (displayedVariants.length === 0 && variantSource === null) {
      setFirstVariantChoiceOpen(true);
      return;
    }

    setOperation("upsert");
    setDraft(createEmptyDraft());
    setVariantImagesCanSave(true);
    setOpen(true);
  };

  const startCreateVariant = (choice: FirstVariantChoice) => {
    setFirstVariantChoice(choice);
    setFirstVariantChoiceOpen(false);
    setOperation("upsert");
    setDraft(createEmptyDraft());
    setVariantImagesCanSave(true);
    setOpen(true);
  };

  const openEditModal = (variant: AdminProductVariantData) => {
    setOperation("upsert");
    setDraft(draftFromVariant(variant));
    setVariantImagesCanSave(true);
    setOpen(true);
  };

  const handleVariantSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formElement = formRef.current ?? event.currentTarget;
    const formData = new FormData(formElement);
    const draftImages = variantImagesEditorRef.current?.getDraftImages() ?? [];

    formData.set(
      "variantImagesJson",
      JSON.stringify(
        draftImages.map((image) =>
          image.existing
            ? {
                existing: true as const,
                key: image.key,
                assetRef: image.assetRef,
                alt: image.alt.trim(),
              }
            : {
                existing: false as const,
                temporaryId: image.temporaryId,
                fileSignature: image.fileSignature,
                alt: image.alt.trim(),
              },
        ),
      ),
    );

    for (const image of draftImages) {
      if (!image.existing) {
        formData.append(`file:${image.temporaryId}`, image.file, image.file.name);
      }
    }

    startTransition(() => {
      formAction(formData);
    });
  };

  const updateAttribute = (index: number, field: "name" | "value", value: string) => {
    setDraft((current) => ({
      ...current,
      attributes: current.attributes.map((attribute, attributeIndex) =>
        attributeIndex === index ? { ...attribute, [field]: value } : attribute,
      ),
    }));
  };

  const addAttribute = () => {
    setDraft((current) => ({
      ...current,
      attributes: [
        ...current.attributes,
        {
          name: ADMIN_PRODUCT_VARIANT_ATTRIBUTE_NAMES[0],
          value: "",
        },
      ],
    }));
  };

  const removeAttribute = (index: number) => {
    setDraft((current) => {
      const nextAttributes = current.attributes.filter((_, attributeIndex) => attributeIndex !== index);

      return {
        ...current,
        attributes:
          nextAttributes.length > 0
            ? nextAttributes
            : [
                {
                  name: ADMIN_PRODUCT_VARIANT_ATTRIBUTE_NAMES[0],
                  value: "",
                },
              ],
      };
    });
  };

  const setDraftField = (field: keyof Omit<VariantDraft, "attributes">, value: string | boolean) => {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const selectedVariant = draft.variantKey
    ? displayedVariants.find((variant) => variant.key === draft.variantKey) ?? null
    : null;
  const selectedVariantImages = selectedVariant ? buildVariantImageDrafts(selectedVariant.images) : [];

  return (
    <section className={`${dashboardUi.card} overflow-hidden`}>
      <div className={`${dashboardUi.cardHeader} border-b border-slate-200/60`}>
        <div className="min-w-0">
          <h2 className={dashboardUi.sectionTitle}>Variantes</h2>
          <p className={dashboardUi.sectionDescription}>Creá y editá variantes del producto.</p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className={cn("rounded-full border px-4 py-2 text-sm font-semibold", dashboardUi.primaryAction)}
        >
          Agregar variante
        </button>
      </div>

      <div className={dashboardUi.cardBody}>
        {state.status !== "idle" ? (
            <div
              aria-live="polite"
              className={cn(
                "mb-4 rounded-[18px] border px-4 py-3 text-sm",
                state.status === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : state.status === "conflict"
                    ? "border-amber-200 bg-amber-50 text-amber-900"
                    : "border-rose-200 bg-rose-50 text-rose-900",
              )}
          >
            {state.message}
          </div>
        ) : null}

        {legacyMode ? <div className="mb-4 rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Este producto tiene variantes cargadas.</div> : null}

        {displayedVariants.length > 0 ? (
          <div className="grid gap-3">
            {displayedVariants.map((variant) => (
              <div
                key={variant.key}
                className={cn(
                  "rounded-[20px] border px-4 py-4",
                  variant.isActive
                    ? "border-slate-200 bg-white"
                    : "border-slate-200 bg-slate-50 opacity-80",
                )}
              >
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start lg:gap-6">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold tracking-[-0.03em] text-slate-950">{variant.title}</h3>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                        {variant.source === "variants" ? "Actual" : "Anterior"}
                      </span>
                      <span
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]",
                          variant.isActive
                            ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                            : "border-slate-200 bg-slate-100 text-slate-600",
                        )}
                      >
                        {variant.isActive ? "Activa" : "Inactiva"}
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-slate-500">
                      Valor estable: <span className="font-medium text-slate-700">{variant.value}</span>
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      {getVariantAttributesSummary(variant.attributes)}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                        Stock: {variant.stock}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                        SKU: {variant.sku || "Sin SKU"}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                        Precio: {typeof variant.basePrice === "number" ? formatCurrency(variant.basePrice) : "Heredado"}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                        Logística:{" "}
                        {variant.logistics
                          ? formatProductLogisticsSummary(variant.logistics)
                          : product.logistics
                            ? "Usa medidas del producto"
                            : "Sin medidas"}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:justify-self-end">
                    <button
                      type="button"
                      onClick={() => openEditModal(variant)}
                      disabled={pending}
                      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Editar
                    </button>
                    <form
                      action={formAction}
                      onSubmit={(event) => {
                        if (!window.confirm(`¿Desactivar la variante "${variant.title}"? No se eliminará y seguirá disponible en órdenes históricas.`)) {
                          event.preventDefault();
                        }
                      }}
                    >
                      <input type="hidden" name="productId" value={product.id} />
                      <input type="hidden" name="rev" value={currentRev} />
                      <input type="hidden" name="operation" value="deactivate" />
                      <input type="hidden" name="variantKey" value={variant.key} />
                      <input type="hidden" name="title" value={variant.title} />
                      <input type="hidden" name="value" value={variant.value} />
                      <input type="hidden" name="sku" value={variant.sku} />
                      <input type="hidden" name="basePrice" value={variant.basePrice ?? ""} />
                      <input type="hidden" name="stock" value={variant.stock} />
                      <input type="hidden" name="isActive" value={String(variant.isActive)} />
                      <input type="hidden" name="attributesJson" value={JSON.stringify(normalizeAttributes(variant.attributes))} />
                      <button
                        type="submit"
                        disabled={pending}
                        className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Desactivar
                      </button>
                    </form>
                    <form
                      action={formAction}
                      onSubmit={(event) => {
                        if (!variant.canDelete) {
                          event.preventDefault();
                          window.alert(HISTORICAL_VARIANT_DELETE_MESSAGE);
                          return;
                        }

                        if (
                          !window.confirm(
                            `¿Eliminar esta variante "${variant.title}"?\n\nEsta acción elimina la variante del producto. No se puede deshacer.`,
                          )
                        ) {
                          event.preventDefault();
                        }
                      }}
                    >
                      <input type="hidden" name="productId" value={product.id} />
                      <input type="hidden" name="rev" value={currentRev} />
                      <input type="hidden" name="operation" value="delete" />
                      <input type="hidden" name="variantKey" value={variant.key} />
                      <input type="hidden" name="title" value={variant.title} />
                      <input type="hidden" name="value" value={variant.value} />
                      <input type="hidden" name="sku" value={variant.sku} />
                      <input type="hidden" name="basePrice" value={variant.basePrice ?? ""} />
                      <input type="hidden" name="stock" value={variant.stock} />
                      <input type="hidden" name="isActive" value={String(variant.isActive)} />
                      <input type="hidden" name="attributesJson" value={JSON.stringify(normalizeAttributes(variant.attributes))} />
                      <input type="hidden" name="variantImagesJson" value="[]" />
                      <button
                        type="submit"
                        disabled={pending}
                        title={variant.canDelete ? "Eliminar variante" : HISTORICAL_VARIANT_DELETE_MESSAGE}
                        className={cn(
                          "rounded-full border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
                          variant.canDelete
                            ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                            : "border-rose-200 bg-rose-50 text-rose-700 opacity-80 hover:bg-rose-100",
                        )}
                      >
                        Eliminar
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[20px] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600">
            Este producto todavía no tiene variantes.
          </div>
        )}
      </div>

      {firstVariantChoiceOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#243247]/45 p-3 sm:items-center sm:p-6">
          <div className="w-full max-w-xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
            <div className="px-5 py-5">
              <p className={dashboardUi.mutedLabel}>Primera variante</p>
              <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950">
                Este producto actualmente tiene precio y stock propios. ¿Querés conservarlo como una opción?
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                Si lo conservás, se creará una variante original con el precio y stock actuales. Si no, solo quedarán las nuevas variantes.
              </p>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setFirstVariantChoiceOpen(false)}
                  className="rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => startCreateVariant("variants-only")}
                  className="rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  No, usar solo las nuevas variantes
                </button>
                <button
                  type="button"
                  onClick={() => startCreateVariant("preserve-original")}
                  className={cn(
                    "rounded-full border px-4 py-3 text-sm font-semibold",
                    dashboardUi.primaryAction,
                  )}
                >
                  Sí, conservar como opción
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#243247]/45 p-3 sm:items-center sm:p-6">
          <div className="w-full max-w-3xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200/60 px-5 py-5">
              <div className="min-w-0">
                <p className={dashboardUi.mutedLabel}>
                  {operation === "deactivate" ? "Desactivar variante" : draft.variantKey ? "Editar variante" : "Nueva variante"}
                </p>
                <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950">
                  {draft.title || "Sin nombre"}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Identidad estable: <span className="font-medium">{draft.variantKey || "se generará automáticamente"}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Cerrar
              </button>
            </div>

            <form ref={formRef} onSubmit={handleVariantSubmit} className="grid gap-5 px-5 py-5 sm:grid-cols-2">
              <input type="hidden" name="productId" value={product.id} />
              <input type="hidden" name="rev" value={currentRev} />
              <input type="hidden" name="operation" value={operation} />
              <input type="hidden" name="variantKey" value={draft.variantKey} />
              <input
                type="hidden"
                name="preserveOriginalOption"
                value={firstVariantChoice === "preserve-original" ? "true" : "false"}
              />
              <input type="hidden" name="attributesJson" value={JSON.stringify(normalizeAttributes(draft.attributes))} />

              <label className="grid gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
                <span>Nombre de variante</span>
                <input
                  name="title"
                  required
                  value={draft.title}
                  onChange={(event) => setDraftField("title", event.target.value)}
                  className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                  placeholder="King Size"
                />
                {getFieldError(state, "title") ? (
                  <span className="text-xs font-normal text-rose-600">{getFieldError(state, "title")}</span>
                ) : null}
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                <span>Valor estable</span>
                <input
                  name="value"
                  required
                  value={draft.value}
                  onChange={(event) => setDraftField("value", event.target.value)}
                  className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                  placeholder="king-size"
                />
                <p className="text-xs text-slate-500">No cambia aunque edites el nombre visible.</p>
                {getFieldError(state, "value") ? (
                  <span className="text-xs font-normal text-rose-600">{getFieldError(state, "value")}</span>
                ) : null}
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                <span>SKU</span>
                <input
                  name="sku"
                  value={draft.sku}
                  onChange={(event) => setDraftField("sku", event.target.value)}
                  className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                  placeholder="ABC123"
                />
                {getFieldError(state, "sku") ? (
                  <span className="text-xs font-normal text-rose-600">{getFieldError(state, "sku")}</span>
                ) : null}
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                <span>Precio propio</span>
                <input
                  type="number"
                  name="basePrice"
                  min={0}
                  step={1}
                  value={draft.basePrice}
                  onChange={(event) => setDraftField("basePrice", event.target.value)}
                  className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                  placeholder="Opcional"
                />
                <p className="text-xs text-slate-500">Si lo dejás vacío, hereda el precio del producto.</p>
                {getFieldError(state, "basePrice") ? (
                  <span className="text-xs font-normal text-rose-600">{getFieldError(state, "basePrice")}</span>
                ) : null}
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                <span>Stock</span>
                <input
                  type="number"
                  name="stock"
                  min={0}
                  step={1}
                  value={draft.stock}
                  onChange={(event) => setDraftField("stock", event.target.value)}
                  className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                />
                {getFieldError(state, "stock") ? (
                  <span className="text-xs font-normal text-rose-600">{getFieldError(state, "stock")}</span>
                ) : null}
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                <span>Estado</span>
                <select
                  name="isActive"
                  value={draft.isActive ? "true" : "false"}
                  onChange={(event: ChangeEvent<HTMLSelectElement>) => setDraftField("isActive", event.target.value === "true")}
                  className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                >
                  <option value="true">Activa</option>
                  <option value="false">Inactiva</option>
                </select>
                {getFieldError(state, "isActive") ? (
                  <span className="text-xs font-normal text-rose-600">{getFieldError(state, "isActive")}</span>
                ) : null}
              </label>

              <div className="sm:col-span-2 grid gap-4 rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                <div>
                  <p className="text-sm font-medium text-slate-700">Logística y envío</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Podés usar las medidas del producto o cargar un override completo para esta variante.
                  </p>
                </div>

                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  <span>Medidas</span>
                  <select
                    name="logisticsMode"
                    value={draft.logisticsMode}
                    onChange={(event) => setDraftField("logisticsMode", event.target.value)}
                    className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                  >
                    <option value="inherit">Usar medidas del producto</option>
                    <option value="custom">Cargar medidas propias</option>
                  </select>
                  {getFieldError(state, "logisticsMode") ? (
                    <span className="text-xs font-normal text-rose-600">{getFieldError(state, "logisticsMode")}</span>
                  ) : null}
                </label>

                {draft.logisticsMode === "custom" ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      <span>Peso (g)</span>
                      <input
                        type="number"
                        name="weightGrams"
                        min={1}
                        step={1}
                        value={draft.weightGrams}
                        onChange={(event) => setDraftField("weightGrams", event.target.value)}
                        className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                        placeholder="Ej: 1200"
                      />
                      {getFieldError(state, "weightGrams") ? (
                        <span className="text-xs font-normal text-rose-600">{getFieldError(state, "weightGrams")}</span>
                      ) : null}
                    </label>

                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      <span>Alto (cm)</span>
                      <input
                        type="number"
                        name="heightCm"
                        min={1}
                        step={0.1}
                        value={draft.heightCm}
                        onChange={(event) => setDraftField("heightCm", event.target.value)}
                        className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                        placeholder="Ej: 20"
                      />
                      {getFieldError(state, "heightCm") ? (
                        <span className="text-xs font-normal text-rose-600">{getFieldError(state, "heightCm")}</span>
                      ) : null}
                    </label>

                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      <span>Ancho (cm)</span>
                      <input
                        type="number"
                        name="widthCm"
                        min={1}
                        step={0.1}
                        value={draft.widthCm}
                        onChange={(event) => setDraftField("widthCm", event.target.value)}
                        className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                        placeholder="Ej: 30"
                      />
                      {getFieldError(state, "widthCm") ? (
                        <span className="text-xs font-normal text-rose-600">{getFieldError(state, "widthCm")}</span>
                      ) : null}
                    </label>

                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      <span>Profundidad (cm)</span>
                      <input
                        type="number"
                        name="depthCm"
                        min={1}
                        step={0.1}
                        value={draft.depthCm}
                        onChange={(event) => setDraftField("depthCm", event.target.value)}
                        className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                        placeholder="Ej: 15"
                      />
                      {getFieldError(state, "depthCm") ? (
                        <span className="text-xs font-normal text-rose-600">{getFieldError(state, "depthCm")}</span>
                      ) : null}
                    </label>
                  </div>
                ) : (
                  <div className="rounded-[18px] border border-dashed border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                    La variante heredará el peso y las dimensiones del producto si están definidos.
                  </div>
                )}
              </div>

              <div className="sm:col-span-2">
                <AdminProductVariantImagesEditor
                  ref={variantImagesEditorRef}
                  key={(selectedVariant?.key ?? draft.variantKey) || "new"}
                  productTitle={product.title}
                  initialImages={selectedVariantImages}
                  onCanSaveChange={setVariantImagesCanSave}
                />
                {getFieldError(state, "variantImagesJson") ? (
                  <p className="mt-2 text-xs font-medium text-rose-600">{getFieldError(state, "variantImagesJson")}</p>
                ) : null}
              </div>

              <div className="sm:col-span-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-700">Atributos</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Usá solo estos nombres: Color, Tamaño, Modelo o Talle.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addAttribute}
                    className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Agregar atributo
                  </button>
                </div>

                <div className="mt-3 grid gap-3">
                  {draft.attributes.map((attribute, index) => (
                    <div key={`${index}-${attribute.name}`} className="grid gap-3 rounded-[18px] border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[minmax(10rem,0.8fr)_minmax(0,1fr)_auto] sm:items-end">
                      <label className="grid gap-2 text-sm font-medium text-slate-700">
                        <span>Nombre</span>
                        <select
                          value={attribute.name}
                          onChange={(event) => updateAttribute(index, "name", event.target.value)}
                          className="rounded-[16px] border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                        >
                          {ADMIN_PRODUCT_VARIANT_ATTRIBUTE_NAMES.map((name) => (
                            <option key={name} value={name}>
                              {name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="grid gap-2 text-sm font-medium text-slate-700">
                        <span>Valor</span>
                        <input
                          value={attribute.value}
                          onChange={(event) => updateAttribute(index, "value", event.target.value)}
                          className="rounded-[16px] border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                          placeholder="Beige"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => removeAttribute(index)}
                        className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                      >
                        Quitar
                      </button>
                    </div>
                  ))}
                </div>
                {getFieldError(state, "attributesJson") ? (
                  <p className="mt-2 text-xs font-medium text-rose-600">{getFieldError(state, "attributesJson")}</p>
                ) : null}
              </div>

              <div className="sm:col-span-2 flex flex-col-reverse gap-3 border-t border-slate-200/60 pt-4 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={pending || !variantImagesCanSave}
                  className={cn(
                    "rounded-full border px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300",
                    dashboardUi.primaryAction,
                  )}
                >
                  {pending
                    ? "Guardando..."
                    : operation === "deactivate"
                      ? "Desactivar variante"
                      : draft.variantKey
                        ? "Guardar cambios"
                        : "Agregar variante"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
