import "server-only";
import { unstable_cache } from "next/cache";
import { draftMode } from "next/headers";
import { cache } from "react";
import { DEFAULT_STOREFRONT_COPY, type StorefrontCopy } from "@/features/storefront-copy/fields";
import {
  STOREFRONT_COPY_DOCUMENT_ID,
  STOREFRONT_COPY_DRAFT_ID,
  resolveStorefrontCopy,
} from "@/features/storefront-copy/storefront-copy-document";
import { sanityAdminEditFetch, sanityFreshFetch } from "@/integrations/sanity/client";
import { storefrontCopyAdminQuery, storefrontCopyQuery } from "@/integrations/sanity/queries";
import { logger } from "@/lib/logger";

/** Cache tag of the published texts, for an on-demand updateTag on publish. */
export const STOREFRONT_COPY_CACHE_TAG = "storefront-copy";

// Same timing and rules as the theme (get-storefront-theme.ts): published
// perspective, no CDN, query pinned to the published _id, errors not cached.
const fetchPublishedCopyDocument = unstable_cache(
  () => sanityFreshFetch<unknown>(storefrontCopyQuery),
  ["storefront-copy-document"],
  { tags: [STOREFRONT_COPY_CACHE_TAG], revalidate: 60 },
);

export type StorefrontCopyResult = {
  copy: StorefrontCopy;
  /** Set only for an authorised admin previewing the saved draft. */
  preview?: { hasDraft: boolean };
};

/**
 * The saved draft, for an owner/admin in draft mode only (cookie set by
 * /api/admin/theme-preview AND a live admin session on this request), exactly
 * as the theme preview works.
 */
async function getDraftPreviewCopy(): Promise<StorefrontCopyResult | null> {
  if (!(await draftMode()).isEnabled) {
    return null;
  }

  const { hasBetterAuthAdminSession } = await import("@/features/admin/better-auth");

  if (!(await hasBetterAuthAdminSession())) {
    return null;
  }

  try {
    const documents = await sanityAdminEditFetch<{ _id: string }[]>(storefrontCopyAdminQuery, {
      publishedId: STOREFRONT_COPY_DOCUMENT_ID,
      draftId: STOREFRONT_COPY_DRAFT_ID,
    });
    const draft = documents.find((document) => document._id === STOREFRONT_COPY_DRAFT_ID) ?? null;
    const published = documents.find((document) => document._id === STOREFRONT_COPY_DOCUMENT_ID) ?? null;

    return { copy: resolveStorefrontCopy(draft ?? published), preview: { hasDraft: draft !== null } };
  } catch (error) {
    logger.warn("[copy] Draft preview unavailable", { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

/**
 * Every storefront text: the published `storefrontCopy` document over the
 * defaults in fields.ts (each field on its own), the defaults alone when
 * Sanity is unreachable, or the saved draft for an admin previewing it.
 * React.cache: one resolution per request.
 */
export const getStorefrontCopy = cache(async (): Promise<StorefrontCopyResult> => {
  const preview = await getDraftPreviewCopy();

  if (preview) {
    return preview;
  }

  try {
    return { copy: resolveStorefrontCopy(await fetchPublishedCopyDocument()) };
  } catch (error) {
    logger.warn("[copy] Sanity unavailable, rendering the default texts", {
      error: error instanceof Error ? error.message : String(error),
    });

    return { copy: DEFAULT_STOREFRONT_COPY };
  }
});
