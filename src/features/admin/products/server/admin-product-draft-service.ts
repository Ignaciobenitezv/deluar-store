import "server-only";

import { revalidatePath } from "next/cache";
import groq from "groq";
import { logger } from "@/lib/logger";
import { sanityAdminEditFetch, sanityFreshFetch } from "@/integrations/sanity/client";
import { adminProductDetailQuery } from "@/integrations/sanity/admin-queries";
import { getAdminProductsWriteClient } from "./admin-products-write-client";
import { normalizeProductDetail } from "./admin-product-detail-service";
import { adminProductDetailBlocksSchema, parseAdminProductDetailDescription } from "../validation/detail-product";
import { normalizeAdminProductLogistics } from "../validation/product-logistics";
import { toDraftId } from "../lib/product-draft-id";
import type { AdminProductFinalizeFormValues } from "../validation/detail-product";
import type { AdminProductDetailData } from "../types";

export class AdminProductSlugTakenError extends Error {
  constructor(readonly slug: string) {
    super(`Ya existe un producto con la URL "${slug}".`);
    this.name = "AdminProductSlugTakenError";
  }
}

export class AdminProductCategoryMissingError extends Error {
  constructor() {
    super("La categoría elegida ya no existe.");
    this.name = "AdminProductCategoryMissingError";
  }
}

export class AdminProductDraftNotFoundError extends Error {
  constructor() {
    super("No encontramos el borrador para finalizar.");
    this.name = "AdminProductDraftNotFoundError";
  }
}

export class AdminProductDraftConflictError extends Error {
  constructor() {
    super("El borrador cambió en otra pestaña. Recargá la página antes de continuar.");
    this.name = "AdminProductDraftConflictError";
  }
}

export class AdminProductUnreadableError extends Error {
  constructor() {
    super("No pudimos leer el producto de vuelta.");
    this.name = "AdminProductUnreadableError";
  }
}

const categoryExistsQuery = groq`count(*[_type == "category" && _id == $categoryId]) > 0`;
const subcategoryExistsQuery = groq`count(*[_type == "subcategory" && _id == $subcategoryId]) > 0`;

function buildPortableTextPayload(rawValue: string) {
  const blocks = parseAdminProductDetailDescription(rawValue);
  return adminProductDetailBlocksSchema.parse(blocks);
}

type RawProductDoc = {
  _id: string;
  _rev: string;
  images?: unknown;
  variants?: unknown;
  colorVariants?: unknown;
};

/**
 * Creates the draft document Crear producto opens with — called once,
 * client-side, from a `useEffect` on mount (never from the page's Server
 * Component, which Next.js's `<Link prefetch>` would otherwise invoke just
 * from a hover, silently seeding a draft nobody asked for).
 *
 * `createIfNotExists` is the whole idempotency story: the caller passes a
 * `publishedId` it generated once (stable across React Strict Mode's
 * double-invoke, Fast Refresh, or an accidental retry) and this always
 * either creates that exact draft or finds it already there — never two.
 * Every field below is a placeholder the real form overwrites before
 * finalizing; Sanity's schema-level `required()` rules are Studio-only UX
 * guards and don't block writing a document that doesn't satisfy them yet.
 */
export async function initializeProductDraft(publishedId: string): Promise<AdminProductDetailData> {
  const writeClient = getAdminProductsWriteClient();
  const draftId = toDraftId(publishedId);

  await writeClient.createIfNotExists({
    _id: draftId,
    _type: "product",
    title: "",
    // A UUID-shaped placeholder slug is collision-proof by construction —
    // the real slug (derived from the title, or edited by hand) overwrites
    // it the moment the admin saves Información, long before finalizing.
    slug: { _type: "slug", current: publishedId },
    shortDescription: "",
    description: [],
    basePrice: 0,
    stock: 0,
    images: [],
    isActive: false,
    isFeatured: false,
    isOnOffer: false,
    showInNewIn: false,
  });

  const resolved = await sanityAdminEditFetch<unknown>(adminProductDetailQuery, { productId: publishedId });

  if (!resolved) {
    throw new AdminProductUnreadableError();
  }

  return { ...normalizeProductDetail(resolved as never), id: publishedId };
}

/** Explicit Cancelar: the one abandonment path this task implements. Closing
 * the tab / navigating away without cancelling leaves the draft orphaned —
 * invisible everywhere, no scheduled cleanup — a deliberate, deferred
 * decision, not an oversight. */
export async function cancelProductDraft(publishedId: string): Promise<void> {
  const writeClient = getAdminProductsWriteClient();
  await writeClient.delete(toDraftId(publishedId));
  logger.info("admin.product.draft_cancelled", { publishedId });
}

export type FinalizeProductDraftInput = {
  publishedId: string;
  rev: string;
  values: AdminProductFinalizeFormValues;
};

/**
 * "Crear producto" while still a draft. Validates against the same rules a
 * normal edit already enforces, persists whatever's pending on the form,
 * then atomically publishes: `createOrReplace` the clean-id document +
 * `delete` the draft, in one transaction — either both happen or neither
 * does, so a mid-flight failure can never leave a published doc with its
 * draft counterpart still lingering (or vice versa).
 *
 * The published document is built field-by-field from validated `values`
 * plus `images`/`variants`/`colorVariants` copied from the current draft —
 * never a spread of the raw draft document, so Sanity system metadata
 * (`_rev`, `_createdAt`, `_updatedAt`) never leaks into the new doc; those
 * are assigned fresh by Sanity on `createOrReplace`.
 */
export async function finalizeProductDraft(input: FinalizeProductDraftInput): Promise<AdminProductDetailData> {
  const { publishedId, rev, values } = input;
  const writeClient = getAdminProductsWriteClient();

  const [slugTaken, categoryExists, currentRaw] = await Promise.all([
    sanityAdminEditFetch<boolean>(
      groq`count(*[_type == "product" && slug.current == $slug && !(_id in [$publishedId, "drafts." + $publishedId])]) > 0`,
      { slug: values.slug, publishedId },
    ),
    sanityAdminEditFetch<boolean>(categoryExistsQuery, { categoryId: values.categoryId }),
    sanityAdminEditFetch<RawProductDoc | null>(adminProductDetailQuery, { productId: publishedId }),
  ]);

  if (slugTaken) {
    throw new AdminProductSlugTakenError(values.slug);
  }

  if (!categoryExists) {
    throw new AdminProductCategoryMissingError();
  }

  if (!currentRaw) {
    throw new AdminProductDraftNotFoundError();
  }

  if (currentRaw._rev !== rev) {
    throw new AdminProductDraftConflictError();
  }

  const subcategoryId = values.subcategoryId?.trim();
  const keepSubcategory =
    subcategoryId && subcategoryId.length > 0
      ? await sanityAdminEditFetch<boolean>(subcategoryExistsQuery, { subcategoryId })
      : false;

  const logistics = normalizeAdminProductLogistics({
    weightGrams: values.weightGrams,
    heightCm: values.heightCm,
    widthCm: values.widthCm,
    depthCm: values.depthCm,
  });

  const seoTitle = values.seoTitle?.trim();
  const seoDescription = values.seoDescription?.trim();

  const finalDocument = {
    _type: "product" as const,
    _id: publishedId,
    // Carried over from the draft as-is — Galería/Variantes already
    // persisted these independently, this finalize step never touches them.
    images: currentRaw.images ?? [],
    ...(currentRaw.variants !== undefined ? { variants: currentRaw.variants } : {}),
    ...(currentRaw.colorVariants !== undefined ? { colorVariants: currentRaw.colorVariants } : {}),
    title: values.title,
    slug: { _type: "slug" as const, current: values.slug },
    category: { _type: "reference" as const, _ref: values.categoryId },
    ...(keepSubcategory ? { subcategory: { _type: "reference" as const, _ref: subcategoryId } } : {}),
    shortDescription: values.shortDescription,
    description: buildPortableTextPayload(values.descriptionJson),
    basePrice: values.basePrice,
    ...(typeof values.transferPrice === "number" ? { transferPrice: values.transferPrice } : {}),
    stock: values.stock,
    isActive: values.isActive,
    isFeatured: values.isFeatured,
    isOnOffer: values.isOnOffer,
    showInNewIn: values.showInNewIn,
    ...(values.showInNewIn && typeof values.newInOrder === "number" ? { newInOrder: values.newInOrder } : {}),
    ...(logistics ? { logistics } : {}),
    ...(seoTitle || seoDescription
      ? { seo: { ...(seoTitle ? { title: seoTitle } : {}), ...(seoDescription ? { description: seoDescription } : {}) } }
      : {}),
  };

  await writeClient.transaction().createOrReplace(finalDocument).delete(toDraftId(publishedId)).commit();

  logger.info("admin.product.draft_finalized", { publishedId });

  revalidatePath("/admin/productos");
  revalidatePath(`/admin/productos/${publishedId}`);
  revalidatePath("/productos");
  revalidatePath("/");
  revalidatePath(`/productos/detalle/${values.slug}`);

  const resolved = await sanityFreshFetch<unknown>(adminProductDetailQuery, { productId: publishedId });

  if (!resolved) {
    throw new AdminProductUnreadableError();
  }

  return { ...normalizeProductDetail(resolved as never), id: publishedId };
}
