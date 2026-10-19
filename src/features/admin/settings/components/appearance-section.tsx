import { getAdminStorefrontTheme } from "../server/storefront-theme-data";
import { StorefrontThemeEditor } from "./storefront-theme-editor";

/**
 * Apariencia tab: the storefront palette (the admin's own light/dark mode is
 * "Tema del panel", in Preferencias). Reads the published document and the
 * saved draft fresh with their revisions; saving and publishing go through
 * the revision-locked server actions in actions/storefront-theme-actions.ts.
 */
export async function AppearanceSection() {
  return <StorefrontThemeEditor data={await getAdminStorefrontTheme()} />;
}
