import type { ThemePreset, ThemePresetId } from "@/features/theme/types";

/**
 * "Actual": today's storefront colours, pinned through `overrides` so
 * rendering it is a visual no-op. One deliberate exception: inkMuted was
 * #786b5f (4.45:1 on the canvas, below AA); it is now #76695d, the smallest
 * step darker that passes (4.58:1 on canvas, 5.12:1 on surface).
 * brandAlt pins the olive the home benefits strip already shows, so it keeps
 * its look while every other brand surface stays brown. surfaceRaised,
 * accent, accentSoft and focusRing pin today's white panels, camel details,
 * peach chips and brown focus rings. error is not pinned: it is the shared,
 * palette-independent red (ERROR_ANCHOR in derive.ts).
 */
const actual: ThemePreset = {
  id: "actual",
  label: "Actual",
  description: "Marrones, crema y rojo promocional de la tienda hoy.",
  base: {
    canvas: "#f4ede4",
    surface: "#fffaf4",
    ink: "#2f241b",
    // --color-accent-strong: today's CTA and brand brown.
    cta: "#604738",
    brand: "#604738",
    promo: "#b51429",
  },
  overrides: {
    inkMuted: "#76695d",
    line: "#ddd0c2",
    brandAlt: "#465344",
    surfaceRaised: "#ffffff",
    accent: "#b69272",
    accentSoft: "#f1dcc7",
    focusRing: "#604738",
    promoStrong: "#8f0f21",
    promoSoft: "#fbeaea",
    promoForeground: "#fff8f6",
  },
};

/** Warm charcoal + deep olive + promo red on cream: the approved direction. */
const deluarEditorial: ThemePreset = {
  id: "deluar-editorial",
  label: "Deluar editorial",
  description: "Carbón cálido, verde oliva, rojo promocional y crema.",
  base: {
    canvas: "#f4ede4",
    surface: "#fffaf4",
    ink: "#2b2724",
    cta: "#2b2724",
    brand: "#465344",
    promo: "#b51429",
  },
  overrides: {
    inkMuted: "#645d55",
    promoStrong: "#8f0f21",
    promoSoft: "#fbeaea",
    promoForeground: "#fff8f6",
  },
};

export const THEME_PRESETS: Record<ThemePresetId, ThemePreset> = {
  actual,
  "deluar-editorial": deluarEditorial,
};

/** What the storefront renders when nothing else is configured. */
export const DEFAULT_THEME_PRESET_ID: ThemePresetId = "deluar-editorial";
