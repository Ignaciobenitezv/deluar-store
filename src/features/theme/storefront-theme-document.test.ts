import assert from "node:assert/strict";
import test from "node:test";
import { deriveThemeTokens } from "./derive";
import { DEFAULT_THEME_PRESET_ID, THEME_PRESETS } from "./presets";
import { CUSTOM_THEME_PRESET, resolveStorefrontTheme } from "./storefront-theme-document";
import { validateThemeTokens } from "./validate";

const DEFAULT_TOKENS = deriveThemeTokens(THEME_PRESETS[DEFAULT_THEME_PRESET_ID]);

// A valid custom palette, different from both presets in every base colour.
const CUSTOM_COLORS = {
  canvas: "#F2F0EB",
  surface: "#fcfbf8",
  ink: "#1f2a33",
  cta: "#1f2a33",
  brand: "#2f4a5c",
  promo: "#b3122e",
};

const custom = (extra: Record<string, unknown> = {}) => ({
  preset: CUSTOM_THEME_PRESET,
  colors: CUSTOM_COLORS,
  ...extra,
});

function assertFallback(document: unknown, reason: string) {
  const theme = resolveStorefrontTheme(document);

  assert.equal(theme.source.kind, "fallback");
  assert.equal(theme.source.kind === "fallback" && theme.source.reason, reason);
  assert.deepEqual(theme.tokens, DEFAULT_TOKENS);
}

test("no published document: Deluar editorial", () => {
  assertFallback(null, "missing");
  assertFallback(undefined, "missing");
  assert.equal(DEFAULT_THEME_PRESET_ID, "deluar-editorial");
});

test("published preset renders exactly as in code", () => {
  const actual = resolveStorefrontTheme({ preset: "actual" });

  assert.deepEqual(actual.source, { kind: "preset", presetId: "actual" });
  assert.deepEqual(actual.tokens, deriveThemeTokens(THEME_PRESETS.actual));

  // Colours left over from an earlier custom palette are ignored by a preset.
  const editorial = resolveStorefrontTheme({ preset: "deluar-editorial", colors: { canvas: "#000000" } });

  assert.deepEqual(editorial.tokens, DEFAULT_TOKENS);
});

test("valid custom document applies its six colours, normalised, and derives the rest", () => {
  const theme = resolveStorefrontTheme(custom());

  assert.deepEqual(theme.source, { kind: "custom" });
  assert.equal(theme.tokens.canvas, "#f2f0eb");

  for (const key of ["surface", "ink", "cta", "brand", "promo"] as const) {
    assert.equal(theme.tokens[key], CUSTOM_COLORS[key]);
  }

  const expected = deriveThemeTokens({ base: { ...CUSTOM_COLORS, canvas: "#f2f0eb" }, overrides: {} });

  assert.deepEqual(theme.tokens, expected);
});

test("optional overrides: valid ones are pinned, empty ones and Sanity metadata ignored", () => {
  const theme = resolveStorefrontTheme(
    custom({ overrides: { _type: "object", line: "#D9D4CC", accent: "", promoSoft: null } }),
  );

  assert.equal(theme.source.kind, "custom");
  assert.equal(theme.tokens.line, "#d9d4cc");
  assert.equal(theme.tokens.accent, resolveStorefrontTheme(custom()).tokens.accent);
});

test("missing or invalid base colours: whole default preset, never a mix", () => {
  const withoutPromo = Object.fromEntries(Object.entries(CUSTOM_COLORS).filter(([key]) => key !== "promo"));

  assertFallback(custom({ colors: withoutPromo }), "invalid");
  assertFallback(custom({ colors: { ...CUSTOM_COLORS, ink: "red" } }), "invalid");
  assertFallback(custom({ colors: { ...CUSTOM_COLORS, canvas: "#fff;}body{display:none" } }), "invalid");
  assertFallback(custom({ colors: { ...CUSTOM_COLORS, cta: 42 } }), "invalid");
  assertFallback(custom({ colors: null }), "invalid");
  assertFallback({ preset: CUSTOM_THEME_PRESET }, "invalid");
});

test("invalid or unknown overrides: whole default preset", () => {
  assertFallback(custom({ overrides: { line: "url(x)" } }), "invalid");
  assertFallback(custom({ overrides: { canvas: "#000000" } }), "invalid");
  assertFallback(custom({ overrides: { injected: "#000000" } }), "invalid");
  assertFallback(custom({ overrides: "#000000" }), "invalid");
});

test("unknown preset or malformed document: default preset", () => {
  assertFallback({}, "invalid");
  assertFallback({ preset: "neon" }, "invalid");
  assertFallback({ preset: "__proto__" }, "invalid");
  assertFallback("deluar-editorial", "invalid");
  assertFallback([], "invalid");
});

test("a published palette with WCAG AA warnings is still rendered, never swapped for the default", () => {
  const lowContrast = resolveStorefrontTheme(custom({ colors: { ...CUSTOM_COLORS, ink: "#cfcac2" } }));

  assert.deepEqual(lowContrast.source, { kind: "custom" });
  assert.equal(lowContrast.tokens.ink, "#cfcac2");
  assert.equal(validateThemeTokens(lowContrast.tokens).meetsAA, false);

  // A pinned override that misses AA is applied too.
  const pinned = resolveStorefrontTheme(custom({ overrides: { inkMuted: "#eeeeee" } }));
  assert.deepEqual(pinned.source, { kind: "custom" });
  assert.equal(pinned.tokens.inkMuted, "#eeeeee");
});
