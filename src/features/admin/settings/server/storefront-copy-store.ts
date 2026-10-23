import "server-only";
import type { Mutation } from "@sanity/client";
import { sanityAdminEditFetch, sanityWriteClient } from "@/integrations/sanity/client";
import { storefrontCopyAdminQuery } from "@/integrations/sanity/queries";
import {
  STOREFRONT_COPY_DOCUMENT_ID,
  STOREFRONT_COPY_DRAFT_ID,
} from "@/features/storefront-copy/storefront-copy-document";
import { CopyRevisionConflictError, type CopyDocumentStore, type CopyMutation } from "./storefront-copy-service";

type StoredCopyDocument = { _id: string };

function isRevisionConflict(error: unknown) {
  // Same Sanity answers as the theme store: 409 for a failed ifRevisionID or
  // a create over an existing document, 404 for a deleted target.
  const statusCode = (error as { statusCode?: unknown } | null)?.statusCode;

  return statusCode === 409 || statusCode === 404;
}

/** Sanity-backed store for the texts singleton. Null without write credentials. */
export function createSanityCopyStore(): CopyDocumentStore | null {
  const client = sanityWriteClient;

  if (!client) {
    return null;
  }

  return {
    async read() {
      const documents = await sanityAdminEditFetch<StoredCopyDocument[]>(storefrontCopyAdminQuery, {
        publishedId: STOREFRONT_COPY_DOCUMENT_ID,
        draftId: STOREFRONT_COPY_DRAFT_ID,
      });

      return {
        published: documents.find((document) => document._id === STOREFRONT_COPY_DOCUMENT_ID) ?? null,
        draft: documents.find((document) => document._id === STOREFRONT_COPY_DRAFT_ID) ?? null,
      };
    },
    async commit(mutations: CopyMutation[]) {
      try {
        await client.mutate(mutations as Mutation[], { visibility: "sync" });
      } catch (error) {
        if (isRevisionConflict(error)) {
          throw new CopyRevisionConflictError(error instanceof Error ? error.message : undefined);
        }

        throw error;
      }
    },
  };
}
