import { themeTokensToCssDeclarations } from "@/features/theme/css";
import type { ThemeTokens } from "@/features/theme/types";

type StorefrontThemeStyleProps = {
  tokens: ThemeTokens;
};

/**
 * Writes the theme's CSS variables on :root, server-rendered, so the first
 * paint already has them: no flash of the default theme and nothing to
 * hydrate (no client code).
 *
 * - :root, not a wrapper element: the cart drawer and the mobile menu are
 *   portalled to <body> and would escape a wrapper.
 * - Rendered only by storefront layouts, never by /admin, so the admin never
 *   receives it; on client navigation to /admin the storefront layout
 *   unmounts and the tag goes with it. Deliberately a plain <style> (no
 *   `precedence`/`href`): React would hoist that into <head> and keep it.
 * - Wins over the defaults in globals.css by order (same specificity, both
 *   unlayered, this one later in the document).
 * - Only #rrggbb values can be emitted (themeTokensToCssDeclarations).
 */
export function StorefrontThemeStyle({ tokens }: StorefrontThemeStyleProps) {
  return (
    <style
      data-storefront-theme=""
      dangerouslySetInnerHTML={{ __html: `:root{${themeTokensToCssDeclarations(tokens)}}` }}
    />
  );
}
