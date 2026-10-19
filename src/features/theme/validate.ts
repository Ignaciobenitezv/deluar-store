import { contrastRatio } from "@/features/theme/color";
import { AA_TEXT, AA_UI } from "@/features/theme/derive";
import type { ThemeTokenName, ThemeTokens } from "@/features/theme/types";

export type ThemeContrastCheck = {
  id: string;
  label: string;
  foreground: ThemeTokenName;
  background: ThemeTokenName;
  minRatio: number;
  ratio: number;
};

/**
 * Accessibility report of a palette. Advisory only: a palette that misses AA
 * can still be published (after an explicit confirmation) and the storefront
 * renders it; only invalid colours are ever rejected.
 */
export type ThemeValidation = {
  /** True when every pairing meets its WCAG AA minimum. */
  meetsAA: boolean;
  /** Pairings below their AA minimum: shown as contrast warnings. */
  contrastIssues: ThemeContrastCheck[];
  /** Further advice beyond AA (colour-blind adjacency, AAA). */
  warnings: { id: string; message: string }[];
  checks: ThemeContrastCheck[];
};

type CheckSpec = Omit<ThemeContrastCheck, "ratio">;

// Every pairing the storefront actually renders, with the WCAG AA minimum
// for its use (text 4.5:1, UI boundaries 3:1).
const CHECKS: CheckSpec[] = [
  { id: "ink-canvas", label: "Texto sobre fondo", foreground: "ink", background: "canvas", minRatio: AA_TEXT },
  { id: "ink-surface", label: "Texto sobre tarjetas", foreground: "ink", background: "surface", minRatio: AA_TEXT },
  { id: "ink-muted-canvas", label: "Texto secundario sobre fondo", foreground: "inkMuted", background: "canvas", minRatio: AA_TEXT },
  { id: "ink-muted-surface", label: "Texto secundario sobre tarjetas", foreground: "inkMuted", background: "surface", minRatio: AA_TEXT },
  { id: "promo-canvas", label: "Precio promocional sobre fondo", foreground: "promo", background: "canvas", minRatio: AA_TEXT },
  { id: "promo-surface", label: "Precio promocional sobre tarjetas", foreground: "promo", background: "surface", minRatio: AA_TEXT },
  { id: "cta-foreground", label: "Texto del botón principal", foreground: "ctaForeground", background: "cta", minRatio: AA_TEXT },
  { id: "cta-foreground-hover", label: "Texto del botón principal (hover)", foreground: "ctaForeground", background: "ctaHover", minRatio: AA_TEXT },
  { id: "brand-foreground", label: "Texto sobre superficies de marca", foreground: "brandForeground", background: "brand", minRatio: AA_TEXT },
  { id: "brand-foreground-hover", label: "Texto sobre marca (hover)", foreground: "brandForeground", background: "brandHover", minRatio: AA_TEXT },
  { id: "brand-alt-foreground", label: "Texto sobre superficies de marca secundarias", foreground: "brandAltForeground", background: "brandAlt", minRatio: AA_TEXT },
  { id: "promo-foreground", label: "Texto sobre promoción", foreground: "promoForeground", background: "promo", minRatio: AA_TEXT },
  { id: "ink-surface-raised", label: "Texto sobre paneles elevados", foreground: "ink", background: "surfaceRaised", minRatio: AA_TEXT },
  { id: "ink-muted-surface-raised", label: "Texto secundario sobre paneles elevados", foreground: "inkMuted", background: "surfaceRaised", minRatio: AA_TEXT },
  { id: "ink-accent", label: "Texto sobre acento (estado activo)", foreground: "ink", background: "accent", minRatio: AA_TEXT },
  { id: "error-canvas", label: "Mensajes de error sobre fondo", foreground: "error", background: "canvas", minRatio: AA_TEXT },
  { id: "error-surface", label: "Mensajes de error sobre tarjetas", foreground: "error", background: "surface", minRatio: AA_TEXT },
  { id: "line-strong-canvas", label: "Bordes de campos", foreground: "lineStrong", background: "canvas", minRatio: AA_UI },
  { id: "focus-ring-canvas", label: "Indicador de foco", foreground: "focusRing", background: "canvas", minRatio: AA_UI },
];

/** Promo and brand fills this close in lightness can merge for red-green colour blindness. */
const ADJACENT_FILL_MIN = 1.5;
const AAA_TEXT = 7;

export function validateThemeTokens(tokens: ThemeTokens): ThemeValidation {
  const checks = CHECKS.map((check) => ({
    ...check,
    ratio: Math.round(contrastRatio(tokens[check.foreground], tokens[check.background]) * 100) / 100,
  }));
  const contrastIssues = checks.filter((check) => check.ratio < check.minRatio);
  const warnings: ThemeValidation["warnings"] = [];

  if (contrastRatio(tokens.promo, tokens.brand) < ADJACENT_FILL_MIN) {
    warnings.push({
      id: "promo-brand-adjacent",
      message:
        "Promoción y marca tienen una luminosidad muy parecida: juntas pueden confundirse con daltonismo. Diferencialas también por tamaño o tipografía.",
    });
  }

  if (contrastRatio(tokens.ink, tokens.canvas) < AAA_TEXT) {
    warnings.push({
      id: "ink-canvas-aaa",
      message: "El texto principal cumple AA pero no AAA (7:1) sobre el fondo.",
    });
  }

  return { meetsAA: contrastIssues.length === 0, contrastIssues, warnings, checks };
}
