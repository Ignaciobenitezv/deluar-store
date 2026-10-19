import { contrastRatio, mixHex, normalizeHex, relativeLuminance } from "@/features/theme/color";
import { DEFAULT_THEME_PRESET_ID, THEME_PRESETS } from "@/features/theme/presets";
import type {
  DerivedTokenName,
  ThemeBaseColors,
  ThemeInput,
  ThemeTokens,
} from "@/features/theme/types";

const WHITE = "#ffffff";
const BLACK = "#000000";

const BASE_KEYS = ["canvas", "surface", "ink", "cta", "brand", "promo"] as const satisfies readonly (keyof ThemeBaseColors)[];

/**
 * Errors keep one recognisable red whatever the palette: anchored here, not
 * derived from any editable colour or from promo, and only nudged darker (or
 * lighter on a dark canvas) as far as AA requires.
 */
export const ERROR_ANCHOR = "#a3261b";

/** Body text minimum (WCAG AA, normal text). */
export const AA_TEXT = 4.5;
/** Non-text UI minimum (WCAG AA, 1.4.11): input borders, focus rings. */
export const AA_UI = 3;

/** Of the candidates, the one that reads best on `background`. */
function pickForeground(background: string, candidates: readonly string[]) {
  return candidates.reduce((best, candidate) =>
    contrastRatio(candidate, background) > contrastRatio(best, background) ? candidate : best,
  );
}

/** Hover: a dark colour lifts toward white, a light one sinks toward black. */
function hoverOf(color: string) {
  return relativeLuminance(color) < 0.18 ? mixHex(color, WHITE, 0.12) : mixHex(color, BLACK, 0.12);
}

/**
 * Walks from `start` toward `target` until `color` reaches `minRatio`
 * against every background, so derived colours meet AA by construction.
 */
function ensureContrast(
  start: number,
  build: (amount: number) => string,
  backgrounds: readonly string[],
  minRatio: number,
  direction: 1 | -1,
) {
  for (let amount = start; amount >= 0 && amount <= 1; amount += 0.02 * direction) {
    const color = build(amount);

    if (backgrounds.every((background) => contrastRatio(color, background) >= minRatio)) {
      return color;
    }
  }

  return build(direction === 1 ? 1 : 0);
}

function errorFor(backgrounds: readonly string[]) {
  const darker = ensureContrast(0, (amount) => mixHex(ERROR_ANCHOR, BLACK, amount), backgrounds, AA_TEXT, 1);

  if (backgrounds.every((background) => contrastRatio(darker, background) >= AA_TEXT)) {
    return darker;
  }

  return ensureContrast(0, (amount) => mixHex(ERROR_ANCHOR, WHITE, amount), backgrounds, AA_TEXT, 1);
}

/** Pure: base colours (+ pinned overrides) to the full token set. */
export function deriveThemeTokens(input: ThemeInput): ThemeTokens {
  const { canvas, surface, ink, cta, brand, promo } = input.base;
  const lightForeground = surface;

  const derived: Record<DerivedTokenName, string> = {
    canvasAlt: mixHex(canvas, ink, 0.05),
    surfaceRaised: mixHex(surface, WHITE, 0.6),
    // Lightest mix of ink into canvas that still reads as secondary text.
    inkMuted: ensureContrast(0.55, (amount) => mixHex(ink, canvas, amount), [canvas, surface], AA_TEXT, -1),
    line: mixHex(canvas, ink, 0.12),
    lineStrong: ensureContrast(0.3, (amount) => mixHex(canvas, ink, amount), [canvas, surface], AA_UI, 1),
    ctaHover: hoverOf(cta),
    ctaForeground: pickForeground(cta, [lightForeground, ink]),
    brandHover: hoverOf(brand),
    brandSoft: mixHex(surface, brand, 0.1),
    brandForeground: pickForeground(brand, [lightForeground, ink]),
    brandAlt: brand,
    // Placeholder: recomputed below against the final brandAlt (which a
    // preset may pin), unless the foreground itself is pinned.
    brandAltForeground: pickForeground(brand, [lightForeground, ink]),
    promoStrong: mixHex(promo, BLACK, 0.22),
    promoSoft: mixHex(surface, promo, 0.08),
    promoForeground: pickForeground(promo, [lightForeground, ink]),
    accent: mixHex(brand, canvas, 0.45),
    accentSoft: mixHex(surface, brand, 0.16),
    error: errorFor([canvas, surface]),
    focusRing: ink,
  };

  for (const [name, value] of Object.entries(input.overrides ?? {}) as [DerivedTokenName, string][]) {
    const normalized = normalizeHex(value);

    if (normalized) {
      derived[name] = normalized;
    }
  }

  if (!normalizeHex(input.overrides?.brandAltForeground)) {
    derived.brandAltForeground = pickForeground(derived.brandAlt, [lightForeground, ink]);
  }

  return { ...input.base, ...derived };
}

/**
 * Untrusted input (a future Sanity document, an admin form) to a safe
 * ThemeInput: every value normalised to #rrggbb, anything invalid or missing
 * falls back to the default preset, token by token. Nothing that is not a hex
 * colour can ever reach the CSS.
 */
export function sanitizeThemeInput(value: unknown): ThemeInput {
  const fallback = THEME_PRESETS[DEFAULT_THEME_PRESET_ID];
  const record = (typeof value === "object" && value !== null ? value : {}) as {
    base?: Record<string, unknown>;
    overrides?: Record<string, unknown>;
  };

  const base = Object.fromEntries(
    BASE_KEYS.map((key) => [key, normalizeHex(record.base?.[key]) ?? fallback.base[key]]),
  ) as ThemeBaseColors;

  const overrides: ThemeInput["overrides"] = {};

  for (const [key, raw] of Object.entries(record.overrides ?? {})) {
    const normalized = normalizeHex(raw);

    if (normalized && isDerivedTokenName(key)) {
      overrides[key] = normalized;
    }
  }

  return { base, overrides };
}

const DERIVED_KEYS = new Set<string>([
  "canvasAlt",
  "surfaceRaised",
  "inkMuted",
  "line",
  "lineStrong",
  "ctaHover",
  "ctaForeground",
  "brandHover",
  "brandSoft",
  "brandForeground",
  "brandAlt",
  "brandAltForeground",
  "promoStrong",
  "promoSoft",
  "promoForeground",
  "accent",
  "accentSoft",
  "error",
  "focusRing",
] satisfies DerivedTokenName[]);

function isDerivedTokenName(key: string): key is DerivedTokenName {
  return DERIVED_KEYS.has(key);
}
