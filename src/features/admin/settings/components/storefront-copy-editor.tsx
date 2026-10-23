"use client";

import { useId, useReducer, useState, useTransition, type ReactNode } from "react";
import { Badge } from "@/components/admin/ui/badge";
import { Input } from "@/components/admin/ui/input";
import { dashboardUi } from "@/features/admin/dashboard/lib/dashboard-ui";
import {
  copyEditorReducer,
  customizedCount,
  fieldValue,
  hasLocalCopyChanges,
  hasUnpublishedCopyChanges,
  heroCorrectionCount,
  heroSlideOrderOf,
  newHeroSlideId,
  initialCopyEditorState,
  type CopyEditorState,
  type HeroSlideBase,
  type ProductSummary,
} from "@/features/storefront-copy/editor";
import { TabStripBaseline, TabStripContent, TabStripIndicator } from "@/features/admin/shell/tab-strip";
import {
  COPY_SECTION_GROUPS,
  HERO_PRODUCTS_MAX,
  HERO_SLIDES_MAX,
  HERO_SURFACES,
  type HeroSurfaceId,
  HERO_SLIDE_FIELDS,
  HERO_SLIDE_TEXT_KEYS,
  PRODUCT_LISTS,
  SECTION_IMAGES,
  SECTION_IMAGE_IDS,
  STOREFRONT_COPY_SECTIONS,
  STOREFRONT_COPY_SECTION_IDS,
  sectionFields,
  type CopyFieldDefinition,
  type HeroSlideImageChoice,
  type ImageFraming,
  type HeroSlideTexts,
  type ProductListId,
  type StorefrontCopy,
  type StorefrontCopySectionId,
} from "@/features/storefront-copy/fields";
import {
  copyFieldProblem,
  copyToFields,
  resolveStorefrontCopy,
} from "@/features/storefront-copy/storefront-copy-document";
import { framingStyle, isDefaultFraming } from "@/features/storefront-copy/framing";
import type { ThemeTokens } from "@/features/theme/types";
import { getSanityAssetUrl } from "@/integrations/sanity/image";
import { cn } from "@/lib/utils";
import {
  discardStorefrontCopyDraftAction,
  publishStorefrontCopyAction,
  reloadStorefrontCopyAction,
  saveStorefrontCopyDraftAction,
  uploadHeroImageAction,
} from "../actions/storefront-copy-actions";
import { shrinkImageForUpload } from "../lib/shrink-image";
import { ImageFramingDialog, type FramingFrames } from "./image-framing-dialog";
import { ProductPicker } from "./product-picker";
import { HeroSlidePreview, SectionPreview, SpotlightPreview } from "./storefront-copy-preview";
import { previewStyle } from "./storefront-theme-preview";
import type { AdminStorefrontCopyData } from "../server/storefront-copy-data";
import type { CopyWriteResult } from "../server/storefront-copy-service";
import { ActionButton, FeedbackMessage, StatusRow, formatDate, type EditorFeedback } from "./settings-editor-ui";

type GroupId = keyof typeof COPY_SECTION_GROUPS;
const GROUP_IDS = Object.keys(COPY_SECTION_GROUPS) as GroupId[];

/** What the editor shows: the hero, the rotating selection (products only), or one section of fields. */
const HERO_TARGET = "hero";
const SPOTLIGHT_TARGET = "spotlight";
type SectionTarget = typeof HERO_TARGET | typeof SPOTLIGHT_TARGET | StorefrontCopySectionId;

const groupOf = (target: SectionTarget): GroupId =>
  target === HERO_TARGET || target === SPOTLIGHT_TARGET ? "home" : STOREFRONT_COPY_SECTIONS[target].group;

/** Sections whose card also picks a product list. */
const SECTION_PRODUCT_LIST: Partial<Record<StorefrontCopySectionId, ProductListId>> = {
  newArrivals: "featured",
  offers: "offers",
};

const HERO_AUTOMATIC_NOTE = "Al azar entre destacados, novedades y ofertas; cambian en cada visita.";

const GROUP_ICONS: Record<GroupId, ReactNode> = {
  general: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-full w-full">
      <rect x="2" y="2.5" width="12" height="11" rx="1.5" />
      <path d="M2 5.5h12" />
    </svg>
  ),
  home: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-full w-full">
      <path d="M2.5 13.5V6.8L8 3l5.5 3.8v6.7Z" />
      <path d="M6.2 13.5V9.8h3.6v3.7" />
    </svg>
  ),
  pages: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-full w-full">
      <path d="M4 1.8h5.5L12.5 5v9.2H4Z" />
      <path d="M9.5 1.8V5h3M6 8h4.5M6 10.5h4.5" />
    </svg>
  ),
};

const sectionsOf = (group: GroupId) =>
  STOREFRONT_COPY_SECTION_IDS.filter((section) => STOREFRONT_COPY_SECTIONS[section].group === group);

/** Long texts take the whole row. */
const fieldSpan = (field: CopyFieldDefinition) =>
  field.kind === "multiline" || field.kind === "list" || field.kind === "richtext" ? "md:col-span-2" : undefined;

function heroCorrections(copy: StorefrontCopy) {
  return Object.keys(copy.heroSlides).reduce((total, slideId) => total + heroCorrectionCount(copy, slideId), 0);
}

function totalCustomized(state: CopyEditorState, which: "draft" | "published") {
  const copy = which === "draft" ? state.draft : state.published.copy;
  return STOREFRONT_COPY_SECTION_IDS.reduce((total, section) => total + customizedCount(copy, section), heroCorrections(copy));
}

const customizedLabel = (count: number) =>
  count === 0 ? "Textos originales" : `${count} ${count === 1 ? "texto cambiado" : "textos cambiados"}`;

const TEXTAREA_ROWS: Partial<Record<NonNullable<CopyFieldDefinition["kind"]>, number>> = {
  multiline: 3,
  list: 8,
  richtext: 14,
};

const FORMAT_HELP: Partial<Record<NonNullable<CopyFieldDefinition["kind"]>, string>> = {
  list: "Un elemento por línea.",
  richtext: "Línea en blanco: párrafo nuevo · «## » al comienzo: subtítulo · «- » al comienzo: viñeta · **texto**: negrita.",
};

function CopyField({
  field,
  value,
  original,
  disabled,
  onChange,
  onReset,
}: {
  field: CopyFieldDefinition;
  value: string;
  /** What the store shows without a change: the default, or a hero slide's Studio text. */
  original: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onReset: () => void;
}) {
  const id = useId();
  const trimmed = value.trim();
  const isOriginal = trimmed === "" || trimmed === original.trim();
  const problem = isOriginal ? null : copyFieldProblem(trimmed, field);
  const helpId = `${id}-help`;
  const rows = field.kind ? TEXTAREA_ROWS[field.kind] : undefined;
  const shared = {
    id,
    value,
    disabled,
    // Empty shows the original as a hint: clearing a field restores it.
    placeholder: original,
    "aria-invalid": problem ? true : undefined,
    "aria-describedby": helpId,
  };
  const inputClassName = cn("text-[13px]", problem && "border-danger/60 focus:border-danger/60 focus:ring-danger/20");
  const help = problem
    ? `Este texto ${problem}.`
    : [field.description, field.kind ? FORMAT_HELP[field.kind] : undefined].filter(Boolean).join(" ") ||
      (isOriginal || rows ? "" : `Original: «${original}»`);

  return (
    <div className="grid gap-1.5">
      <div className="flex min-h-5 items-center justify-between gap-2">
        <label htmlFor={id} className="text-[12px] font-medium text-text-primary">
          {field.label}
        </label>
        {isOriginal ? null : (
          <span className="flex items-center gap-1.5">
            <Badge tone="info">Cambiado</Badge>
            <button
              type="button"
              disabled={disabled}
              onClick={onReset}
              className="rounded-md px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-50"
            >
              <span className="text-[11px] text-primary underline-offset-2 hover:underline">Restaurar</span>
            </button>
          </span>
        )}
      </div>

      {rows ? (
        <textarea
          {...shared}
          rows={rows}
          onChange={(event) => onChange(event.target.value)}
          className={cn(
            "w-full resize-y rounded-xl border border-border bg-surface px-3 py-2.5 leading-5 text-text-primary outline-none transition-colors placeholder:text-text-secondary focus:border-primary/40 focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-surface-elevated",
            inputClassName,
          )}
        />
      ) : (
        <Input
          {...shared}
          type={field.kind === "url" ? "url" : field.kind === "phone" ? "tel" : "text"}
          spellCheck={field.kind === "url" || field.kind === "link" || field.kind === "phone" ? false : undefined}
          autoComplete="off"
          onChange={(event) => onChange(event.target.value)}
          className={inputClassName}
        />
      )}

      <div id={helpId} className="flex items-start justify-between gap-3 text-[11px] leading-4">
        <span className={problem ? "text-danger" : "text-text-secondary"}>{help}</span>
        <span
          className={cn("shrink-0 tabular-nums", trimmed.length > field.maxLength ? "text-danger" : "text-text-secondary")}
        >
          {trimmed.length}/{field.maxLength}
        </span>
      </div>
    </div>
  );
}

// How each photo is cropped on the store, measured on its usual screens:
// hero panel ~6:5 on a computer and a bit taller than wide on a phone;
// category banners ~7:6 / 8:7; the newsletter strip is very wide on a computer.
const FRAMES: Record<"hero" | "editorial" | "newsletter", FramingFrames> = {
  hero: { desktop: "aspect-[6/5]", mobile: "aspect-[10/11]" },
  editorial: { desktop: "aspect-[7/6]", mobile: "aspect-[8/7]" },
  newsletter: { desktop: "aspect-[18/5]", mobile: "aspect-[10/9]" },
};

// The store's own surface colours (painted with its palette via previewStyle).
const SURFACE_SWATCHES: Record<HeroSurfaceId, string> = {
  promo: "bg-promo",
  sand: "bg-canvas-alt",
  brown: "bg-brand",
};

function SlideIconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-7 w-7 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-elevated hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-30"
    >
      <span className="text-[13px] leading-none">{children}</span>
    </button>
  );
}

/** Pills to pick one item (a section, a slide); the count marks changed texts. */
function ChipRow({
  label,
  items,
  activeId,
  onSelect,
  size = "md",
}: {
  label: string;
  items: { id: string; label: string; count: number }[];
  activeId: string | undefined;
  onSelect: (id: string) => void;
  size?: "sm" | "md";
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {items.map((item) => {
        const active = item.id === activeId;

        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(item.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
              size === "sm" ? "h-7 px-2.5" : "h-8 px-3",
              active
                ? "border-primary/40 bg-primary-soft text-primary"
                : "border-border bg-surface text-text-secondary hover:bg-surface-elevated hover:text-text-primary",
            )}
          >
            <span className={cn("font-medium", size === "sm" ? "text-[11.5px]" : "text-[12.5px]")}>{item.label}</span>
            {item.count > 0 ? (
              <span
                className={cn(
                  "rounded-full px-1.5 text-[10.5px] font-semibold tabular-nums",
                  active ? "bg-primary text-white" : "bg-surface-elevated text-text-secondary",
                )}
              >
                {item.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/** The photo a slide will show: a replacement, none, or its own from Studio. */
function effectiveImageUrl(studioImageUrl: string | null, choice: HeroSlideImageChoice | undefined) {
  if (choice === "removed") {
    return null;
  }

  // Uncropped, like on the store: the framing does the cropping.
  return choice ? getSanityAssetUrl(choice.assetRef, 1200) : studioImageUrl;
}

/**
 * Change, restore (and for hero slides, remove) a photo. A new photo is
 * uploaded to Sanity's asset store right away, but the store only uses it
 * once this draft is published.
 */
function PhotoControl({
  label = "Foto",
  originalImageUrl,
  originalLabel = "Foto cargada en Studio.",
  restoreLabel = "Volver a la foto de Studio",
  allowRemove = true,
  choice,
  framing,
  frames,
  onFramingChange,
  disabled,
  onChange,
}: {
  /** Hand-set framing of whatever photo shows, and the crops to preview it in. */
  framing: ImageFraming | undefined;
  frames: FramingFrames;
  onFramingChange: (framing: ImageFraming | null) => void;
  label?: string;
  /** What shows without a change: the Studio photo, or the block's original file. */
  originalImageUrl: string | null;
  originalLabel?: string;
  restoreLabel?: string;
  /** Hero slides can go photo-less (colour panel); background blocks always need one. */
  allowRemove?: boolean;
  choice: HeroSlideImageChoice | undefined;
  disabled: boolean;
  onChange: (image: HeroSlideImageChoice | null) => void;
}) {
  const inputId = useId();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [framingOpen, setFramingOpen] = useState(false);
  const imageUrl = effectiveImageUrl(originalImageUrl, choice);
  const status =
    choice === "removed"
      ? "Sin foto: se muestra el panel de color."
      : choice
        ? "Foto nueva (se aplica al publicar)."
        : originalImageUrl
          ? originalLabel
          : "Sin foto: se muestra el panel de color.";

  async function upload(file: File) {
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.set("file", await shrinkImageForUpload(file));
      const result = await uploadHeroImageAction(formData);

      if (result.status === "success") {
        onChange({ assetRef: result.assetRef });
      } else {
        setError(result.message);
      }
    } catch (uploadError) {
      setError(
        uploadError instanceof Error && uploadError.message === "FILE_TOO_LARGE"
          ? "La foto es demasiado pesada incluso reducida. Probá con otra."
          : "No pudimos subir la foto. Intentá de nuevo.",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface-elevated/50 p-3">
      <div className="flex h-16 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-surface">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- small admin thumbnail from the Sanity CDN
          <img src={imageUrl} alt="" className="h-full w-full object-cover" style={framingStyle(framing)} />
        ) : (
          <span className="text-[10px] text-text-secondary">Sin foto</span>
        )}
      </div>

      <div className="grid min-w-0 flex-1 gap-2">
        <p className="text-[12px] text-text-primary">
          <span className="font-medium">{label}</span> · <span className="text-text-secondary">{status}</span>
        </p>
        <div className="flex flex-wrap gap-2">
          <label
            htmlFor={inputId}
            className={cn(
              dashboardUi.softAction,
              "inline-flex h-8 cursor-pointer items-center justify-center px-3 font-medium",
              (disabled || uploading) && "pointer-events-none opacity-50",
            )}
          >
            <span className="text-[12px]">{uploading ? "Subiendo…" : imageUrl ? "Cambiar foto…" : "Agregar foto…"}</span>
          </label>
          <input
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={disabled || uploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";

              if (file) {
                void upload(file);
              }
            }}
          />
          {imageUrl ? (
            <ActionButton disabled={disabled || uploading} onClick={() => setFramingOpen(true)}>
              {isDefaultFraming(framing) ? "Ajustar encuadre…" : "Encuadre ajustado · cambiar…"}
            </ActionButton>
          ) : null}
          {allowRemove && imageUrl ? (
            <ActionButton disabled={disabled || uploading} onClick={() => onChange("removed")}>
              Quitar foto
            </ActionButton>
          ) : null}
          {choice ? (
            <ActionButton disabled={disabled || uploading} onClick={() => onChange(null)}>
              {originalImageUrl ? restoreLabel : "Deshacer"}
            </ActionButton>
          ) : null}
        </div>
        {error ? (
          <p role="alert" className="text-[11px] leading-4 text-danger">
            {error}
          </p>
        ) : null}
      </div>

      {framingOpen && imageUrl ? (
        <ImageFramingDialog
          title={label}
          imageUrl={imageUrl}
          framing={framing}
          frames={frames}
          onApply={onFramingChange}
          onClose={() => setFramingOpen(false)}
        />
      ) : null}
    </div>
  );
}

/**
 * Configuración → Textos. Same flow as Apariencia: local edits → "Guardar
 * borrador" (only the Sanity draft) → "Publicar" (revision-locked, refreshes
 * the storefront cache). Any failed call leaves the local edits as they are.
 */
export function StorefrontCopyEditor({ data, tokens }: { data: AdminStorefrontCopyData; tokens: ThemeTokens }) {
  const [state, dispatch] = useReducer(copyEditorReducer, data.snapshot, initialCopyEditorState);
  const [feedback, setFeedback] = useState<EditorFeedback>(null);
  const [confirming, setConfirming] = useState<"publish" | "discardSaved" | null>(null);
  const [isPending, startTransition] = useTransition();
  const localChanges = hasLocalCopyChanges(state);
  const unpublished = hasUnpublishedCopyChanges(state);
  const writesBlocked = !data.canWrite || isPending || state.conflict !== null;
  const canPreviewOnStore = data.canWrite && state.saved !== null && !localChanges;
  // One section on screen at a time: a tab per group, then the group's sections.
  const [activeTarget, setActiveTarget] = useState<SectionTarget>(HERO_TARGET);
  const [lastTargetByGroup, setLastTargetByGroup] = useState<Partial<Record<GroupId, SectionTarget>>>({});
  const [activeSlideId, setActiveSlideId] = useState<string | undefined>(data.heroSlides[0]?.id);
  const activeGroup = groupOf(activeTarget);
  const draftHeroOrder = heroSlideOrderOf(
    state.draft,
    data.heroSlides.map((slide) => slide.id),
  );
  const problems: { label: string; target: SectionTarget }[] = [
    ...STOREFRONT_COPY_SECTION_IDS.flatMap((section) =>
      sectionFields(section).flatMap(([key, field]) => {
        const value = fieldValue(state.draft, section, key).trim();
        const problem = value === "" || value === field.default ? null : copyFieldProblem(value, field);
        return problem ? [{ label: `${field.label} (${STOREFRONT_COPY_SECTIONS[section].label})`, target: section }] : [];
      }),
    ),
    ...Object.entries(state.draft.heroSlides).flatMap(([slideId, texts]) =>
      HERO_SLIDE_TEXT_KEYS.flatMap((key) => {
        const value = texts[key]?.trim();
        const slideNumber = draftHeroOrder.indexOf(slideId) + 1;
        return value && copyFieldProblem(value, HERO_SLIDE_FIELDS[key])
          ? [
              {
                label: `${HERO_SLIDE_FIELDS[key].label} (Hero${slideNumber > 0 ? `, diapositiva ${slideNumber}` : ""})`,
                target: HERO_TARGET as SectionTarget,
              },
            ]
          : [];
      }),
    ),
    // A created slide has nothing under it in Studio: it needs its own title (checked on the server too).
    ...draftHeroOrder.flatMap((slideId, index) =>
      state.draft.heroSlides[slideId]?.custom && !state.draft.heroSlides[slideId]?.title?.trim()
        ? [{ label: `Título (Hero, diapositiva ${index + 1})`, target: HERO_TARGET as SectionTarget }]
        : [],
    ),
  ];
  const hasProblems = problems.length > 0;
  // What the store would render from this draft: blanks show their default, like on the store.
  const previewCopy = resolveStorefrontCopy(copyToFields(state.draft));
  const studioIds = data.heroSlides.map((slide) => slide.id);
  const heroOrder = heroSlideOrderOf(state.draft, studioIds);
  // Managing the list counts as one change, on top of each slide's own.
  const heroCount = heroCorrections(state.draft) + (state.draft.heroSlideOrder ? 1 : 0);
  /** Studio's slide, or a blank one for a slide created in the admin. */
  const slideBase = (id: string): HeroSlideBase =>
    data.heroSlides.find((slide) => slide.id === id) ?? {
      id,
      imageUrl: null,
      surface: "promo",
      automaticProducts: [],
      texts: { eyebrow: "", title: "", text: "", ctaLabel: "", ctaHref: "", secondaryCtaLabel: "", secondaryCtaHref: "" },
    };
  const listCount = (list: ProductListId | undefined) => (list && state.draft.productLists[list]?.length ? 1 : 0);
  const imageCount = (section: StorefrontCopySectionId) =>
    SECTION_IMAGE_IDS.filter(
      (id) => SECTION_IMAGES[id].section === section && (state.draft.images[id] || state.draft.imageFraming[id]),
    ).length;
  const navItems = (group: GroupId) => [
    ...(group === "home" ? [{ target: HERO_TARGET as SectionTarget, label: "Hero", count: heroCount }] : []),
    ...sectionsOf(group).flatMap((section) => [
      {
        target: section as SectionTarget,
        label: STOREFRONT_COPY_SECTIONS[section].label,
        count: customizedCount(state.draft, section) + listCount(SECTION_PRODUCT_LIST[section]) + imageCount(section),
      },
      // In page order: the rotating selection sits right after the "Lo nuevo" products.
      ...(section === "newArrivals"
        ? [{ target: SPOTLIGHT_TARGET as SectionTarget, label: PRODUCT_LISTS.spotlight.label, count: listCount("spotlight") }]
        : []),
    ]),
  ];
  // Products known to the editor: the initial ones plus everything found while searching.
  const [productCache, setProductCache] = useState(data.products);
  const rememberProducts = (found: ProductSummary[]) =>
    setProductCache((current) => {
      const next = { ...current };
      for (const product of found) next[product.id] = product;
      return next;
    });
  /** What a list will show: the picked products, else the automatic ones. */
  const listProducts = (list: ProductListId) =>
    (state.draft.productLists[list] ?? data.automaticProducts[list])
      .map((id) => productCache[id])
      .filter((product): product is ProductSummary => Boolean(product?.available));
  const groupCount = (group: GroupId) => navItems(group).reduce((total, item) => total + item.count, 0);

  function selectTarget(target: SectionTarget) {
    setActiveTarget(target);
    setLastTargetByGroup((current) => ({ ...current, [groupOf(target)]: target }));
  }

  function selectGroup(group: GroupId) {
    // Back to the section last open in that group, else its first one.
    setActiveTarget(lastTargetByGroup[group] ?? navItems(group)[0].target);
  }

  function handleResult(result: CopyWriteResult) {
    if (result.status === "success") {
      if (result.snapshot) {
        dispatch({ type: "synced", snapshot: result.snapshot });
      }

      setFeedback({ tone: "success", message: result.message });
      return;
    }

    if (result.status === "conflict") {
      dispatch({ type: "conflict", remote: result.snapshot });
      setFeedback(null);
      return;
    }

    setFeedback({ tone: "danger", message: result.message, issues: result.status === "invalid" ? result.issues : undefined });
  }

  function run(operation: () => Promise<CopyWriteResult>) {
    setConfirming(null);
    setFeedback(null);
    startTransition(async () => {
      try {
        handleResult(await operation());
      } catch {
        setFeedback({ tone: "danger", message: "No pudimos conectar con el servidor. Tus cambios siguen en el editor." });
      }
    });
  }

  const writeInput = () => ({
    draft: copyToFields(state.draft),
    publishedRevision: state.published.revision,
    savedRevision: state.saved?.revision ?? null,
  });

  const publishedValue = !data.isAvailable
    ? "No se pudo leer Sanity (la tienda muestra los textos originales si no responde)"
    : state.published.revision === null
      ? "Nunca · la tienda muestra los textos originales"
      : [customizedLabel(totalCustomized(state, "published")), formatDate(state.published.updatedAt)].filter(Boolean).join(" · ");

  return (
    <div className="grid items-start gap-3 sm:gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <aside className="grid min-w-0 gap-3 sm:gap-4 xl:sticky xl:top-4 xl:order-last">
        <section className={dashboardUi.card}>
          <div className={dashboardUi.cardHeader}>
            <div className="min-w-0">
              <h2 className={dashboardUi.sectionTitle}>Estado de los textos</h2>
              <p className={dashboardUi.sectionDescription}>Lo publicado es lo que ve la tienda; el borrador solo lo ve el panel.</p>
            </div>
            {unpublished ? <Badge tone="warning">Cambios sin publicar</Badge> : <Badge tone="success">Al día</Badge>}
          </div>

          <div className={cn(dashboardUi.cardBody, "space-y-3")}>
            <div className="divide-y divide-border">
              <StatusRow label="Publicados" value={publishedValue} />
              <StatusRow
                label="Borrador guardado"
                value={state.saved ? (formatDate(state.saved.updatedAt) ?? "Sí") : "Ninguno"}
              />
              <StatusRow
                label="En edición"
                value={customizedLabel(totalCustomized(state, "draft"))}
                badge={localChanges ? <Badge tone="warning">Sin guardar</Badge> : null}
              />
            </div>

            {!data.canWrite && data.isAvailable ? (
              <p className="rounded-xl border border-warning/25 bg-warning-soft px-3.5 py-2.5 text-[12px] leading-5 text-warning">
                El servidor no tiene credenciales de escritura de Sanity: podés editar, pero no guardar ni publicar.
              </p>
            ) : null}

            {state.conflict ? (
              <div role="alert" className="space-y-2.5 rounded-xl border border-warning/30 bg-warning-soft px-3.5 py-3">
                <p className="text-[12.5px] leading-5 text-warning">
                  Otro administrador cambió los textos mientras editabas. No se sobrescribió nada.
                </p>
                <div className="flex flex-wrap gap-2">
                  <ActionButton tone="primary" onClick={() => dispatch({ type: "reloadRemote" })}>
                    Cargar la versión actual
                  </ActionButton>
                  <ActionButton onClick={() => dispatch({ type: "keepLocalChanges" })}>Conservar mis cambios</ActionButton>
                </div>
                <p className="text-[11px] leading-4 text-text-secondary">
                  «Cargar la versión actual» descarta tu edición. «Conservar mis cambios» la mantiene: si después guardás o
                  publicás, reemplazará la versión actual.
                </p>
              </div>
            ) : null}

            {hasProblems ? (
              <div role="status" className="rounded-xl border border-danger/25 bg-danger-soft px-3.5 py-2.5 text-[12px] leading-5 text-danger">
                Corregí {problems.length === 1 ? "este texto" : "estos textos"} para poder guardar:
                <ul className="mt-1 grid gap-0.5">
                  {problems.map((problem) => (
                    <li key={problem.label}>
                      <button
                        type="button"
                        onClick={() => selectTarget(problem.target)}
                        className="rounded-sm text-left underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/30"
                      >
                        <span className="text-[12px]">{problem.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {feedback ? <FeedbackMessage feedback={feedback} /> : null}

            <div className="flex flex-wrap gap-2 border-t border-border pt-3">
              <ActionButton
                tone="primary"
                disabled={writesBlocked || !localChanges || hasProblems}
                onClick={() => run(() => saveStorefrontCopyDraftAction(writeInput()))}
              >
                {isPending ? "Procesando…" : "Guardar borrador"}
              </ActionButton>
              <ActionButton disabled={writesBlocked || !unpublished || hasProblems} onClick={() => setConfirming("publish")}>
                Publicar…
              </ActionButton>
              <ActionButton disabled={!localChanges || isPending} onClick={() => dispatch({ type: "discardLocalChanges" })}>
                Descartar cambios locales
              </ActionButton>
              <ActionButton disabled={writesBlocked || !state.saved} onClick={() => setConfirming("discardSaved")}>
                Descartar borrador guardado…
              </ActionButton>
              {state.conflict ? null : (
                <ActionButton disabled={!data.canWrite || isPending} onClick={() => run(reloadStorefrontCopyAction)}>
                  Recargar
                </ActionButton>
              )}
            </div>

            {confirming === "publish" ? (
              <div
                role="alertdialog"
                aria-label="Confirmar publicación"
                className="space-y-2.5 rounded-xl border border-primary/30 bg-primary-soft px-3.5 py-3"
              >
                <p className="text-[12.5px] leading-5 text-text-primary">
                  Se publican los textos tal como están en el editor{localChanges ? " (incluye cambios sin guardar)" : ""}.
                  La tienda los mostrará en la próxima visita.
                </p>
                <div className="flex flex-wrap gap-2">
                  <ActionButton tone="primary" onClick={() => run(() => publishStorefrontCopyAction(writeInput()))}>
                    Publicar ahora
                  </ActionButton>
                  <ActionButton onClick={() => setConfirming(null)}>Cancelar</ActionButton>
                </div>
              </div>
            ) : null}

            {confirming === "discardSaved" ? (
              <div
                role="alertdialog"
                aria-label="Confirmar descarte del borrador"
                className="space-y-2.5 rounded-xl border border-danger/30 bg-danger-soft px-3.5 py-3"
              >
                <p className="text-[12.5px] leading-5 text-text-primary">
                  Se borra el borrador guardado. Los textos publicados no cambian
                  {localChanges ? "; tus cambios sin guardar quedan en el editor" : ""}.
                </p>
                <div className="flex flex-wrap gap-2">
                  <ActionButton
                    tone="danger"
                    onClick={() => run(() => discardStorefrontCopyDraftAction({ savedRevision: state.saved?.revision ?? null }))}
                  >
                    Descartar borrador
                  </ActionButton>
                  <ActionButton onClick={() => setConfirming(null)}>Cancelar</ActionButton>
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
              <p className="max-w-sm text-[11px] leading-4 text-text-secondary">
                {canPreviewOnStore
                  ? "Abre la tienda con el borrador guardado. Solo lo ves vos, mientras tengas la sesión iniciada."
                  : "Para ver el borrador en la tienda real, guardalo primero."}
              </p>
              <form action="/api/admin/theme-preview" method="post" target="_blank">
                <input type="hidden" name="action" value="enable" />
                <button
                  type="submit"
                  disabled={!canPreviewOnStore}
                  className={cn(
                    dashboardUi.softAction,
                    "inline-flex h-8 items-center justify-center px-3 font-medium disabled:cursor-not-allowed disabled:opacity-50",
                  )}
                >
                  <span className="text-[12px]">Ver borrador en la tienda ↗</span>
                </button>
              </form>
            </div>
          </div>
        </section>

      </aside>

      <div className="grid min-w-0 gap-3 sm:gap-4">
        <nav aria-label="Grupos de textos" className="relative min-w-0">
          <div className="relative flex min-w-0 items-center gap-8 overflow-x-auto px-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {GROUP_IDS.map((group) => {
              const active = group === activeGroup;
              const count = groupCount(group);

              return (
                <button
                  key={group}
                  type="button"
                  onClick={() => selectGroup(group)}
                  aria-current={active ? "page" : undefined}
                  className="group relative flex h-11 shrink-0 items-center gap-1.5"
                >
                  <TabStripContent active={active} icon={GROUP_ICONS[group]} label={COPY_SECTION_GROUPS[group]} iconClassName="h-[15px] w-[15px]" />
                  {count > 0 ? (
                    <span className="rounded-full bg-primary-soft px-1.5 text-[10.5px] font-semibold tabular-nums text-primary">{count}</span>
                  ) : null}
                  {active && <TabStripIndicator layoutId="copy-group-tab-indicator" />}
                </button>
              );
            })}
            <TabStripBaseline />
          </div>
        </nav>

        <ChipRow
          label={`Secciones de ${COPY_SECTION_GROUPS[activeGroup]}`}
          items={navItems(activeGroup).map((item) => ({ id: item.target, label: item.label, count: item.count }))}
          activeId={activeTarget}
          onSelect={(id) => selectTarget(id as SectionTarget)}
        />

        {activeTarget === HERO_TARGET
          ? renderHero()
          : activeTarget === SPOTLIGHT_TARGET
            ? renderSpotlight()
            : renderSection(activeTarget)}
      </div>
    </div>
  );

  function renderHero() {
    const order = heroOrder;
    const activeId = order.includes(activeSlideId ?? "") ? activeSlideId : order[0];
    const hidden = studioIds.filter((id) => !order.includes(id));
    const isFull = order.length >= HERO_SLIDES_MAX;

    return (
      <section className={dashboardUi.card}>
        <div className={dashboardUi.cardHeader}>
          <div className="min-w-0">
            <h3 className={dashboardUi.sectionTitle}>Hero</h3>
            <p className={dashboardUi.sectionDescription}>
              Las diapositivas grandes del inicio, que van rotando. Podés tener hasta {HERO_SLIDES_MAX}: agregá, quitá y
              ordenalas acá; la foto, los textos y los productos de cada una se editan abajo.
            </p>
          </div>
          {heroCount > 0 ? <Badge tone="info">{customizedLabel(heroCount)}</Badge> : null}
        </div>

        <div className={cn(dashboardUi.cardBody, "grid gap-5")}>
          <div className="grid gap-2.5 rounded-xl border border-border p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[12.5px] font-semibold text-text-primary">
                Diapositivas{" "}
                <span className="font-normal tabular-nums text-text-secondary">
                  {order.length}/{HERO_SLIDES_MAX}
                </span>
              </p>
              {state.draft.heroSlideOrder ? (
                <Badge tone="info">Elegidas en el panel</Badge>
              ) : (
                <Badge>Las de Studio</Badge>
              )}
            </div>

            <ol className="grid gap-1.5">
              {order.map((id, index) => {
                const base = slideBase(id);
                const corrections = state.draft.heroSlides[id] ?? {};
                const imageUrl = effectiveImageUrl(base.imageUrl, corrections.image);
                const title = corrections.title?.trim() || base.texts.title;

                return (
                  <li key={id} className="flex items-center gap-2.5 rounded-lg border border-border bg-surface px-2 py-1.5">
                    <span className="w-4 text-center text-[11px] tabular-nums text-text-secondary">{index + 1}</span>
                    <span
                      style={imageUrl ? undefined : previewStyle(tokens)}
                      className={cn(
                        "block h-9 w-14 shrink-0 overflow-hidden rounded-md border border-border",
                        !imageUrl && SURFACE_SWATCHES[corrections.surface ?? base.surface],
                      )}
                    >
                      {imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- small admin thumbnail from the Sanity CDN
                        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                      ) : null}
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveSlideId(id)}
                      className="min-w-0 flex-1 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                    >
                      <span className={cn("block truncate text-[12.5px]", title ? "text-text-primary" : "italic text-danger")}>
                        {title || "Sin título todavía"}
                      </span>
                      <span className="text-[11px] text-text-secondary">
                        {corrections.custom ? "Creada en el panel" : "De Studio"}
                      </span>
                    </button>
                    <SlideIconButton label="Subir" disabled={isPending || index === 0} onClick={() => dispatch({ type: "moveHeroSlide", slideId: id, offset: -1, studioIds })}>
                      ↑
                    </SlideIconButton>
                    <SlideIconButton
                      label="Bajar"
                      disabled={isPending || index === order.length - 1}
                      onClick={() => dispatch({ type: "moveHeroSlide", slideId: id, offset: 1, studioIds })}
                    >
                      ↓
                    </SlideIconButton>
                    <SlideIconButton
                      label={corrections.custom ? "Eliminar diapositiva" : "Ocultar diapositiva"}
                      disabled={isPending || order.length <= 1}
                      onClick={() => dispatch({ type: "removeHeroSlide", slideId: id, studioIds })}
                    >
                      ✕
                    </SlideIconButton>
                  </li>
                );
              })}
            </ol>

            {hidden.length > 0 ? (
              <div className="grid gap-1.5 pt-1">
                <p className="text-[11px] text-text-secondary">Ocultas (cargadas en Studio):</p>
                {hidden.map((id) => (
                  <div key={id} className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-border px-2.5 py-1.5">
                    <span className="truncate text-[12px] text-text-secondary">{slideBase(id).texts.title || id}</span>
                    <ActionButton disabled={isPending || isFull} onClick={() => dispatch({ type: "showHeroSlide", slideId: id, studioIds })}>
                      Mostrar
                    </ActionButton>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2 pt-1">
              <ActionButton
                tone="primary"
                disabled={isPending || isFull}
                onClick={() => {
                  const id = newHeroSlideId();
                  dispatch({ type: "addHeroSlide", id, studioIds });
                  setActiveSlideId(id);
                }}
              >
                {isFull ? `Máximo ${HERO_SLIDES_MAX} diapositivas` : "+ Agregar diapositiva"}
              </ActionButton>
              {state.draft.heroSlideOrder ? (
                <ActionButton disabled={isPending} onClick={() => dispatch({ type: "resetHeroSlides" })}>
                  Volver a las diapositivas de Studio
                </ActionButton>
              ) : null}
            </div>
          </div>

          {order.length > 1 ? (
            <ChipRow
              label="Diapositiva a editar"
              items={order.map((id, index) => ({
                id,
                label: `Diapositiva ${index + 1}`,
                count: heroCorrectionCount(state.draft, id),
              }))}
              activeId={activeId}
              onSelect={setActiveSlideId}
              size="sm"
            />
          ) : null}

          {activeId ? renderSlide(slideBase(activeId)) : (
            <p className="text-[12.5px] leading-5 text-text-secondary">No se pudieron leer las diapositivas del inicio.</p>
          )}
        </div>
      </section>
    );
  }

  function renderSlide(slide: HeroSlideBase) {
    const corrections = state.draft.heroSlides[slide.id] ?? {};
    const effectiveTexts = Object.fromEntries(
      HERO_SLIDE_TEXT_KEYS.map((key) => [key, corrections[key]?.trim() || slide.texts[key]]),
    ) as HeroSlideTexts;

    const surface = corrections.surface ?? slide.surface;

    return (
      <div key={slide.id} className="grid gap-4">
        {corrections.custom ? (
          <p className="rounded-xl border border-primary/20 bg-primary-soft px-3.5 py-2.5 text-[12px] leading-5 text-text-primary">
            Diapositiva nueva: escribile al menos un título. Sin productos elegidos, muestra dos al azar como las demás.
          </p>
        ) : null}

        <div className="grid gap-2">
          <p className="text-[12px] text-text-primary">
            <span className="font-medium">Color del panel</span>{" "}
            <span className="text-text-secondary">· se ve cuando la diapositiva no tiene foto.</span>
          </p>
          <div role="radiogroup" aria-label="Color del panel" className="flex flex-wrap gap-2">
            {(Object.keys(HERO_SURFACES) as HeroSurfaceId[]).map((id) => {
              const active = surface === id;

              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={isPending}
                  onClick={() => dispatch({ type: "setHeroSurface", slideId: slide.id, surface: id === slide.surface && !corrections.custom ? null : id })}
                  className={cn(
                    "inline-flex h-8 items-center gap-2 rounded-full border px-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                    active ? "border-primary/50 bg-primary-soft" : "border-border bg-surface hover:bg-surface-elevated",
                  )}
                >
                  <span style={previewStyle(tokens)} className={cn("h-4 w-4 rounded-full border border-black/10", SURFACE_SWATCHES[id])} />
                  <span className={cn("text-[12px] font-medium", active ? "text-primary" : "text-text-secondary")}>{HERO_SURFACES[id]}</span>
                </button>
              );
            })}
          </div>
        </div>

        <PhotoControl
          label="Foto de la diapositiva"
          originalImageUrl={slide.imageUrl}
          choice={corrections.image}
          framing={corrections.imageFraming}
          frames={FRAMES.hero}
          onFramingChange={(framing) => dispatch({ type: "setHeroFraming", slideId: slide.id, framing })}
          disabled={isPending || !data.canWrite}
          onChange={(image) => dispatch({ type: "setHeroImage", slideId: slide.id, image })}
        />

        <div className="grid grid-cols-1 gap-x-4 gap-y-4 md:grid-cols-2">
          {HERO_SLIDE_TEXT_KEYS.map((key) => {
            const field = HERO_SLIDE_FIELDS[key];

            return (
              <div key={key} className={fieldSpan(field)}>
                <CopyField
                  field={field}
                  value={corrections[key] ?? slide.texts[key]}
                  original={slide.texts[key]}
                  disabled={isPending}
                  onChange={(value) => dispatch({ type: "setHeroField", slideId: slide.id, key, value, base: slide.texts[key] })}
                  onReset={() => dispatch({ type: "resetHeroField", slideId: slide.id, key })}
                />
              </div>
            );
          })}
        </div>

        <ProductPicker
          label="Productos de la derecha"
          description="Las dos fotos de productos al lado del panel."
          automaticNote={HERO_AUTOMATIC_NOTE}
          max={HERO_PRODUCTS_MAX}
          picked={corrections.products}
          automatic={slide.automaticProducts}
          products={productCache}
          disabled={isPending}
          onChange={(products) => dispatch({ type: "setHeroProducts", slideId: slide.id, products })}
          onDiscover={rememberProducts}
        />

        <HeroSlidePreview
          texts={effectiveTexts}
          imageUrl={effectiveImageUrl(slide.imageUrl, corrections.image)}
          surface={surface}
          framing={corrections.imageFraming}
          products={(corrections.products ?? slide.automaticProducts)
            .map((id) => productCache[id])
            .filter((product): product is ProductSummary => Boolean(product))}
          tokens={tokens}
        />
      </div>
    );
  }

  function renderListPicker(list: ProductListId) {
    return (
      <ProductPicker
        label={PRODUCT_LISTS[list].label}
        description={PRODUCT_LISTS[list].description}
        automaticNote={`Automático: ${PRODUCT_LISTS[list].automatic}`}
        max={PRODUCT_LISTS[list].max}
        picked={state.draft.productLists[list]}
        automatic={data.automaticProducts[list]}
        products={productCache}
        disabled={isPending}
        onChange={(products) => dispatch({ type: "setProductList", list, products })}
        onDiscover={rememberProducts}
      />
    );
  }

  function renderSpotlight() {
    const list = PRODUCT_LISTS.spotlight;

    return (
      <section className={dashboardUi.card}>
        <div className={dashboardUi.cardHeader}>
          <div className="min-w-0">
            <h3 className={dashboardUi.sectionTitle}>{list.label}</h3>
            <p className={dashboardUi.sectionDescription}>{list.description}</p>
          </div>
          {listCount("spotlight") > 0 ? <Badge tone="info">Elegidos a mano</Badge> : null}
        </div>

        <div className={cn(dashboardUi.cardBody, "grid gap-5")}>
          {renderListPicker("spotlight")}
          <SpotlightPreview products={listProducts("spotlight")} tokens={tokens} />
        </div>
      </section>
    );
  }

  function renderSection(section: StorefrontCopySectionId) {
    const definition = STOREFRONT_COPY_SECTIONS[section];
    const count = customizedCount(state.draft, section);

    return (
      <section key={section} className={dashboardUi.card}>
        <div className={dashboardUi.cardHeader}>
          <div className="min-w-0">
            <h3 className={dashboardUi.sectionTitle}>{definition.label}</h3>
            <p className={dashboardUi.sectionDescription}>{definition.description}</p>
          </div>
          {count > 0 ? <Badge tone="info">{customizedLabel(count)}</Badge> : null}
        </div>

        <div className={cn(dashboardUi.cardBody, "grid gap-5")}>
          <div className="grid grid-cols-1 gap-x-4 gap-y-4 md:grid-cols-2">
            {sectionFields(section).map(([key, field]) => (
              <div key={key} className={fieldSpan(field)}>
                <CopyField
                  field={field}
                  value={fieldValue(state.draft, section, key)}
                  original={field.default}
                  disabled={isPending}
                  onChange={(value) => dispatch({ type: "setField", section, key, value })}
                  onReset={() => dispatch({ type: "resetField", section, key })}
                />
              </div>
            ))}
          </div>

          {SECTION_IMAGE_IDS.filter((id) => SECTION_IMAGES[id].section === section).map((id) => {
            const assetRef = state.draft.images[id];

            return (
              <PhotoControl
                key={id}
                label={SECTION_IMAGES[id].label}
                originalImageUrl={SECTION_IMAGES[id].default}
                originalLabel="La foto original de la tienda."
                restoreLabel="Volver a la foto original"
                allowRemove={false}
                choice={assetRef ? { assetRef } : undefined}
                framing={state.draft.imageFraming[id]}
                frames={FRAMES[SECTION_IMAGES[id].section]}
                onFramingChange={(framing) => dispatch({ type: "setSectionFraming", id, framing })}
                disabled={isPending || !data.canWrite}
                onChange={(image) =>
                  dispatch({ type: "setSectionImage", id, assetRef: image && image !== "removed" ? image.assetRef : null })
                }
              />
            );
          })}

          {SECTION_PRODUCT_LIST[section] ? renderListPicker(SECTION_PRODUCT_LIST[section]) : null}

          <SectionPreview
            section={section}
            copy={previewCopy}
            products={{ featured: listProducts("featured"), offers: listProducts("offers") }}
            tokens={tokens}
          />
        </div>
      </section>
    );
  }
}
