import { normalizeHex } from "@/features/theme/color";
import type { ThemeTokenName, ThemeTokens } from "@/features/theme/types";

/**
 * Token to CSS custom property. The single source for both the runtime
 * <style> and the defaults in globals.css (a test keeps them in sync). The
 * Tailwind colour (`--color-*`) for each is registered in globals.css.
 */
export const THEME_CSS_VARIABLES: Record<ThemeTokenName, `--${string}`> = {
  canvas: "--canvas",
  canvasAlt: "--canvas-alt",
  surfaceRaised: "--surface-raised",
  surface: "--surface",
  ink: "--ink",
  inkMuted: "--ink-muted",
  line: "--line",
  lineStrong: "--line-strong",
  cta: "--cta",
  ctaHover: "--cta-hover",
  ctaForeground: "--cta-foreground",
  brand: "--brand",
  brandHover: "--brand-hover",
  brandSoft: "--brand-soft",
  brandForeground: "--brand-foreground",
  brandAlt: "--brand-alt",
  brandAltForeground: "--brand-alt-foreground",
  promo: "--promo",
  promoStrong: "--promo-strong",
  promoSoft: "--promo-soft",
  promoForeground: "--promo-foreground",
  accent: "--accent",
  accentSoft: "--accent-soft",
  error: "--error",
  focusRing: "--focus-ring",
};

/**
 * `--canvas:#f4ede4;--ink:#2f241b;…`. Values are re-normalised here so only
 * #rrggbb can ever be written into a stylesheet, whatever the caller passed.
 */
export function themeTokensToCssDeclarations(tokens: ThemeTokens): string {
  return (Object.keys(THEME_CSS_VARIABLES) as ThemeTokenName[])
    .flatMap((name) => {
      const value = normalizeHex(tokens[name]);
      return value ? [`${THEME_CSS_VARIABLES[name]}:${value};`] : [];
    })
    .join("");
}
