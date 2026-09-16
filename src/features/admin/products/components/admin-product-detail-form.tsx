"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  startTransition,
  useActionState,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { updateProductDetailAction } from "../actions/update-product-detail-action";
import { finalizeProductDraftAction } from "../actions/finalize-product-draft-action";
import { initializeProductDraftAction } from "../actions/initialize-product-draft-action";
import { cancelProductDraftAction } from "../actions/cancel-product-draft-action";
import { AdminProductImagesSection } from "./admin-product-images-section";
import { AdminProductVariantsSection } from "./admin-product-variants-section";
import { AdminProductDeleteDialog } from "./admin-product-delete-dialog";
import {
  ProductEditTabBar,
  ProductInfoTabContent,
  ProductPricingTabContent,
  ProductShippingTabContent,
  ProductSeoTabContent,
  ProductPreviewTabContent,
  createEmptyDetailDraft,
  inputClass,
  labelClass,
  sectionHeadingClass,
  sectionNoteClass,
  type DetailDraft,
  type ProductEditTabId,
} from "./admin-product-tab-content";
import { dashboardUi } from "@/features/admin/dashboard/lib/dashboard-ui";
import { createProductLogisticsDraft } from "@/features/catalog/logistics";
import { cn } from "@/lib/utils";
import { normalizeAdminProductSlug } from "../lib/product-slug";
import { logger } from "@/lib/logger";
import { useAdminProductRevision } from "../context/admin-product-revision-context";
import type {
  AdminProductCategoryNode,
  AdminProductDetailActionState,
  AdminProductDetailData,
  AdminProductImageData,
} from "../types";
import type { AdminProductVariantData } from "../lib/variant-editor";

const UPDATE_INITIAL_STATE: AdminProductDetailActionState = { status: "idle" };
const FINALIZE_INITIAL_STATE: AdminProductDetailActionState = { status: "idle" };

/** Every visible field in the tabs below is submitted through this one form,
 * even though several of them (Multimedia, Organización, Visibilidad y
 * merchandising, Stock base) don't sit inside its DOM subtree — Multimedia's
 * own alt-text input would otherwise inherit this form as its nearest
 * ancestor and hijack Enter-to-submit, and Variantes renders its own real
 * `<form>` elements per row, which HTML forbids nesting. The `form="..."`
 * attribute (set on every field below) associates them with this id instead
 * of relying on DOM position — standard HTML, and it's what lets Multimedia
 * sit visually between "Información básica" and "Organización" without
 * being part of this form's submission at all. */
const FORM_ID = "product-detail-form";

type AdminProductDetailFormProps = {
  /** Non-null and immutable for Editar producto. Always `null` for Crear
   * producto — that screen seeds its own draft client-side moments after
   * mounting; see the `mode === "create"` branch below. */
  product: AdminProductDetailData | null;
  categoryTree: AdminProductCategoryNode[];
  mode: "create" | "edit";
};

type AdminProductDetailFormFieldsProps = {
  product: AdminProductDetailData;
  categoryTree: AdminProductCategoryNode[];
  currentRev: string;
  state: AdminProductDetailActionState;
  formAction: (formData: FormData) => void;
  pending: boolean;
  /** True from the moment a draft is seeded until "Crear producto" finalizes
   * it — never derived from the route, never cached, just this flag. */
  isDraftPhase: boolean;
  onCancelDraft?: () => void;
  cancellingDraft?: boolean;
  onImagesSaved?: (images: AdminProductImageData[]) => void;
  onVariantsSaved?: (result: {
    variants: AdminProductVariantData[];
    variantSource: "variants" | "colorVariants" | null;
    legacyColorVariantCount: number;
  }) => void;
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

function createDetailDraft(product: AdminProductDetailData): DetailDraft {
  const logisticsDraft = createProductLogisticsDraft(product.logistics);
  const empty = createEmptyDetailDraft();

  // A fresh Crear producto draft is seeded (initializeProductDraft) with
  // `slug.current` set to the draft's own internal id — a collision-proof
  // placeholder, never meant to be shown. `product.slug === product.id`
  // only ever happens for that untouched placeholder (a real, human-typed
  // slug never coincides with the document's own UUID), so that's the
  // signal to start the visible field empty instead.
  const isPlaceholderSlug = product.slug === product.id;

  return {
    ...empty,
    title: product.title,
    slug: isPlaceholderSlug ? "" : product.slug,
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

  const stock = Number(draft.stock);
  if (Number.isFinite(stock) && stock !== baseline.stock) {
    delta.stock = stock;
    changedFields.add("stock");
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

/**
 * Shown once, right after `finalizeProductDraftAction` succeeds, instead of
 * silently turning this same screen into the edit view. `product` is exactly
 * `finalizeState.product` — the server's own response — never a second,
 * separately-tracked copy of the id/slug/title.
 *
 * "Crear otro producto" is a plain `<a>`, not `<Link>`/`router.push`: this
 * screen's address bar never leaves `/admin/productos/nuevo` (see the effect
 * above — it deliberately no longer rewrites the URL), so a client-side
 * navigation back to that exact same path risks being treated as a no-op
 * and reusing this exact component instance — the one thing a fresh draft
 * can't do. A real anchor forces a full navigation, guaranteeing a brand
 * new `crypto.randomUUID()` draft id every time.
 */
function ProductCreateSuccessScreen({ product }: { product: AdminProductDetailData }) {
  return (
    <div className={cn(dashboardUi.card, "flex flex-col items-center gap-6 px-6 py-12 text-center sm:px-10 sm:py-16")}>
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[var(--admin-success)]/25 bg-[var(--admin-success)]/10 text-[color:var(--admin-success)]">
        <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <div className="grid gap-2">
        <h2 className="text-xl font-semibold tracking-[-0.02em] text-text-primary sm:text-2xl">Producto creado correctamente</h2>
        <p className="text-base font-medium text-text-primary">{product.title}</p>
        <p className="text-sm text-text-secondary">Ya fue agregado al catálogo.</p>
      </div>

      <div className="grid w-full max-w-sm gap-3">
        {/* Deliberately a raw anchor, not <Link> — see the doc comment above
            this component for why a client-side push here risks reusing
            this same draft instead of starting a new one. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/admin/productos/nuevo"
          className={cn("inline-flex h-12 w-full items-center justify-center rounded-full border px-6 text-sm font-semibold", dashboardUi.primaryAction)}
        >
          Crear otro producto
        </a>

        <Link
          href={`/admin/productos/${product.id}`}
          className="inline-flex h-12 w-full items-center justify-center rounded-full border border-border bg-surface px-6 text-sm font-semibold text-text-primary transition hover:bg-surface-elevated"
        >
          Editar producto
        </Link>

        <div className="mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm">
          {product.visible ? (
            <Link
              href={`/productos/detalle/${product.slug}`}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-text-secondary underline-offset-4 hover:text-text-primary hover:underline"
            >
              Ver producto
            </Link>
          ) : null}
          <Link
            href="/admin/productos"
            className="font-medium text-text-secondary underline-offset-4 hover:text-text-primary hover:underline"
          >
            Volver a productos
          </Link>
        </div>
      </div>
    </div>
  );
}

export function AdminProductDetailForm({ product: initialProduct, categoryTree, mode }: AdminProductDetailFormProps) {
  const { applyCommit, currentRev } = useAdminProductRevision();
  const router = useRouter();

  const [updateState, updateFormAction, updatePending] = useActionState(updateProductDetailAction, UPDATE_INITIAL_STATE);
  const [finalizeState, finalizeFormAction, finalizePending] = useActionState(
    finalizeProductDraftAction,
    FINALIZE_INITIAL_STATE,
  );

  // Stable across Strict Mode's double-render, Fast Refresh, and any
  // accidental retry — this is the identity the seed effect below hands to
  // `initializeProductDraftAction`, which itself is idempotent
  // (`createIfNotExists`) against it. One mount of this screen = one draft,
  // guaranteed at both layers.
  const [generatedId] = useState(() => crypto.randomUUID());
  const [draftProduct, setDraftProduct] = useState<AdminProductDetailData | null>(null);
  const [draftInitError, setDraftInitError] = useState<string | null>(null);
  const [draftInitAttempt, setDraftInitAttempt] = useState(0);
  const [cancellingDraft, setCancellingDraft] = useState(false);
  const seedStartedForAttemptRef = useRef(-1);

  useEffect(() => {
    if (mode !== "create" || seedStartedForAttemptRef.current === draftInitAttempt) {
      return;
    }

    // BUG THIS FIXES: the previous version paired this ref guard with a
    // per-invocation `cancelled` closure set in the cleanup function. React
    // Strict Mode (dev only) runs every effect mount → cleanup → mount once
    // to catch exactly this kind of bug. That cleanup flipped `cancelled`
    // to true on the *first* (real) invocation before its fetch resolved;
    // when the fetch then finished, `if (cancelled) return` threw the
    // result away. The *second* invocation's effect body saw the ref
    // already pointed at this same attempt number and exited immediately
    // without starting a replacement call. Net result: no invocation ever
    // reached `setDraftProduct` — permanently stuck on "Preparando
    // borrador…", with no error either, since the result wasn't dropped
    // because it failed, it was dropped because it *succeeded* after being
    // told not to bother.
    //
    // Fix: don't tie "should this result still apply" to which effect
    // *instance* is unmounting — tie it to which *attempt number* is still
    // current, read from the same ref the guard above already uses. Strict
    // Mode's extra mount/cleanup cycle never changes `draftInitAttempt`, so
    // the one real network call's result is still applied when it resolves.
    // An actual "Reintentar" click *does* bump `draftInitAttempt`, which
    // correctly makes any older in-flight call's result a no-op instead.
    const attemptAtStart = draftInitAttempt;
    seedStartedForAttemptRef.current = attemptAtStart;

    (async () => {
      const result = await initializeProductDraftAction(generatedId);

      if (seedStartedForAttemptRef.current !== attemptAtStart) {
        // A newer "Reintentar" attempt superseded this one — let its own
        // result win instead.
        return;
      }

      if (result.status === "success") {
        setDraftInitError(null);
        setDraftProduct(result.product);
        applyCommit({ source: "detail", rev: result.product.rev, updatedAt: result.product.updatedAt });
      } else {
        setDraftInitError(result.message);
      }
    })();
  }, [mode, generatedId, draftInitAttempt, applyCommit]);

  const [finalizedProduct, setFinalizedProduct] = useState<AdminProductDetailData | null>(null);

  // "Crear producto" succeeding shows ProductCreateSuccessScreen in this
  // same tree (see the render branch below) — it never silently turns this
  // screen into the edit view, so the URL is deliberately left alone here.
  //
  // BUG THIS FIXES: this effect used to also call
  // `window.history.replaceState(null, "", "/admin/productos/<id>")`.
  // `finalizeProductDraft` calls `revalidatePath(...)` inside the server
  // action, and Next's own action-response handling
  // (node_modules/next/dist/client/components/router-reducer/reducers/server-action-reducer.js)
  // reacts to that by automatically re-navigating to whatever URL *it*
  // currently believes is canonical (its own router state, tracked
  // independently of the address bar) to apply fresh Flight data — normally
  // still `/admin/productos/nuevo`, which is harmless. But firing a manual
  // `history.replaceState` to `/admin/productos/<id>` in the same instant
  // left the browser's address bar and Next's internal router state
  // disagreeing about the current route. Next's post-action navigation can
  // reconcile against the address bar and fall through to fetching
  // `/admin/productos/<id>` for real — which hits `[productId]/page.tsx`'s
  // `notFound()` if that fetch loses any race with the just-committed
  // write, surfacing the storefront's root not-found page while the address
  // bar (rewritten by our own call) still read `/admin/productos/<id>`.
  // Never mutating the URL here removes that race entirely.
  useLayoutEffect(() => {
    if (finalizeState.status !== "success") {
      return;
    }

    setFinalizedProduct(finalizeState.product);
    applyCommit({ source: "detail", rev: finalizeState.product.rev, updatedAt: finalizeState.product.updatedAt });
    document.title = `Producto creado | ${finalizeState.product.title}`;
    // Fires exactly once per successful finalize.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalizeState]);

  const isDraftPhase = mode === "create" && finalizedProduct === null;
  const baseProduct = mode === "edit" ? initialProduct : (finalizedProduct ?? draftProduct);

  const committedRev = updateState.status === "success" ? updateState.rev : null;
  const committedUpdatedAt = updateState.status === "success" ? updateState.updatedAt : null;

  // Once there's a real, finalized document (edit mode from the start, or a
  // draft that just got published), a Guardar cambios save can race Galería
  // or Variantes' own independent saves — same merge Editar producto has
  // always used: prefer whichever side has the more recently persisted
  // `updatedAt`. During the draft phase this never applies (nothing submits
  // through `updateProductDetailAction` yet), so it's a no-op until then.
  const currentProduct = useMemo(() => {
    if (!baseProduct) {
      return null;
    }

    if (isDraftPhase || updateState.status !== "success") {
      return baseProduct;
    }

    const basePersistedAt = Date.parse(baseProduct.updatedAt);
    const statePersistedAt = Date.parse(updateState.product.updatedAt);

    if (Number.isFinite(basePersistedAt) && basePersistedAt > statePersistedAt) {
      return baseProduct;
    }

    return updateState.product;
  }, [baseProduct, isDraftPhase, updateState]);

  useLayoutEffect(() => {
    if (isDraftPhase || updateState.status !== "success" || !baseProduct) {
      return;
    }

    applyCommit({
      source: "detail",
      rev: committedRev ?? currentRev,
      updatedAt: committedUpdatedAt ?? baseProduct.updatedAt,
    });
  }, [applyCommit, baseProduct, committedRev, committedUpdatedAt, currentRev, isDraftPhase, updateState.status]);

  const handleImagesSaved = useCallback((images: AdminProductImageData[]) => {
    setDraftProduct((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        images,
        imageUrl: images[0]?.url ?? null,
        imageAlt: images[0]?.alt || current.title,
      };
    });
  }, []);

  const handleVariantsSaved = useCallback(
    (result: {
      variants: AdminProductVariantData[];
      variantSource: "variants" | "colorVariants" | null;
      legacyColorVariantCount: number;
    }) => {
      setDraftProduct((current) => {
        if (!current) {
          return current;
        }

        const variantCount = result.variants.length;

        return {
          ...current,
          variants: result.variants,
          variantSource: result.variantSource,
          legacyColorVariantCount: result.legacyColorVariantCount,
          variantCount,
          hasVariants: variantCount > 0,
          variantLabel: variantCount > 0 ? `${variantCount} variantes` : "Sin variantes",
        };
      });
    },
    [],
  );

  const handleCancelDraft = useCallback(async () => {
    if (!currentProduct || cancellingDraft) {
      return;
    }

    setCancellingDraft(true);
    await cancelProductDraftAction(currentProduct.id);
    router.push("/admin/productos");
  }, [currentProduct, cancellingDraft, router]);

  const handleRetryDraftInit = () => {
    setDraftInitError(null);
    setDraftInitAttempt((attempt) => attempt + 1);
  };

  if (mode === "create" && !currentProduct) {
    return (
      <div className="grid place-items-center gap-3 rounded-[22px] border border-border bg-surface px-6 py-16 text-center">
        {draftInitError ? (
          <>
            <p className="text-sm font-semibold text-[color:var(--admin-danger)]">{draftInitError}</p>
            <button
              type="button"
              onClick={handleRetryDraftInit}
              className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-text-primary transition hover:bg-surface-elevated"
            >
              Reintentar
            </button>
          </>
        ) : (
          <p className="text-sm text-text-secondary">Preparando borrador…</p>
        )}
      </div>
    );
  }

  if (!currentProduct) {
    return null;
  }

  // Finalize succeeded — show the confirmation screen instead of silently
  // flipping this same tab editor into "edit mode". `finalizeState.product`
  // is the real, server-returned document (`finalizeProductDraftAction`'s
  // success payload) — the only source of truth for the id/slug/title
  // shown here; nothing about this is separately tracked state.
  if (mode === "create" && finalizeState.status === "success") {
    return <ProductCreateSuccessScreen product={finalizeState.product} />;
  }

  return (
    <AdminProductDetailFormFields
      product={currentProduct}
      categoryTree={categoryTree}
      currentRev={currentRev}
      state={isDraftPhase ? finalizeState : updateState}
      formAction={isDraftPhase ? finalizeFormAction : updateFormAction}
      pending={isDraftPhase ? finalizePending : updatePending}
      isDraftPhase={isDraftPhase}
      onCancelDraft={isDraftPhase ? handleCancelDraft : undefined}
      cancellingDraft={cancellingDraft}
      onImagesSaved={isDraftPhase ? handleImagesSaved : undefined}
      onVariantsSaved={isDraftPhase ? handleVariantsSaved : undefined}
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
  isDraftPhase,
  onCancelDraft,
  cancellingDraft,
  onImagesSaved,
  onVariantsSaved,
}: AdminProductDetailFormFieldsProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const baselineRef = useRef(product);
  const [draft, setDraft] = useState<DetailDraft>(() => createDetailDraft(product));
  const [activeTab, setActiveTab] = useState<ProductEditTabId>("info");
  const hasVariants = product.hasVariants;

  // This component used to remount on every successful save (`key={rev}` on
  // the caller), which reset `draft` to match the confirmed server state.
  // It no longer remounts — Multimedia and Variantes now render inside it
  // and each owns independent, possibly-unsaved state (a pending upload, an
  // open variant modal) that a save must never wipe. This effect reproduces
  // the same "resync after a confirmed save" behavior instead, without
  // tearing the subtree down — including the moment a draft finalizes,
  // which is, from here, just another revision change.
  useLayoutEffect(() => {
    baselineRef.current = product;
    setDraft(createDetailDraft(product));
    // Only when the confirmed revision actually changes — not on every
    // render, and not on the other fields the effect doesn't need to track.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.rev]);

  useEffect(() => {
    logger.debug("admin.products.detail.commercial_loaded", {
      isActive: product.visible,
      isFeatured: product.isFeatured,
      isOnOffer: product.isOnOffer,
      showInNewIn: product.showInNewIn,
      newInOrder: product.newInOrder,
      stock: product.stock,
    });
  }, [product]);

  const currentSlug = normalizeAdminProductSlug(draft.slug);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formElement = formRef.current ?? event.currentTarget;
    const formData = new FormData(formElement);

    if (isDraftPhase) {
      // Finalizing: every field submits as-is, no baseline to diff against —
      // the draft has never been "saved" from this form's point of view.
      startTransition(() => {
        formAction(formData);
      });
      return;
    }

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
    <div className="grid min-w-0 gap-4">
      {state.status !== "idle" ? (
        <div
          aria-live="polite"
          className={cn(
            "rounded-[22px] border px-4 py-3 text-sm",
            state.status === "success"
              ? "border-[var(--admin-success)]/25 bg-[var(--admin-success)]/10 text-[color:var(--admin-success)]"
              : state.status === "conflict"
                ? "border-[var(--admin-warning)]/25 bg-[var(--admin-warning)]/10 text-[color:var(--admin-warning)]"
                : "border-[var(--admin-danger)]/25 bg-[var(--admin-danger)]/10 text-[color:var(--admin-danger)]",
          )}
        >
          {state.message}
        </div>
      ) : null}

      {/* min-w-0: a CSS Grid item's automatic minimum size otherwise
          reflects its content's full intrinsic width unless the item
          itself has non-`visible` overflow — the tab bar's own
          `overflow-x-auto` lives two levels deeper (inside <nav>), so
          without this the 7-tab row's ~900-1100px width was bubbling up
          and stretching this entire grid (every card in the form) to
          match, regardless of viewport size. */}
      <div className={cn(dashboardUi.card, "min-w-0 px-1")}>
        <ProductEditTabBar activeTab={activeTab} onChange={setActiveTab} />
      </div>

      {/* The real form: invisible, holds only the two identity fields. Every
          other field below associates itself via form={FORM_ID}.
          noValidate: some of those fields (e.g. Alto/Ancho/Profundidad) now
          live in a tab that's hidden — and thus unfocusable — whenever a
          different tab is active. The browser's native constraint
          validation tries to focus the first invalid field before allowing
          submit; if that field is unfocusable it cancels the submit with no
          visible error at all. Validation itself is unchanged — every field
          still goes through the same server action and the same
          getFieldError()-driven inline messages already wired below. */}
      <form id={FORM_ID} ref={formRef} onSubmit={handleSubmit} noValidate className="hidden" aria-hidden>
        <input type="hidden" name="productId" value={product.id} />
        <input type="hidden" name="rev" value={currentRev} readOnly />
      </form>

      <div className="grid min-w-0 gap-4">
        <div className={cn(activeTab !== "info" && "hidden")}>
          <ProductInfoTabContent
            formId={FORM_ID}
            draft={draft}
            setDraft={setDraft}
            state={state}
            categoryTree={categoryTree}
            initialDescriptionBlocks={product.description}
            currentSlug={currentSlug}
          />
        </div>

        {/* ── Galería ─────────────────────────────────────────────── */}
        <div className={cn(dashboardUi.card, "overflow-hidden", activeTab !== "galeria" && "hidden")}>
          <div className="px-5 py-5 sm:px-6">
            <AdminProductImagesSection product={product} onSaved={onImagesSaved} />
          </div>
        </div>

        {/* ── Variantes y stock ───────────────────────────────────── */}
        <div className={cn(dashboardUi.card, "overflow-hidden", activeTab !== "variantes" && "hidden")}>
          <div className="px-5 py-5 sm:px-6">
            <h3 className={sectionHeadingClass}>Inventario</h3>
            <p className={sectionNoteClass}>
              {hasVariants
                ? "Stock del producto base — las variantes llevan su propio stock, independiente de este valor."
                : "Stock del producto. Si más adelante agregás variantes, cada una tendrá su propio stock."}
            </p>
            <div className="mt-4 max-w-xs">
              <label className={labelClass}>
                <span>{hasVariants ? "Stock del producto base" : "Stock"}</span>
                <input
                  form={FORM_ID}
                  type="number"
                  name="stock"
                  min={0}
                  step={1}
                  value={draft.stock}
                  onChange={(event) => setDraft((current) => ({ ...current, stock: event.target.value }))}
                  placeholder="Ej. 24"
                  className={inputClass}
                />
              </label>
            </div>
          </div>

          <div className="border-t border-border" />

          <div className="px-5 py-5 sm:px-6">
            <AdminProductVariantsSection product={product} onSaved={onVariantsSaved} />
          </div>
        </div>

        <div className={cn(activeTab !== "precios" && "hidden")}>
          <ProductPricingTabContent formId={FORM_ID} draft={draft} setDraft={setDraft} state={state} hasVariants={hasVariants} />
        </div>

        <div className={cn(activeTab !== "envio" && "hidden")}>
          <ProductShippingTabContent formId={FORM_ID} draft={draft} setDraft={setDraft} state={state} hasVariants={hasVariants} />
        </div>

        <div className={cn(activeTab !== "seo" && "hidden")}>
          <ProductSeoTabContent formId={FORM_ID} draft={draft} setDraft={setDraft} state={state} />
        </div>

        <div className={cn(activeTab !== "preview" && "hidden")}>
          <ProductPreviewTabContent product={product} isDraft={isDraftPhase} />
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-end">
        {isDraftPhase ? (
          <button
            type="button"
            onClick={onCancelDraft}
            disabled={cancellingDraft}
            className="rounded-full border border-border bg-surface px-5 py-3 text-sm font-semibold text-text-secondary transition hover:bg-surface-elevated disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cancellingDraft ? "Cancelando..." : "Cancelar"}
          </button>
        ) : (
          <Link
            href="/admin/productos"
            className="rounded-full border border-border bg-surface px-5 py-3 text-sm font-semibold text-text-secondary transition hover:bg-surface-elevated"
          >
            Cancelar / volver
          </Link>
        )}
        <button
          form={FORM_ID}
          type="submit"
          disabled={pending}
          className={cn(
            "rounded-full border px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-elevated disabled:text-text-secondary",
            dashboardUi.primaryAction,
          )}
        >
          {isDraftPhase ? (pending ? "Creando..." : "Crear producto") : pending ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>

      {/* "Eliminar producto" only exists once there's a real, published
          document to delete — never during Crear producto's draft phase.
          Subtle destructive border only (not a saturated red card) to read
          as its own zone without competing with Guardar cambios above. */}
      {!isDraftPhase ? (
        <div className="rounded-2xl border border-[var(--admin-danger)]/20 bg-surface px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-text-primary">Eliminar producto</h3>
              <p className="mt-1 text-sm text-text-secondary">
                Elimina definitivamente este producto y lo quita de la tienda.
              </p>
            </div>

            <AdminProductDeleteDialog
              productId={product.id}
              productTitle={product.title}
              rev={currentRev}
              triggerClassName="w-full shrink-0 sm:w-auto"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
