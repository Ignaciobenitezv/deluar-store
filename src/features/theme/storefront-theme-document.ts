import { normalizeHex } from "@/features/theme/color";
import { deriveThemeTokens } from "@/features/theme/derive";
import { DEFAULT_THEME_TOKENS } from "@/features/theme/default-theme";
import { DEFAULT_THEME_PRESET_ID, THEME_PRESETS } from "@/features/theme/presets";
import type {
  DerivedTokenName,
  StorefrontTheme,
  ThemeBaseColors,
  ThemeFallbackReason,
  ThemeInput,
  ThemePresetId,
} from "@/features/theme/types";

/** Fixed _id of the Sanity singleton; its draft is "drafts.storefrontTheme". */
export const STOREFRONT_THEME_DOCUMENT_ID = "storefrontTheme";

/** Sanity id of the saved (unpublished) draft of the singleton. */
export const STOREFRONT_THEME_DRAFT_ID = `drafts.${STOREFRONT_THEME_DOCUMENT_ID}`;

/** `preset` value that means "use the document's own colours". */
export const CUSTOM_THEME_PRESET = "custom";

const BASE_KEYS = ["canvas", "surface", "ink", "cta", "brand", "promo"] as const satisfies readonly (keyof ThemeBaseColors)[];

/** The derived tokens a custom palette may pin: exactly ThemeInput["overrides"]. */
export const OVERRIDABLE_TOKEN_NAMES = Object.keys(DEFAULT_THEME_TOKENS).filter(
  (key) => !(BASE_KEYS as readonly string[]).includes(key),
) as DerivedTokenName[];

const DERIVED_KEYS = new Set<string>(OVERRIDABLE_TOKEN_NAMES);

/** The document fields, exactly as stored once sanitised. */
export type StorefrontThemeFields =
  | { preset: ThemePresetId }
  | {
      preset: typeof CUSTOM_THEME_PRESET;
      colors: ThemeBaseColors;
      overrides: NonNullable<ThemeInput["overrides"]>;
    };

export type SanitizeResult = { ok: true; fields: StorefrontThemeFields } | { ok: false; detail: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isPresetId = (value: unknown): value is ThemePresetId =>
  typeof value === "string" && Object.hasOwn(THEME_PRESETS, value);

/**
 * Untrusted document (Sanity, an admin request) to clean fields, or the first
 * problem found. Strict: a custom palette needs all six base colours as valid
 * hex, and any invalid or unknown override rejects the whole thing. Mixing a
 * fallback colour into someone else's palette could pair, say, a dark default
 * ink with a dark custom canvas, so nothing is patched token by token.
 * Presets carry no colours: leftovers from an earlier custom palette are dropped.
 */
export function sanitizeStorefrontThemeFields(value: unknown): SanitizeResult {
  if (!isRecord(value)) {
    return { ok: false, detail: "document" };
  }

  if (isPresetId(value.preset)) {
    return { ok: true, fields: { preset: value.preset } };
  }

  if (value.preset !== CUSTOM_THEME_PRESET) {
    return { ok: false, detail: "preset" };
  }

  const colorRecord = isRecord(value.colors) ? value.colors : {};
  const colors: Partial<ThemeBaseColors> = {};

  for (const key of BASE_KEYS) {
    const normalized = normalizeHex(colorRecord[key]);

    if (!normalized) {
      return { ok: false, detail: `colors.${key}` };
    }

    colors[key] = normalized;
  }

  if (value.overrides !== undefined && value.overrides !== null && !isRecord(value.overrides)) {
    return { ok: false, detail: "overrides" };
  }

  const overrides: NonNullable<ThemeInput["overrides"]> = {};

  for (const [key, raw] of Object.entries(value.overrides ?? {})) {
    // Sanity metadata (_type, _key) and empty optional fields are not overrides.
    if (key.startsWith("_") || raw === null || raw === undefined || raw === "") {
      continue;
    }

    const normalized = normalizeHex(raw);

    if (!DERIVED_KEYS.has(key) || !normalized) {
      return { ok: false, detail: `overrides.${key}` };
    }

    overrides[key as DerivedTokenName] = normalized;
  }

  return { ok: true, fields: { preset: CUSTOM_THEME_PRESET, colors: colors as ThemeBaseColors, overrides } };
}

/** The ThemeInput a sanitised document renders: a preset exactly as in code, or the custom palette. */
export function themeInputFromFields(fields: StorefrontThemeFields): ThemeInput {
  return fields.preset === CUSTOM_THEME_PRESET
    ? { base: fields.colors, overrides: fields.overrides }
    : THEME_PRESETS[fields.preset];
}

function fallback(reason: ThemeFallbackReason, detail?: string): StorefrontTheme {
  return {
    source: { kind: "fallback", presetId: DEFAULT_THEME_PRESET_ID, reason, detail },
    tokens: DEFAULT_THEME_TOKENS,
  };
}

/**
 * Pure: the published `storefrontTheme` document (untrusted, possibly null)
 * to the theme the storefront renders. Presets render exactly as in code; a
 * custom palette is parsed strictly and derived with the usual functions.
 * Only a missing or invalid document falls back to the default preset:
 * contrast below WCAG AA is a warning shown in the admin, never a reason to
 * reject a palette that was published (so the store always shows what the
 * admin published).
 */
export function resolveStorefrontTheme(document: unknown): StorefrontTheme {
  if (document === null || document === undefined) {
    return fallback("missing");
  }

  const sanitized = sanitizeStorefrontThemeFields(document);

  if (!sanitized.ok) {
    return fallback("invalid", sanitized.detail);
  }

  const { fields } = sanitized;

  if (fields.preset !== CUSTOM_THEME_PRESET) {
    return {
      source: { kind: "preset", presetId: fields.preset },
      tokens: fields.preset === DEFAULT_THEME_PRESET_ID ? DEFAULT_THEME_TOKENS : deriveThemeTokens(THEME_PRESETS[fields.preset]),
    };
  }

  return { source: { kind: "custom" }, tokens: deriveThemeTokens(themeInputFromFields(fields)) };
}
