"use client";

import Image from "next/image";
import Link from "next/link";
import {
  startTransition,
  useActionState,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { updateProductDetailAction } from "../actions/update-product-detail-action";
import { AdminProductRichTextEditor } from "./admin-product-rich-text-editor";
import { AdminProductDetailUpdatedAt } from "./admin-product-updated-at";
import { dashboardUi } from "@/features/admin/dashboard/lib/dashboard-ui";
import { formatDashboardPrice } from "@/features/admin/dashboard/lib/dashboard-formatters";
import {
  createProductLogisticsDraft,
  formatProductLogisticsSummary,
} from "@/features/catalog/logistics";
import { cn } from "@/lib/utils";
import { buildAdminProductSlugFromTitle, normalizeAdminProductSlug } from "../lib/product-slug";
import { logger } from "@/lib/logger";
import { useAdminProductRevision } from "../context/admin-product-revision-context";
import type { AdminProductCategoryNode, AdminProductDetailActionState, AdminProductDetailData } from "../types";

const INITIAL_STATE: AdminProductDetailActionState = {
  status: "idle",
};

type CategoryOption = {
  id: string;
  label: string;
  slug: string;
};

type AdminProductDetailFormProps = {
  product: AdminProductDetailData;
  categoryTree: AdminProductCategoryNode[];
};

type AdminProductDetailFormFieldsProps = {
  product: AdminProductDetailData;
  categoryTree: AdminProductCategoryNode[];
  currentRev: string;
  state: AdminProductDetailActionState;
  formAction: (formData: FormData) => void;
  pending: boolean;
};

type DetailDraft = {
  title: string;
  slug: string;
  shortDescription: string;
  categoryId: string;
  subcategoryId: string;
  basePrice: string;
  transferPrice: string;
  stock: string;
  isActive: boolean;
  isFeatured: boolean;
  isOnOffer: boolean;
  showInNewIn: boolean;
  newInOrder: string;
  weightGrams: string;
  heightCm: string;
  widthCm: string;
  depthCm: string;
  seoTitle: string;
  seoDescription: string;
};

type DetailDelta = {
  changedFields: string[];
  title?: string;
  slug?: string;
  shortDescription?: string;
  descriptionJson?: string;
  categoryId?: string;
  subcategory?: { operation: "set"; value: string } | { operation: "unset" };
  basePrice?: number;
  transferPrice?: { operation: "set"; value: number } | { operation: "unset" };
  stock?: number;
  isActive?: boolean;
  isFeatured?: boolean;
  isOnOffer?: boolean;
  showInNewIn?: boolean;
  newInOrder?: { operation: "set"; value: number } | { operation: "unset" };
  seo?: { operation: "set"; title?: string; description?: string } | { operation: "unset" };
};

function findCategoryNodeById(nodes: AdminProductCategoryNode[], targetId: string): AdminProductCategoryNode | null {
  for (const node of nodes) {
    if (node._id === targetId) {
      return node;
    }

    const nested = findCategoryNodeById(node.subcategories ?? [], targetId);
    if (nested) {
      return nested;
    }
  }

  return null;
}

function flattenSubcategories(nodes: AdminProductCategoryNode[], depth = 0): CategoryOption[] {
  return nodes.flatMap((node) => [
    {
      id: node._id,
      label: `${"- ".repeat(depth)}${node.title}`,
      slug: node.slug.current,
    },
    ...flattenSubcategories(node.subcategories ?? [], depth + 1),
  ]);
}

function getFieldError(
  state: AdminProductDetailActionState,
  field:
    | "title"
    | "slug"
    | "shortDescription"
    | "description"
    | "categoryId"
    | "subcategoryId"
    | "basePrice"
    | "transferPrice"
    | "stock"
    | "isActive"
    | "isFeatured"
    | "isOnOffer"
    | "showInNewIn"
    | "newInOrder"
    | "weightGrams"
    | "heightCm"
    | "widthCm"
    | "depthCm"
    | "seoTitle"
    | "seoDescription",
) {
  if (!("fieldErrors" in state) || !state.fieldErrors) {
    return null;
  }

  return state.fieldErrors[field]?.[0] ?? null;
}

function createDetailDraft(product: AdminProductDetailData): DetailDraft {
  const logisticsDraft = createProductLogisticsDraft(product.logistics);

  return {
    title: product.title,
    slug: product.slug,
    shortDescription: product.shortDescription,
    categoryId: product.categoryId,
    subcategoryId: product.subcategoryId ?? "",
    basePrice: String(product.basePrice),
    transferPrice: typeof product.transferPrice === "number" ? String(product.transferPrice) : "",
    stock: String(product.stock),
    isActive: product.visible,
    isFeatured: product.isFeatured,
    isOnOffer: product.isOnOffer,
    showInNewIn: product.showInNewIn,
    newInOrder: typeof product.newInOrder === "number" ? String(product.newInOrder) : "",
    weightGrams: logisticsDraft.weightGrams,
    heightCm: logisticsDraft.heightCm,
    widthCm: logisticsDraft.widthCm,
    depthCm: logisticsDraft.depthCm,
    seoTitle: product.seoTitle,
    seoDescription: product.seoDescription,
  };
}

function buildDetailDelta(
  baseline: AdminProductDetailData,
  draft: DetailDraft,
  descriptionJson: string,
): DetailDelta {
  const changedFields = new Set<string>();
  const delta: DetailDelta = { changedFields: [] };

  const title = draft.title.trim();
  if (title !== baseline.title) {
    delta.title = title;
    changedFields.add("title");
  }

  const slug = normalizeAdminProductSlug(draft.slug);
  if (slug !== baseline.slug) {
    delta.slug = slug;
    changedFields.add("slug");
  }

  const shortDescription = draft.shortDescription.trim();
  if (shortDescription !== baseline.shortDescription) {
    delta.shortDescription = shortDescription;
    changedFields.add("shortDescription");
  }

  const normalizedDescriptionJson = descriptionJson.trim();
  if (normalizedDescriptionJson !== JSON.stringify(baseline.description)) {
    delta.descriptionJson = normalizedDescriptionJson;
    changedFields.add("description");
  }

  if (draft.categoryId !== baseline.categoryId) {
    delta.categoryId = draft.categoryId;
    changedFields.add("category");
  }

  if (draft.subcategoryId !== (baseline.subcategoryId ?? "")) {
    delta.subcategory = draft.subcategoryId
      ? { operation: "set", value: draft.subcategoryId }
      : { operation: "unset" };
    changedFields.add("subcategory");
  }

  const basePrice = Number(draft.basePrice);
  if (Number.isFinite(basePrice) && basePrice !== baseline.basePrice) {
    delta.basePrice = basePrice;
    changedFields.add("basePrice");
  }

  const transferPriceRaw = draft.transferPrice.trim();
  if (transferPriceRaw.length === 0) {
    if (baseline.transferPrice !== null) {
      delta.transferPrice = { operation: "unset" };
      changedFields.add("transferPrice");
    }
  } else {
    const transferPrice = Number(transferPriceRaw);
    if (Number.isFinite(transferPrice) && transferPrice !== baseline.transferPrice) {
      delta.transferPrice = { operation: "set", value: transferPrice };
      changedFields.add("transferPrice");
    }
  }

  if (!baseline.hasVariants) {
    const stock = Number(draft.stock);
    if (Number.isFinite(stock) && stock !== baseline.stock) {
      delta.stock = stock;
      changedFields.add("stock");
    }
  }

  if (draft.isActive !== baseline.visible) {
    delta.isActive = draft.isActive;
    changedFields.add("isActive");
  }

  if (draft.isFeatured !== baseline.isFeatured) {
    delta.isFeatured = draft.isFeatured;
    changedFields.add("isFeatured");
  }

  if (draft.isOnOffer !== baseline.isOnOffer) {
    delta.isOnOffer = draft.isOnOffer;
    changedFields.add("isOnOffer");
  }

  if (draft.showInNewIn !== baseline.showInNewIn) {
    delta.showInNewIn = draft.showInNewIn;
    changedFields.add("showInNewIn");
  }

  if (draft.showInNewIn) {
    const newInOrderRaw = draft.newInOrder.trim();
    if (newInOrderRaw.length === 0) {
      if (baseline.newInOrder !== null) {
        delta.newInOrder = { operation: "unset" };
        changedFields.add("newInOrder");
      }
    } else {
      const newInOrder = Number(newInOrderRaw);
      if (Number.isFinite(newInOrder) && newInOrder !== baseline.newInOrder) {
        delta.newInOrder = { operation: "set", value: newInOrder };
        changedFields.add("newInOrder");
      }
    }
  } else if (baseline.newInOrder !== null) {
    delta.newInOrder = { operation: "unset" };
    changedFields.add("newInOrder");
  }

  const baselineLogistics = createProductLogisticsDraft(baseline.logistics);
  const logisticsChanged =
    draft.weightGrams.trim() !== baselineLogistics.weightGrams ||
    draft.heightCm.trim() !== baselineLogistics.heightCm ||
    draft.widthCm.trim() !== baselineLogistics.widthCm ||
    draft.depthCm.trim() !== baselineLogistics.depthCm;

  if (logisticsChanged) {
    changedFields.add("logistics");
  }

  const seoTitle = draft.seoTitle.trim();
  const seoDescription = draft.seoDescription.trim();
  if (seoTitle !== baseline.seoTitle || seoDescription !== baseline.seoDescription) {
    if (!seoTitle && !seoDescription) {
      delta.seo = { operation: "unset" };
    } else {
      delta.seo = {
        operation: "set",
        ...(seoTitle ? { title: seoTitle } : {}),
        ...(seoDescription ? { description: seoDescription } : {}),
      };
    }
    changedFields.add("seo");
  }

  delta.changedFields = [...changedFields];
  return delta;
}

export function AdminProductDetailForm({ product, categoryTree }: AdminProductDetailFormProps) {
  const { applyCommit, currentRev } = useAdminProductRevision();
  const [state, formAction, pending] = useActionState(updateProductDetailAction, INITIAL_STATE);
  const committedRev = state.status === "success" ? state.rev : null;
  const committedUpdatedAt = state.status === "success" ? state.updatedAt : null;

  const currentProduct = state.status === "success" ? state.product : product;

  useLayoutEffect(() => {
    if (state.status !== "success") {
      return;
    }

    logger.debug("admin.products.revision.action_result", {
      source: "detail",
      returnedRev: committedRev ?? currentRev,
      updatedAt: committedUpdatedAt ?? product.updatedAt,
    });
    logger.debug("admin.products.revision.apply_commit", {
      source: "detail",
      providerRevBefore: currentRev,
      incomingRev: committedRev ?? currentRev,
    });

    applyCommit({
      source: "detail",
      rev: committedRev ?? currentRev,
      updatedAt: committedUpdatedAt ?? product.updatedAt,
    });
  }, [applyCommit, committedRev, committedUpdatedAt, currentRev, product.updatedAt, state.status]);

  return (
    <AdminProductDetailFormFields
      key={currentProduct.rev}
      product={currentProduct}
      categoryTree={categoryTree}
      currentRev={currentRev}
      state={state}
      formAction={formAction}
      pending={pending}
    />
  );
}

function AdminProductDetailFormFields({
  product,
  categoryTree,
  currentRev,
  state,
  formAction,
  pending,
}: AdminProductDetailFormFieldsProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const baselineRef = useRef(product);
  const [draft, setDraft] = useState<DetailDraft>(() => createDetailDraft(product));
  const canEditStock = !product.hasVariants;

  useEffect(() => {
    logger.debug("admin.products.detail.commercial_loaded", {
      isActive: product.visible,
      isFeatured: product.isFeatured,
      isOnOffer: product.isOnOffer,
      showInNewIn: product.showInNewIn,
      newInOrder: product.newInOrder,
      stock: product.stock,
    });
  }, [
    product.id,
    product.visible,
    product.isFeatured,
    product.isOnOffer,
    product.showInNewIn,
    product.newInOrder,
    product.stock,
  ]);

  const selectedCategoryNode = useMemo(
    () => findCategoryNodeById(categoryTree, draft.categoryId),
    [categoryTree, draft.categoryId],
  );

  const subcategoryOptions = useMemo(
    () => flattenSubcategories(selectedCategoryNode?.subcategories ?? []),
    [selectedCategoryNode],
  );

  const handleCategoryChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextCategoryId = event.target.value;
    const nextSubcategoryOptions = flattenSubcategories(
      findCategoryNodeById(categoryTree, nextCategoryId)?.subcategories ?? [],
    );

    setDraft((current) => ({
      ...current,
      categoryId: nextCategoryId,
      subcategoryId: nextSubcategoryOptions.some((option) => option.id === current.subcategoryId)
        ? current.subcategoryId
        : "",
    }));
  };

  const currentSlug = normalizeAdminProductSlug(draft.slug);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formElement = formRef.current ?? event.currentTarget;
    const formData = new FormData(formElement);
    const hiddenRev = formElement.querySelector<HTMLInputElement>('input[name="rev"]')?.value ?? null;
    const providerRev = currentRev;
    const descriptionJson = String(formData.get("descriptionJson") ?? "");
    const delta = buildDetailDelta(baselineRef.current, draft, descriptionJson);

    logger.debug("admin.products.detail.commercial_submit", {
      isActive: draft.isActive,
      isFeatured: draft.isFeatured,
      isOnOffer: draft.isOnOffer,
      showInNewIn: draft.showInNewIn,
      newInOrder: draft.newInOrder,
      stock: draft.stock,
      types: {
        isActive: typeof draft.isActive,
        isFeatured: typeof draft.isFeatured,
        isOnOffer: typeof draft.isOnOffer,
        showInNewIn: typeof draft.showInNewIn,
        newInOrder: typeof draft.newInOrder,
        stock: typeof draft.stock,
      },
    });

    logger.debug("admin.products.detail.client_submit", {
      providerRev,
      hiddenRev,
      currentProductRev: product.rev,
      productPropRev: product.rev,
      changedFields: delta.changedFields,
    });

    logger.debug("admin.products.detail.optional_fields_client", {
      snapshotSubcategory: baselineRef.current.subcategoryId ?? "",
      domSubcategory: draft.subcategoryId,
      finalSubcategory: draft.subcategoryId,
      subcategoryTouched: delta.changedFields.includes("subcategory"),
      snapshotSeoTitle: baselineRef.current.seoTitle ?? "",
      domSeoTitle: draft.seoTitle,
      finalSeoTitle: draft.seoTitle,
      seoTouched: delta.changedFields.includes("seo"),
      snapshotSeoDescription: baselineRef.current.seoDescription ?? "",
      domSeoDescription: draft.seoDescription,
      finalSeoDescription: draft.seoDescription,
    });

    if (delta.changedFields.length === 0) {
      logger.debug("admin.products.detail.noop_submit", {
        productId: product.id,
        providerRev,
      });
      return;
    }

    formData.set("deltaJson", JSON.stringify(delta));
    formData.set("rev", providerRev);

    startTransition(() => {
      formAction(formData);
    });
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.95fr)]">
      <input type="hidden" name="productId" value={product.id} />
      <input type="hidden" name="rev" value={currentRev} readOnly />

      <div className="grid gap-4">
        {state.status !== "idle" ? (
          <div
            aria-live="polite"
            className={cn(
              "rounded-[22px] border px-4 py-3 text-sm",
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

        <section className={`${dashboardUi.card} overflow-hidden`}>
          <div className={`${dashboardUi.cardHeader} border-b border-slate-200/60`}>
            <div>
              <h2 className={dashboardUi.sectionTitle}>Información</h2>
              <p className={dashboardUi.sectionDescription}>Nombre, URL, descripción corta y contenido principal.</p>
            </div>
          </div>

          <div className={dashboardUi.cardBody}>
            <div className="grid gap-4">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                <span>Nombre</span>
                <input
                  name="title"
                  required
                  value={draft.title}
                  onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                  className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                  placeholder="Ej: Manta tejida natural"
                />
                {getFieldError(state, "title") ? (
                  <span className="text-xs font-normal text-rose-600">{getFieldError(state, "title")}</span>
                ) : null}
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                <span>URL / slug</span>
                <input
                  name="slug"
                  required
                  value={draft.slug}
                  onChange={(event) => setDraft((current) => ({ ...current, slug: event.target.value }))}
                  onBlur={() =>
                    setDraft((current) => ({
                      ...current,
                      slug: buildAdminProductSlugFromTitle(current.slug),
                    }))
                  }
                  className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                  placeholder="manta-tejida-natural"
                />
                <p className="text-xs text-slate-500">Normalizado automáticamente. Vista actual: /productos/detalle/{currentSlug}</p>
                {getFieldError(state, "slug") ? (
                  <span className="text-xs font-normal text-rose-600">{getFieldError(state, "slug")}</span>
                ) : null}
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                <span>Descripción corta</span>
                <textarea
                  name="shortDescription"
                  required
                  value={draft.shortDescription}
                  onChange={(event) => setDraft((current) => ({ ...current, shortDescription: event.target.value }))}
                  rows={3}
                  className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                  placeholder="Ej: Textil decorativo para living en tono natural."
                />
                {getFieldError(state, "shortDescription") ? (
                  <span className="text-xs font-normal text-rose-600">{getFieldError(state, "shortDescription")}</span>
                ) : null}
              </label>

              <AdminProductRichTextEditor
                name="descriptionJson"
                label="Descripción completa"
                helpText="Podés escribir párrafos, negrita, cursiva, listas y enlaces."
                initialBlocks={product.description}
                error={getFieldError(state, "description")}
              />
            </div>
          </div>
        </section>

        <section className={`${dashboardUi.card} overflow-hidden`}>
          <div className={`${dashboardUi.cardHeader} border-b border-slate-200/60`}>
            <div>
              <h2 className={dashboardUi.sectionTitle}>Clasificación</h2>
              <p className={dashboardUi.sectionDescription}>Elegí una categoría y una subcategoría coherentes con el árbol.</p>
            </div>
          </div>

          <div className={dashboardUi.cardBody}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                <span>Categoría</span>
                <select
                  name="categoryId"
                  required
                  value={draft.categoryId}
                  onChange={handleCategoryChange}
                  className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                >
                  <option value="">Seleccioná una categoría</option>
                  {categoryTree.map((category) => (
                    <option key={category._id} value={category._id}>
                      {category.title}
                    </option>
                  ))}
                </select>
                {getFieldError(state, "categoryId") ? (
                  <span className="text-xs font-normal text-rose-600">{getFieldError(state, "categoryId")}</span>
                ) : null}
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                <span>Subcategoría</span>
                <select
                  name="subcategoryId"
                  value={draft.subcategoryId}
                  onChange={(event) => {
                    setDraft((current) => ({ ...current, subcategoryId: event.target.value }));
                  }}
                  disabled={!selectedCategoryNode}
                  className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">Sin subcategoría</option>
                  {subcategoryOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {getFieldError(state, "subcategoryId") ? (
                  <span className="text-xs font-normal text-rose-600">{getFieldError(state, "subcategoryId")}</span>
                ) : null}
              </label>
            </div>
          </div>
        </section>

        <section className={`${dashboardUi.card} overflow-hidden`}>
          <div className={`${dashboardUi.cardHeader} border-b border-slate-200/60`}>
            <div>
              <h2 className={dashboardUi.sectionTitle}>Precios</h2>
              <p className={dashboardUi.sectionDescription}>Precio principal y precio por transferencia.</p>
            </div>
          </div>

          <div className={dashboardUi.cardBody}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  <span>Precio</span>
                <input
                  type="number"
                  name="basePrice"
                  required
                  value={draft.basePrice}
                  onChange={(event) => setDraft((current) => ({ ...current, basePrice: event.target.value }))}
                  min={0}
                  step={1}
                  className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                />
                {getFieldError(state, "basePrice") ? (
                  <span className="text-xs font-normal text-rose-600">{getFieldError(state, "basePrice")}</span>
                ) : null}
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                <span>Precio por transferencia</span>
                <input
                  type="number"
                  name="transferPrice"
                  value={draft.transferPrice}
                  onChange={(event) => setDraft((current) => ({ ...current, transferPrice: event.target.value }))}
                  min={0}
                  step={1}
                  placeholder="Opcional"
                  className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                />
                <p className="text-xs text-slate-500">Si lo dejás vacío, se elimina ese valor.</p>
                {getFieldError(state, "transferPrice") ? (
                  <span className="text-xs font-normal text-rose-600">{getFieldError(state, "transferPrice")}</span>
                ) : null}
              </label>
            </div>
          </div>
        </section>

        <section className={`${dashboardUi.card} overflow-hidden`}>
          <div className={`${dashboardUi.cardHeader} border-b border-slate-200/60`}>
            <div>
              <h2 className={dashboardUi.sectionTitle}>Logística / envíos</h2>
              <p className={dashboardUi.sectionDescription}>
                Peso y dimensiones del producto base. Si completás una medida, completá las cuatro.
              </p>
            </div>
          </div>

          <div className={dashboardUi.cardBody}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                <span>Peso (g)</span>
                <input
                  type="number"
                  name="weightGrams"
                  min={1}
                  step={1}
                  value={draft.weightGrams}
                  onChange={(event) => setDraft((current) => ({ ...current, weightGrams: event.target.value }))}
                  placeholder="Opcional"
                  className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
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
                  onChange={(event) => setDraft((current) => ({ ...current, heightCm: event.target.value }))}
                  placeholder="Opcional"
                  className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
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
                  onChange={(event) => setDraft((current) => ({ ...current, widthCm: event.target.value }))}
                  placeholder="Opcional"
                  className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
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
                  onChange={(event) => setDraft((current) => ({ ...current, depthCm: event.target.value }))}
                  placeholder="Opcional"
                  className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                />
                {getFieldError(state, "depthCm") ? (
                  <span className="text-xs font-normal text-rose-600">{getFieldError(state, "depthCm")}</span>
                ) : null}
              </label>
            </div>
          </div>
        </section>

        <section className={`${dashboardUi.card} overflow-hidden`}>
          <div className={`${dashboardUi.cardHeader} border-b border-slate-200/60`}>
            <div>
              <h2 className={dashboardUi.sectionTitle}>SEO</h2>
              <p className={dashboardUi.sectionDescription}>Título y descripción para buscadores y vistas previas.</p>
            </div>
          </div>

          <div className={dashboardUi.cardBody}>
            <div className="grid gap-4">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                <span>Título SEO</span>
                <input
                  name="seoTitle"
                  value={draft.seoTitle}
                  onChange={(event) => setDraft((current) => ({ ...current, seoTitle: event.target.value }))}
                  placeholder="Ej: Manta tejida natural | DELUAR"
                  className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                />
                {getFieldError(state, "seoTitle") ? (
                  <span className="text-xs font-normal text-rose-600">{getFieldError(state, "seoTitle")}</span>
                ) : null}
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                <span>Descripción SEO</span>
                <textarea
                  name="seoDescription"
                  value={draft.seoDescription}
                  onChange={(event) => setDraft((current) => ({ ...current, seoDescription: event.target.value }))}
                  rows={3}
                  placeholder="Ej: Manta tejida natural para living, suave y decorativa."
                  className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                />
                {getFieldError(state, "seoDescription") ? (
                  <span className="text-xs font-normal text-rose-600">{getFieldError(state, "seoDescription")}</span>
                ) : null}
              </label>
            </div>
          </div>
        </section>
      </div>

      <aside className="grid gap-4 self-start">
        <section className={`${dashboardUi.card} overflow-hidden`}>
          <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
            {product.imageUrl ? (
              <Image src={product.imageUrl} alt={product.imageAlt} fill sizes="(max-width: 1280px) 100vw, 360px" className="object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-200 to-slate-100 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Sin imagen principal
              </div>
            )}
          </div>

          <div className={dashboardUi.cardBody}>
            <p className={dashboardUi.mutedLabel}>Contexto</p>
            <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-slate-950">{product.title}</h3>
            <p className="mt-1 text-sm text-slate-500">/{product.slug}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              <span
                className={cn(
                  "inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
                  product.visible ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-slate-200 bg-slate-100 text-slate-600",
                )}
              >
                {product.visible ? "Visible" : "Oculto"}
              </span>
              {product.isOnOffer ? (
                <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-900">
                  En oferta
                </span>
              ) : null}
              {product.showInNewIn ? (
                <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-900">
                  Lo nuevo
                </span>
              ) : null}
            </div>

            <dl className="mt-4 grid gap-3 text-sm text-slate-600">
              <div className="flex items-center justify-between gap-4">
                <dt>Stock</dt>
                <dd className="font-medium text-slate-900">{product.stockLabel}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt>Variantes</dt>
                <dd className="font-medium text-slate-900">{product.variantLabel}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt>Categoría</dt>
                <dd className="font-medium text-slate-900 text-right">{product.categoryLabel}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt>Precio</dt>
                <dd className="font-medium text-slate-900">{formatDashboardPrice(product.basePrice)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt>Transferencia</dt>
                <dd className="font-medium text-slate-900">
                  {typeof product.transferPrice === "number" ? formatDashboardPrice(product.transferPrice) : "Sin definir"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt>Logística</dt>
                <dd className="font-medium text-slate-900 text-right">
                  {formatProductLogisticsSummary(product.logistics)}
                </dd>
              </div>
              <AdminProductDetailUpdatedAt initialUpdatedAt={product.updatedAt} variant="field" />
            </dl>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href="/admin/productos"
                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Volver al listado
              </Link>
              <Link
                href={`/productos/detalle/${currentSlug}`}
                className={cn("inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold", dashboardUi.primaryAction)}
              >
                Ver en tienda
              </Link>
            </div>
          </div>
        </section>

        <section className={`${dashboardUi.card} overflow-hidden`}>
          <div className={`${dashboardUi.cardHeader} border-b border-slate-200/60`}>
            <div>
              <h2 className={dashboardUi.sectionTitle}>Comercial</h2>
              <p className={dashboardUi.sectionDescription}>Estado operativo, destacado, oferta y stock general.</p>
            </div>
          </div>

          <div className={dashboardUi.cardBody}>
            <div className="grid gap-4">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                <span>Estado</span>
                <select
                  name="isActive"
                  value={draft.isActive ? "true" : "false"}
                  onChange={(event) => setDraft((current) => ({ ...current, isActive: event.target.value === "true" }))}
                  className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                >
                  <option value="true">Visible</option>
                  <option value="false">Oculto</option>
                </select>
                {getFieldError(state, "isActive") ? (
                  <span className="text-xs font-normal text-rose-600">{getFieldError(state, "isActive")}</span>
                ) : null}
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                <span>Prioridad destacada</span>
                <select
                  name="isFeatured"
                  value={draft.isFeatured ? "true" : "false"}
                  onChange={(event) => setDraft((current) => ({ ...current, isFeatured: event.target.value === "true" }))}
                  className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                >
                  <option value="true">Prioridad alta</option>
                  <option value="false">Normal</option>
                </select>
                {getFieldError(state, "isFeatured") ? (
                  <span className="text-xs font-normal text-rose-600">{getFieldError(state, "isFeatured")}</span>
                ) : null}
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                <span>Oferta</span>
                <select
                  name="isOnOffer"
                  value={draft.isOnOffer ? "true" : "false"}
                  onChange={(event) => setDraft((current) => ({ ...current, isOnOffer: event.target.value === "true" }))}
                  className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                >
                  <option value="true">En oferta</option>
                  <option value="false">Sin oferta</option>
                </select>
                {getFieldError(state, "isOnOffer") ? (
                  <span className="text-xs font-normal text-rose-600">{getFieldError(state, "isOnOffer")}</span>
                ) : null}
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                <span>Lo nuevo</span>
                <select
                  name="showInNewIn"
                  value={draft.showInNewIn ? "true" : "false"}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      showInNewIn: event.target.value === "true",
                    }))
                  }
                  className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                >
                  <option value="true">En Lo nuevo</option>
                  <option value="false">Fuera de Lo nuevo</option>
                </select>
                {getFieldError(state, "showInNewIn") ? (
                  <span className="text-xs font-normal text-rose-600">{getFieldError(state, "showInNewIn")}</span>
                ) : null}
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                <span>Prioridad en Lo nuevo</span>
                <input
                  type="number"
                  name="newInOrder"
                  min={0}
                  step={1}
                  value={draft.newInOrder}
                  onChange={(event) => setDraft((current) => ({ ...current, newInOrder: event.target.value }))}
                  disabled={!draft.showInNewIn}
                  placeholder="Ej. 1"
                  className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                />
                {draft.showInNewIn ? (
                  <span className="text-xs text-slate-500">Usá un número menor para aparecer antes.</span>
                ) : (
                  <span className="text-xs text-slate-500">Solo se usa cuando el producto está en Lo nuevo.</span>
                )}
                {getFieldError(state, "newInOrder") ? (
                  <span className="text-xs font-normal text-rose-600">{getFieldError(state, "newInOrder")}</span>
                ) : null}
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                <span>Stock</span>
                {canEditStock ? (
                  <input
                    type="number"
                    name="stock"
                    min={0}
                    step={1}
                    value={draft.stock}
                    onChange={(event) => setDraft((current) => ({ ...current, stock: event.target.value }))}
                    placeholder="Ej. 24"
                    className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                  />
                ) : (
                  <div className="rounded-[18px] border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    {product.stockLabel}. Administrado por variantes.
                  </div>
                )}
                {getFieldError(state, "stock") ? (
                  <span className="text-xs font-normal text-rose-600">{getFieldError(state, "stock")}</span>
                ) : null}
              </label>
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-3 rounded-[22px] border border-slate-200/70 bg-white px-4 py-4 text-sm text-slate-600 shadow-[0_8px_18px_rgba(15,23,42,0.028)]">
          <p className="font-medium text-slate-900">Consejo operativo</p>
          <p>
            Si cambiás la categoría, la subcategoría debe seguir perteneciendo al árbol seleccionado. Si no, el guardado se bloquea.
          </p>
        </div>
      </aside>

      <div className="xl:col-span-2 flex flex-col-reverse gap-3 border-t border-slate-200/70 pt-4 sm:flex-row sm:items-center sm:justify-end">
        <Link
          href="/admin/productos"
          className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Cancelar / volver
        </Link>
        <button
          type="submit"
          disabled={pending}
          className={cn(
            "rounded-full border px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300",
            dashboardUi.primaryAction,
          )}
        >
          {pending ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
