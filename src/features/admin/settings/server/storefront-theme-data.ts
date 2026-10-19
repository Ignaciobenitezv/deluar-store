import "server-only";
import { snapshotFromDocuments, type ThemeEditorSnapshot } from "@/features/theme/editor";
import { sanityFreshFetch } from "@/integrations/sanity/client";
import { storefrontThemeQuery } from "@/integrations/sanity/queries";
import { logger } from "@/lib/logger";
import { createSanityThemeStore } from "./storefront-theme-store";
import { readThemeSnapshot } from "./storefront-theme-service";

export type AdminStorefrontThemeData = {
  snapshot: ThemeEditorSnapshot;
  /** False when Sanity could not be read: the editor starts from the default preset. */
  isAvailable: boolean;
  /** Write credentials configured: drafts can be read, saved and published. */
  canWrite: boolean;
};

/**
 * What the Apariencia tab opens on, read fresh on every visit (no CDN, not
 * the storefront's cache): published document and saved draft with their
 * revisions, through the authenticated server client. Without write
 * credentials only the published document can be read, and writes are off.
 */
export async function getAdminStorefrontTheme(): Promise<AdminStorefrontThemeData> {
  const store = createSanityThemeStore();

  try {
    if (store) {
      return { snapshot: await readThemeSnapshot(store), isAvailable: true, canWrite: true };
    }

    const published = await sanityFreshFetch<unknown>(storefrontThemeQuery);

    return { snapshot: snapshotFromDocuments(published, null), isAvailable: true, canWrite: false };
  } catch (error) {
    logger.warn("[theme] Admin editor could not read Sanity", {
      error: error instanceof Error ? error.message : String(error),
    });

    return { snapshot: snapshotFromDocuments(null, null), isAvailable: false, canWrite: false };
  }
}
