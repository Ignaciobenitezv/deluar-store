"use client";

import Image from "next/image";
import Link from "next/link";
import type { ChangeEvent, Dispatch, ReactNode, SetStateAction } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AdminProductRichTextEditor } from "./admin-product-rich-text-editor";
import { AdminProductDetailUpdatedAt } from "./admin-product-updated-at";
import { dashboardUi } from "@/features/admin/dashboard/lib/dashboard-ui";
import { formatDashboardPrice } from "@/features/admin/dashboard/lib/dashboard-formatters";
import { formatProductLogisticsSummary } from "@/features/catalog/logistics";
import { cn } from "@/lib/utils";
import { buildAdminProductSlugFromTitle } from "../lib/product-slug";
import { TabStripBaseline, TabStripContent, TabStripIndicator } from "@/features/admin/shell/tab-strip";
import type { AdminProductCategoryNode, AdminProductDetailData } from "../types";

export type ProductEditTabId = "info" | "galeria" | "variantes" | "precios" | "envio" | "seo" | "preview";

const PRODUCT_EDIT_TAB_ICON_PROPS = {
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "h-[16px] w-[16px]",
};

export const productEditTabs: { id: ProductEditTabId; label: string; icon: ReactNode }[] = [
  {
    id: "info",
    label: "Información",
    icon: (
      <svg {...PRODUCT_EDIT_TAB_ICON_PROPS}>
        <rect x="2.5" y="2" width="11" height="12" rx="1.5" />
        <path d="M5 5.5h6M5 8h6M5 10.5h3.5" />
      </svg>
    ),
  },
  {
    id: "galeria",
    label: "Galería",
    icon: (
      <svg {...PRODUCT_EDIT_TAB_ICON_PROPS}>
        <rect x="1.8" y="2.8" width="12.4" height="10.4" rx="1.5" />
        <circle cx="5.3" cy="6.3" r="1.2" />
        <path d="m2.5 11.5 3.3-3.3a1 1 0 0 1 1.4 0l1.6 1.6M9 9.5l1.1-1.1a1 1 0 0 1 1.4 0l1.8 1.8" />
      </svg>
    ),
  },
  {
    id: "variantes",
    label: "Variantes y stock",
    icon: (
      <svg {...PRODUCT_EDIT_TAB_ICON_PROPS}>
        <rect x="2" y="2" width="8" height="8" rx="1.5" />
        <path d="M6.5 9.5V13a1 1 0 0 0 1 1H13a1 1 0 0 0 1-1V7.5a1 1 0 0 0-1-1H9.5" />
      </svg>
    ),
  },
  {
    id: "precios",
    label: "Precios",
    icon: (
      <svg {...PRODUCT_EDIT_TAB_ICON_PROPS}>
        <path d="M2 8.3 7.7 2.6a1 1 0 0 1 .71-.29L13 2.3a1 1 0 0 1 1 1l-.01 4.6a1 1 0 0 1-.29.7L8 14.3a1 1 0 0 1-1.41 0L2 9.7a1 1 0 0 1 0-1.4Z" />
        <circle cx="10.3" cy="5.7" r="1.1" />
      </svg>
    ),
  },
  {
    id: "envio",
    label: "Envío",
    icon: (
      <svg {...PRODUCT_EDIT_TAB_ICON_PROPS}>
        <path d="M1.8 5.2 8 2l6.2 3.2v5.6L8 14 1.8 10.8V5.2Z" />
        <path d="M1.8 5.2 8 8.4l6.2-3.2M8 8.4v5.9" />
      </svg>
    ),
  },
  {
    id: "seo",
    label: "SEO",
    icon: (
      <svg {...PRODUCT_EDIT_TAB_ICON_PROPS}>
        <circle cx="7" cy="7" r="4.5" />
        <path d="m13.5 13.5-2.9-2.9" />
      </svg>
    ),
  },
  {
    id: "preview",
    label: "Vista previa",
    icon: (
      <svg {...PRODUCT_EDIT_TAB_ICON_PROPS}>
        <path d="M1.5 8S4 3 8 3s6.5 5 6.5 5-2.5 5-6.5 5-6.5-5-6.5-5Z" />
        <circle cx="8" cy="8" r="2.1" />
      </svg>
    ),
  },
];

/**
 * Every tab is available from the moment Crear producto opens — Galería and
 * Variantes work directly against the draft Sanity document from the start,
 * so there's nothing here to lock. No `disabled`, no tooltip, no per-tab
 * gating: this is the same plain tab strip Editar producto has always used.
 */
export function ProductEditTabBar({
  activeTab,
  onChange,
}: {
  activeTab: ProductEditTabId;
  onChange: (tab: ProductEditTabId) => void;
}) {
  const activeButtonRef = useRef<HTMLButtonElement | null>(null);

  // Keeps the active tab in view when it changes — mainly the case where
  // it changed from outside a direct click on it (e.g. a save moving the
  // admin back to a tab programmatically).
  useEffect(() => {
    activeButtonRef.current?.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest" });
  }, [activeTab]);

  return (
    <nav aria-label="Secciones del producto" className="relative min-w-0">
      <div className="relative flex min-w-0 items-center gap-8 overflow-x-auto px-1 [-ms-overflow-style:none] [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden">
        {productEditTabs.map((tab) => {
          const active = tab.id === activeTab;

          return (
            <button
              key={tab.id}
              ref={active ? activeButtonRef : undefined}
              type="button"
              onClick={() => onChange(tab.id)}
              aria-current={active ? "page" : undefined}
              className="group relative flex h-11 shrink-0 items-center gap-1.5"
            >
              <TabStripContent active={active} icon={tab.icon} label={tab.label} />
              {active && <TabStripIndicator layoutId="product-edit-tab-indicator" />}
            </button>
          );
        })}
        <TabStripBaseline />
      </div>
    </nav>
  );
}

export const inputClass =
  "rounded-[18px] border border-border bg-surface px-4 py-3 text-sm text-text-primary outline-none transition placeholder:text-text-secondary focus:border-primary/50";
export const labelClass = "grid gap-2 text-sm font-medium text-text-secondary";
export const errorClass = "text-xs font-normal text-[color:var(--admin-danger)]";
export const sectionHeadingClass = "text-[13px] font-semibold tracking-[-0.01em] text-text-primary";
export const sectionNoteClass = "mt-1 text-[12.5px] leading-5 text-text-secondary";

/**
 * Visual-only marker for a field the server schema actually requires
 * (`adminProductDetailFormSchema` in validation/detail-product.ts) — the
 * native `required` attribute on the input already carries the a11y and
 * validation signal, so this stays aria-hidden to avoid double announcing.
 */
function RequiredMark() {
  return (
    <span aria-hidden className="text-[color:var(--admin-danger)]">
      {" "}
      *
    </span>
  );
}

export function RequiredFieldsLegend() {
  return (
    <p className="mt-2 text-[11.5px] text-text-secondary">
      <span aria-hidden className="text-[color:var(--admin-danger)]">
        *
      </span>{" "}
      Campos obligatorios
    </p>
  );
}

export type DetailDraft = {
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

export function createEmptyDetailDraft(): DetailDraft {
  return {
    title: "",
    slug: "",
    shortDescription: "",
    categoryId: "",
    subcategoryId: "",
    basePrice: "",
    transferPrice: "",
    stock: "0",
    isActive: false,
    isFeatured: false,
    isOnOffer: false,
    showInNewIn: false,
    newInOrder: "",
    weightGrams: "",
    heightCm: "",
    widthCm: "",
    depthCm: "",
    seoTitle: "",
    seoDescription: "",
  };
}

type TabFieldErrorState<Field extends string> = {
  status: string;
  fieldErrors?: Partial<Record<Field, string[]>>;
};

export function getTabFieldError<Field extends string>(state: TabFieldErrorState<Field>, field: Field) {
  if (!("fieldErrors" in state) || !state.fieldErrors) {
    return null;
  }

  return state.fieldErrors[field]?.[0] ?? null;
}

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

function flattenSubcategories(
  nodes: AdminProductCategoryNode[],
  depth = 0,
): { id: string; label: string }[] {
  return nodes.flatMap((node) => [
    {
      id: node._id,
      label: `${"- ".repeat(depth)}${node.title}`,
    },
    ...flattenSubcategories(node.subcategories ?? [], depth + 1),
  ]);
}

type TabContentCommonProps<Field extends string> = {
  formId: string;
  draft: DetailDraft;
  setDraft: Dispatch<SetStateAction<DetailDraft>>;
  state: TabFieldErrorState<Field>;
};

type InfoTabFieldError =
  | "title"
  | "slug"
  | "shortDescription"
  | "description"
  | "categoryId"
  | "subcategoryId"
  | "isActive"
  | "isFeatured"
  | "isOnOffer"
  | "showInNewIn"
  | "newInOrder";

export function ProductInfoTabContent({
  formId,
  draft,
  setDraft,
  state,
  categoryTree,
  initialDescriptionBlocks,
  currentSlug,
}: TabContentCommonProps<InfoTabFieldError> & {
  categoryTree: AdminProductCategoryNode[];
  initialDescriptionBlocks: unknown[];
  currentSlug: string;
}) {
  // Slug follows Nombre live, only while the admin hasn't typed into the
  // slug field themselves — starts "synced" exactly when there's nothing
  // there yet (a brand-new draft, its placeholder already cleared upstream)
  // and turns off the moment they edit slug directly, same pattern as any
  // "auto-suggest until overridden" field. An existing product's real slug
  // is never empty, so this never engages in edit mode.
  const [slugAutoSynced, setSlugAutoSynced] = useState(() => draft.slug.trim().length === 0);

  const handleTitleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextTitle = event.target.value;
    setDraft((current) => ({
      ...current,
      title: nextTitle,
      slug: slugAutoSynced ? buildAdminProductSlugFromTitle(nextTitle) : current.slug,
    }));
  };

  const handleSlugChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSlugAutoSynced(false);
    setDraft((current) => ({ ...current, slug: event.target.value }));
  };

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

  return (
    <div className={cn(dashboardUi.card, "overflow-hidden")}>
      <div className="px-5 py-5 sm:px-6">
        <h3 className={sectionHeadingClass}>Información básica</h3>
        <p className={sectionNoteClass}>Nombre, URL y descripción del producto.</p>
        <RequiredFieldsLegend />

        <div className="mt-4 grid gap-4">
          <label className={labelClass}>
            <span>
              Nombre
              <RequiredMark />
            </span>
            <input
              form={formId}
              name="title"
              required
              value={draft.title}
              onChange={handleTitleChange}
              className={inputClass}
              placeholder="Ej: Manta tejida natural"
            />
            {getTabFieldError(state, "title") ? <span className={errorClass}>{getTabFieldError(state, "title")}</span> : null}
          </label>

          <label className={labelClass}>
            <span>
              URL / slug
              <RequiredMark />
            </span>
            <input
              form={formId}
              name="slug"
              required
              value={draft.slug}
              onChange={handleSlugChange}
              onBlur={() =>
                setDraft((current) => ({
                  ...current,
                  slug: buildAdminProductSlugFromTitle(current.slug),
                }))
              }
              className={inputClass}
              placeholder="manta-tejida-natural"
            />
            {/* `overflow-wrap: anywhere` (not just `break-words`/break-word) is
                the one that actually counts toward min-content sizing per the
                CSS Text spec — a long slug wraps instead of setting this
                paragraph's (and therefore the grid's) minimum width. */}
            <p className="text-xs text-text-secondary [overflow-wrap:anywhere]">
              Normalizado automáticamente. Vista actual: /productos/detalle/{currentSlug}
            </p>
            {getTabFieldError(state, "slug") ? <span className={errorClass}>{getTabFieldError(state, "slug")}</span> : null}
          </label>

          <label className={labelClass}>
            <span>
              Descripción corta
              <RequiredMark />
            </span>
            <textarea
              form={formId}
              name="shortDescription"
              required
              value={draft.shortDescription}
              onChange={(event) => setDraft((current) => ({ ...current, shortDescription: event.target.value }))}
              rows={3}
              className={inputClass}
              placeholder="Ej: Textil decorativo para living en tono natural."
            />
            {getTabFieldError(state, "shortDescription") ? (
              <span className={errorClass}>{getTabFieldError(state, "shortDescription")}</span>
            ) : null}
          </label>

          <AdminProductRichTextEditor
            name="descriptionJson"
            formId={formId}
            label="Descripción completa"
            required
            helpText="Podés escribir párrafos, negrita, cursiva, listas y enlaces."
            initialBlocks={initialDescriptionBlocks}
            error={getTabFieldError(state, "description")}
          />
        </div>
      </div>

      <div className="border-t border-border" />

      <div className="px-5 py-5 sm:px-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h3 className={sectionHeadingClass}>Organización</h3>
            <p className={sectionNoteClass}>Categoría y subcategoría del producto.</p>

            <div className="mt-4 grid gap-4">
              <label className={labelClass}>
                <span>
                  Categoría
                  <RequiredMark />
                </span>
                <select
                  form={formId}
                  name="categoryId"
                  required
                  value={draft.categoryId}
                  onChange={handleCategoryChange}
                  className={inputClass}
                >
                  <option value="">Seleccioná una categoría</option>
                  {categoryTree.map((category) => (
                    <option key={category._id} value={category._id}>
                      {category.title}
                    </option>
                  ))}
                </select>
                {getTabFieldError(state, "categoryId") ? (
                  <span className={errorClass}>{getTabFieldError(state, "categoryId")}</span>
                ) : null}
              </label>

              <label className={labelClass}>
                <span>Subcategoría</span>
                <select
                  form={formId}
                  name="subcategoryId"
                  value={draft.subcategoryId}
                  onChange={(event) => {
                    setDraft((current) => ({ ...current, subcategoryId: event.target.value }));
                  }}
                  disabled={!selectedCategoryNode}
                  className={cn(inputClass, "disabled:bg-surface-elevated disabled:text-text-secondary")}
                >
                  <option value="">Sin subcategoría</option>
                  {subcategoryOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {getTabFieldError(state, "subcategoryId") ? (
                  <span className={errorClass}>{getTabFieldError(state, "subcategoryId")}</span>
                ) : null}
              </label>
            </div>
            <p className="mt-3 text-xs text-text-secondary">La subcategoría debe pertenecer a la categoría seleccionada.</p>
          </div>

          <div className="md:border-l md:border-border md:pl-6">
            <h3 className={sectionHeadingClass}>Visibilidad y merchandising</h3>
            <p className={sectionNoteClass}>Estado operativo, destacado, oferta y prioridad de exhibición.</p>

            <div className="mt-4 grid gap-1">
              <div className="flex items-center justify-between gap-3 py-2">
                <span className="text-sm font-medium text-text-secondary">Estado</span>
                <select
                  form={formId}
                  name="isActive"
                  value={draft.isActive ? "true" : "false"}
                  onChange={(event) => setDraft((current) => ({ ...current, isActive: event.target.value === "true" }))}
                  className={cn(inputClass, "w-40 py-2")}
                >
                  <option value="true">Visible</option>
                  <option value="false">Oculto</option>
                </select>
              </div>
              {getTabFieldError(state, "isActive") ? <span className={errorClass}>{getTabFieldError(state, "isActive")}</span> : null}

              <div className="flex items-center justify-between gap-3 border-t border-border py-2">
                <span className="text-sm font-medium text-text-secondary">Destacado</span>
                <select
                  form={formId}
                  name="isFeatured"
                  value={draft.isFeatured ? "true" : "false"}
                  onChange={(event) => setDraft((current) => ({ ...current, isFeatured: event.target.value === "true" }))}
                  className={cn(inputClass, "w-40 py-2")}
                >
                  <option value="true">Prioridad alta</option>
                  <option value="false">Normal</option>
                </select>
              </div>
              {getTabFieldError(state, "isFeatured") ? (
                <span className={errorClass}>{getTabFieldError(state, "isFeatured")}</span>
              ) : null}

              <div className="flex items-center justify-between gap-3 border-t border-border py-2">
                <span className="text-sm font-medium text-text-secondary">Oferta</span>
                <select
                  form={formId}
                  name="isOnOffer"
                  value={draft.isOnOffer ? "true" : "false"}
                  onChange={(event) => setDraft((current) => ({ ...current, isOnOffer: event.target.value === "true" }))}
                  className={cn(inputClass, "w-40 py-2")}
                >
                  <option value="true">En oferta</option>
                  <option value="false">Sin oferta</option>
                </select>
              </div>
              {getTabFieldError(state, "isOnOffer") ? <span className={errorClass}>{getTabFieldError(state, "isOnOffer")}</span> : null}

              <div className="flex items-center justify-between gap-3 border-t border-border py-2">
                <span className="text-sm font-medium text-text-secondary">Lo nuevo</span>
                <select
                  form={formId}
                  name="showInNewIn"
                  value={draft.showInNewIn ? "true" : "false"}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      showInNewIn: event.target.value === "true",
                    }))
                  }
                  className={cn(inputClass, "w-40 py-2")}
                >
                  <option value="true">En Lo nuevo</option>
                  <option value="false">Fuera de Lo nuevo</option>
                </select>
              </div>
              {getTabFieldError(state, "showInNewIn") ? (
                <span className={errorClass}>{getTabFieldError(state, "showInNewIn")}</span>
              ) : null}

              <div className="flex items-center justify-between gap-3 border-t border-border py-2">
                <span
                  className={cn(
                    "text-sm font-medium",
                    draft.showInNewIn ? "text-text-secondary" : "text-text-secondary/50",
                  )}
                >
                  Prioridad
                </span>
                <input
                  form={formId}
                  type="number"
                  name="newInOrder"
                  min={0}
                  step={1}
                  value={draft.newInOrder}
                  onChange={(event) => setDraft((current) => ({ ...current, newInOrder: event.target.value }))}
                  disabled={!draft.showInNewIn}
                  placeholder="Ej. 1"
                  className={cn(inputClass, "w-24 py-2 text-right disabled:cursor-not-allowed disabled:bg-surface-elevated disabled:text-text-secondary")}
                />
              </div>
              {draft.showInNewIn ? (
                <p className="text-xs text-text-secondary">Usá un número menor para aparecer antes.</p>
              ) : null}
              {getTabFieldError(state, "newInOrder") ? (
                <span className={errorClass}>{getTabFieldError(state, "newInOrder")}</span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type PricingTabFieldError = "basePrice" | "transferPrice";

export function ProductPricingTabContent({
  formId,
  draft,
  setDraft,
  state,
  hasVariants,
}: TabContentCommonProps<PricingTabFieldError> & { hasVariants: boolean }) {
  return (
    <div className={cn(dashboardUi.card, "overflow-hidden")}>
      <div className="px-5 py-5 sm:px-6">
        <h3 className={sectionHeadingClass}>Precios</h3>
        <p className={sectionNoteClass}>
          {hasVariants
            ? "Precio base del producto. Cada variante puede definir su propio precio; si no lo hace, hereda este valor."
            : "Precio principal y precio por transferencia."}
        </p>
        <RequiredFieldsLegend />

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className={labelClass}>
            <span>
              Precio
              <RequiredMark />
            </span>
            <input
              form={formId}
              type="number"
              name="basePrice"
              required
              value={draft.basePrice}
              onChange={(event) => setDraft((current) => ({ ...current, basePrice: event.target.value }))}
              min={0}
              step={1}
              className={inputClass}
            />
            {getTabFieldError(state, "basePrice") ? <span className={errorClass}>{getTabFieldError(state, "basePrice")}</span> : null}
          </label>

          <label className={labelClass}>
            <span>Precio por transferencia</span>
            <input
              form={formId}
              type="number"
              name="transferPrice"
              value={draft.transferPrice}
              onChange={(event) => setDraft((current) => ({ ...current, transferPrice: event.target.value }))}
              min={0}
              step={1}
              placeholder="Opcional"
              className={inputClass}
            />
            <p className="text-xs text-text-secondary">Si lo dejás vacío, se elimina ese valor.</p>
            {getTabFieldError(state, "transferPrice") ? (
              <span className={errorClass}>{getTabFieldError(state, "transferPrice")}</span>
            ) : null}
          </label>
        </div>
      </div>
    </div>
  );
}

type ShippingTabFieldError = "weightGrams" | "heightCm" | "widthCm" | "depthCm";

export function ProductShippingTabContent({
  formId,
  draft,
  setDraft,
  state,
  hasVariants,
}: TabContentCommonProps<ShippingTabFieldError> & { hasVariants: boolean }) {
  return (
    <div className={cn(dashboardUi.card, "overflow-hidden")}>
      <div className="px-5 py-5 sm:px-6">
        <h3 className={sectionHeadingClass}>Peso y dimensiones</h3>
        <p className={sectionNoteClass}>
          {hasVariants
            ? "Valores por defecto: una variante sin override propio hereda estas medidas. Completá una y completá las cuatro."
            : "Peso y dimensiones del producto. Si completás una medida, completá las cuatro."}
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>
            <span>Peso (g)</span>
            <input
              form={formId}
              type="number"
              name="weightGrams"
              min={1}
              step={1}
              value={draft.weightGrams}
              onChange={(event) => setDraft((current) => ({ ...current, weightGrams: event.target.value }))}
              placeholder="Opcional"
              className={inputClass}
            />
            {getTabFieldError(state, "weightGrams") ? (
              <span className={errorClass}>{getTabFieldError(state, "weightGrams")}</span>
            ) : null}
          </label>

          <label className={labelClass}>
            <span>Alto (cm)</span>
            <input
              form={formId}
              type="number"
              name="heightCm"
              min={1}
              step={0.1}
              value={draft.heightCm}
              onChange={(event) => setDraft((current) => ({ ...current, heightCm: event.target.value }))}
              placeholder="Opcional"
              className={inputClass}
            />
            {getTabFieldError(state, "heightCm") ? <span className={errorClass}>{getTabFieldError(state, "heightCm")}</span> : null}
          </label>

          <label className={labelClass}>
            <span>Ancho (cm)</span>
            <input
              form={formId}
              type="number"
              name="widthCm"
              min={1}
              step={0.1}
              value={draft.widthCm}
              onChange={(event) => setDraft((current) => ({ ...current, widthCm: event.target.value }))}
              placeholder="Opcional"
              className={inputClass}
            />
            {getTabFieldError(state, "widthCm") ? <span className={errorClass}>{getTabFieldError(state, "widthCm")}</span> : null}
          </label>

          <label className={labelClass}>
            <span>Profundidad (cm)</span>
            <input
              form={formId}
              type="number"
              name="depthCm"
              min={1}
              step={0.1}
              value={draft.depthCm}
              onChange={(event) => setDraft((current) => ({ ...current, depthCm: event.target.value }))}
              placeholder="Opcional"
              className={inputClass}
            />
            {getTabFieldError(state, "depthCm") ? <span className={errorClass}>{getTabFieldError(state, "depthCm")}</span> : null}
          </label>
        </div>
      </div>
    </div>
  );
}

type SeoTabFieldError = "seoTitle" | "seoDescription";

export function ProductSeoTabContent({
  formId,
  draft,
  setDraft,
  state,
}: TabContentCommonProps<SeoTabFieldError>) {
  return (
    <div className={cn(dashboardUi.card, "overflow-hidden")}>
      <div className="px-5 py-5 sm:px-6">
        <h3 className={sectionHeadingClass}>Optimización para buscadores</h3>
        <p className={sectionNoteClass}>Título y descripción para buscadores y vistas previas.</p>

        <div className="mt-4 grid gap-4">
          <label className={labelClass}>
            <span>Título SEO</span>
            <input
              form={formId}
              name="seoTitle"
              value={draft.seoTitle}
              onChange={(event) => setDraft((current) => ({ ...current, seoTitle: event.target.value }))}
              placeholder="Ej: Manta tejida natural | DELUAR"
              className={inputClass}
            />
            {getTabFieldError(state, "seoTitle") ? <span className={errorClass}>{getTabFieldError(state, "seoTitle")}</span> : null}
          </label>

          <label className={labelClass}>
            <span>Descripción SEO</span>
            <textarea
              form={formId}
              name="seoDescription"
              value={draft.seoDescription}
              onChange={(event) => setDraft((current) => ({ ...current, seoDescription: event.target.value }))}
              rows={3}
              placeholder="Ej: Manta tejida natural para living, suave y decorativa."
              className={inputClass}
            />
            {getTabFieldError(state, "seoDescription") ? (
              <span className={errorClass}>{getTabFieldError(state, "seoDescription")}</span>
            ) : null}
          </label>
        </div>
      </div>
    </div>
  );
}

/**
 * Read-only — shows the last PERSISTED state (draft or published), never
 * the unsaved form draft in memory. Works before finalizing too: `product`
 * is the Sanity draft document itself, which Galería/Variantes already save
 * onto independently — `isDraft` only changes the copy and badge, not what
 * data this reads.
 */
export function ProductPreviewTabContent({ product, isDraft = false }: { product: AdminProductDetailData; isDraft?: boolean }) {
  return (
    <div className={cn(dashboardUi.card, "overflow-hidden")}>
      <div className="px-5 py-5 sm:px-6">
        <h3 className={sectionHeadingClass}>Vista previa</h3>
        <p className={sectionNoteClass}>
          {isDraft
            ? "Así se ve el producto hasta ahora. Todavía no está publicado."
            : "Así se encuentra actualmente publicado el producto."}
        </p>
      </div>

      <div className="border-t border-border" />

      <div className="px-5 py-5 sm:px-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[18px] bg-surface-elevated">
            {product.imageUrl ? (
              <Image src={product.imageUrl} alt={product.imageAlt} fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary">
                Sin imagen principal
              </div>
            )}
          </div>

          <div>
            <h4 className="text-xl font-semibold tracking-[-0.04em] text-text-primary">{product.title}</h4>
            <p className="mt-1 text-sm text-text-secondary [overflow-wrap:anywhere]">/{product.slug}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              {isDraft ? (
                <span className="inline-flex rounded-full border border-[var(--admin-warning)]/25 bg-[var(--admin-warning)]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--admin-warning)]">
                  Borrador
                </span>
              ) : (
                <span
                  className={cn(
                    "inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
                    product.visible
                      ? "border-[var(--admin-success)]/25 bg-[var(--admin-success)]/10 text-[color:var(--admin-success)]"
                      : "border-border bg-surface-elevated text-text-secondary",
                  )}
                >
                  {product.visible ? "Visible" : "Oculto"}
                </span>
              )}
              {product.isOnOffer ? (
                <span className="inline-flex rounded-full border border-[var(--admin-warning)]/25 bg-[var(--admin-warning)]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--admin-warning)]">
                  En oferta
                </span>
              ) : null}
              {product.showInNewIn ? (
                <span className="inline-flex rounded-full border border-[var(--admin-info)]/25 bg-[var(--admin-info)]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--admin-info)]">
                  Lo nuevo
                </span>
              ) : null}
            </div>

            <dl className="mt-4 grid gap-3 text-sm text-text-secondary">
              <div className="flex items-center justify-between gap-4">
                <dt className="shrink-0">Stock</dt>
                <dd className="min-w-0 flex-1 truncate text-right font-medium text-text-primary">{product.stockLabel}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="shrink-0">Variantes</dt>
                <dd className="min-w-0 flex-1 truncate text-right font-medium text-text-primary">{product.variantLabel}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="shrink-0">Categoría</dt>
                <dd className="min-w-0 flex-1 truncate text-right font-medium text-text-primary">{product.categoryLabel}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="shrink-0">Precio</dt>
                <dd className="min-w-0 flex-1 truncate text-right font-medium text-text-primary">
                  {product.hasVariants ? "Administrado por variantes" : formatDashboardPrice(product.basePrice)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="shrink-0">Transferencia</dt>
                <dd className="min-w-0 flex-1 truncate text-right font-medium text-text-primary">
                  {product.hasVariants
                    ? "Se edita dentro de cada variante"
                    : typeof product.transferPrice === "number"
                      ? formatDashboardPrice(product.transferPrice)
                      : "Sin definir"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="shrink-0">Envío</dt>
                <dd className="min-w-0 flex-1 truncate text-right font-medium text-text-primary">
                  {formatProductLogisticsSummary(product.logistics)}
                </dd>
              </div>
              <AdminProductDetailUpdatedAt initialUpdatedAt={product.updatedAt} variant="field" />
            </dl>
          </div>
        </div>
      </div>

      <div className="border-t border-border" />

      <div className="flex flex-wrap gap-2 px-5 py-5 sm:px-6">
        <Link
          href="/admin/productos"
          className="inline-flex items-center rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-text-secondary transition hover:bg-surface-elevated"
        >
          Volver al listado
        </Link>
        {isDraft ? null : (
          <Link
            href={`/productos/detalle/${product.slug}`}
            className={cn("inline-flex items-center rounded-full border px-4 py-2 text-sm text-white! font-semibold", dashboardUi.primaryAction)}
          >
            Ver en tienda
          </Link>
        )}
      </div>
    </div>
  );
}
