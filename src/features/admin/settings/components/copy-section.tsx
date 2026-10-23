import { getStorefrontTheme } from "@/features/theme/server/get-storefront-theme";
import { getAdminStorefrontCopy } from "../server/storefront-copy-data";
import { StorefrontCopyEditor } from "./storefront-copy-editor";

/**
 * Textos tab: every storefront text that is not product data. Reads the
 * published document and the saved draft fresh with their revisions; writes
 * go through the revision-locked actions in actions/storefront-copy-actions.ts.
 * The previews paint with the store's current palette.
 */
export async function CopySection() {
  const [data, theme] = await Promise.all([getAdminStorefrontCopy(), getStorefrontTheme()]);

  return <StorefrontCopyEditor data={data} tokens={theme.tokens} />;
}
