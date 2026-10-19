import "server-only";
import type { Mutation } from "@sanity/client";
import { sanityAdminEditFetch, sanityWriteClient } from "@/integrations/sanity/client";
import { storefrontThemeAdminQuery } from "@/integrations/sanity/queries";
import {
  STOREFRONT_THEME_DOCUMENT_ID,
  STOREFRONT_THEME_DRAFT_ID,
} from "@/features/theme/storefront-theme-document";
import { ThemeRevisionConflictError, type ThemeDocumentStore, type ThemeMutation } from "./storefront-theme-service";

type StoredThemeDocument = { _id: string };

function isRevisionConflict(error: unknown) {
  // Sanity answers a failed ifRevisionID, a create over an existing document
  // and a patch of a missing one with 409 (404 kept for a deleted target).
  const statusCode = (error as { statusCode?: unknown } | null)?.statusCode;

  return statusCode === 409 || statusCode === 404;
}

/**
 * The Sanity-backed store: reads both documents with the authenticated raw
 * client (drafts included; admin server code only), writes through the write
 * token in one atomic transaction. Null without write credentials.
 */
export function createSanityThemeStore(): ThemeDocumentStore | null {
  const client = sanityWriteClient;

  if (!client) {
    return null;
  }

  return {
    async read() {
      const documents = await sanityAdminEditFetch<StoredThemeDocument[]>(storefrontThemeAdminQuery, {
        publishedId: STOREFRONT_THEME_DOCUMENT_ID,
        draftId: STOREFRONT_THEME_DRAFT_ID,
      });

      return {
        published: documents.find((document) => document._id === STOREFRONT_THEME_DOCUMENT_ID) ?? null,
        draft: documents.find((document) => document._id === STOREFRONT_THEME_DRAFT_ID) ?? null,
      };
    },
    async commit(mutations: ThemeMutation[]) {
      try {
        await client.mutate(mutations as Mutation[], { visibility: "sync" });
      } catch (error) {
        if (isRevisionConflict(error)) {
          throw new ThemeRevisionConflictError(error instanceof Error ? error.message : undefined);
        }

        throw error;
      }
    },
  };
}
