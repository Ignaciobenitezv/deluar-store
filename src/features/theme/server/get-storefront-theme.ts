import "server-only";
import { unstable_cache } from "next/cache";
import { draftMode } from "next/headers";
import { cache } from "react";
import { DEFAULT_THEME_TOKENS } from "@/features/theme/default-theme";
import { DEFAULT_THEME_PRESET_ID } from "@/features/theme/presets";
import {
  STOREFRONT_THEME_DOCUMENT_ID,
  STOREFRONT_THEME_DRAFT_ID,
  resolveStorefrontTheme,
} from "@/features/theme/storefront-theme-document";
import type { StorefrontTheme } from "@/features/theme/types";
import { sanityAdminEditFetch, sanityFreshFetch } from "@/integrations/sanity/client";
import { storefrontThemeAdminQuery, storefrontThemeQuery } from "@/integrations/sanity/queries";
import { logger } from "@/lib/logger";

/** Cache tag of the published theme, for an on-demand revalidateTag on publish. */
export const STOREFRONT_THEME_CACHE_TAG = "storefront-theme";

/**
 * Seconds a published change can take to reach the storefront. It also turns
 * the otherwise fully static storefront routes (home, cart, checkout…) into
 * ISR routes regenerated at most this often, since they all render the theme.
 */
export const STOREFRONT_THEME_REVALIDATE_SECONDS = 60;

// Published perspective, no CDN (sanityFreshFetch), and a query pinned to the
// singleton's published _id: drafts never reach the storefront. Errors are not
// cached: they throw out of unstable_cache and the next request retries.
const fetchPublishedThemeDocument = unstable_cache(
  () => sanityFreshFetch<unknown>(storefrontThemeQuery),
  ["storefront-theme-document"],
  { tags: [STOREFRONT_THEME_CACHE_TAG], revalidate: STOREFRONT_THEME_REVALIDATE_SECONDS },
);

/**
 * Admin preview of the saved draft on the real storefront. Requires BOTH the
 * draft-mode cookie (only set by /api/admin/theme-preview after an admin
 * check) AND a live owner/admin session on this very request; anyone else,
 * including a copied cookie without a session, gets the published theme.
 * During prerender draftMode() is always off, so this never makes a static
 * route dynamic; with the cookie, Next renders the route per request for that
 * browser only, and nothing here is cached or shared.
 */
async function getDraftPreviewTheme(): Promise<StorefrontTheme | null> {
  if (!(await draftMode()).isEnabled) {
    return null;
  }

  const { hasBetterAuthAdminSession } = await import("@/features/admin/better-auth");

  if (!(await hasBetterAuthAdminSession())) {
    return null;
  }

  try {
    const documents = await sanityAdminEditFetch<{ _id: string }[]>(storefrontThemeAdminQuery, {
      publishedId: STOREFRONT_THEME_DOCUMENT_ID,
      draftId: STOREFRONT_THEME_DRAFT_ID,
    });
    const draft = documents.find((document) => document._id === STOREFRONT_THEME_DRAFT_ID) ?? null;
    const published = documents.find((document) => document._id === STOREFRONT_THEME_DOCUMENT_ID) ?? null;
    // Same rules as publishing: an unreadable draft is not shown (low contrast is only a warning).
    const draftTheme = draft ? resolveStorefrontTheme(draft) : null;
    const draftRejected = draftTheme?.source.kind === "fallback";
    const theme = draftTheme && !draftRejected ? draftTheme : resolveStorefrontTheme(published);

    return { ...theme, preview: { hasDraft: draft !== null, draftRejected } };
  } catch (error) {
    logger.warn("[theme] Draft preview unavailable", { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

/**
 * The theme the storefront renders: the published `storefrontTheme` Sanity
 * document, validated by resolveStorefrontTheme, with the default preset as
 * fallback (no document, invalid values, failed contrast, Sanity down), or
 * the saved draft for an authorised admin previewing it.
 * Callers only see StorefrontTheme. React.cache: one resolution per request
 * however many server components ask.
 */
export const getStorefrontTheme = cache(async (): Promise<StorefrontTheme> => {
  const preview = await getDraftPreviewTheme();

  if (preview) {
    return preview;
  }

  let document: unknown;

  try {
    document = await fetchPublishedThemeDocument();
  } catch (error) {
    logger.warn("[theme] Sanity unavailable, rendering the default preset", {
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      source: { kind: "fallback", presetId: DEFAULT_THEME_PRESET_ID, reason: "unavailable" },
      tokens: DEFAULT_THEME_TOKENS,
    };
  }

  const theme = resolveStorefrontTheme(document);

  if (theme.source.kind === "fallback" && theme.source.reason !== "missing") {
    logger.warn("[theme] Published storefrontTheme rejected, rendering the default preset", {
      reason: theme.source.reason,
      detail: theme.source.detail,
    });
  }

  return theme;
});
