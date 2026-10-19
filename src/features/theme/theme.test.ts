import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { contrastRatio, mixHex, normalizeHex } from "./color";
import { THEME_CSS_VARIABLES, themeTokensToCssDeclarations } from "./css";
import { ERROR_ANCHOR, deriveThemeTokens, sanitizeThemeInput } from "./derive";
import { DEFAULT_THEME_PRESET_ID, THEME_PRESETS } from "./presets";
import type { ThemeTokenName } from "./types";
import { validateThemeTokens } from "./validate";

test("normalizeHex: 3 and 6 digits, case, invalid", () => {
  assert.equal(normalizeHex("#ABC"), "#aabbcc");
  assert.equal(normalizeHex(" #B51429 "), "#b51429");
  assert.equal(normalizeHex("b51429"), null);
  assert.equal(normalizeHex("red"), null);
  assert.equal(normalizeHex("#b51429;}body{x"), null);
  assert.equal(normalizeHex(42), null);
});

test("contrastRatio matches WCAG reference values", () => {
  assert.equal(Math.round(contrastRatio("#000000", "#ffffff") * 100) / 100, 21);
  assert.equal(Math.round(contrastRatio("#b51429", "#ffffff") * 100) / 100, 6.78);
  assert.equal(contrastRatio("#777777", "#777777"), 1);
});

test("mixHex endpoints and midpoint", () => {
  assert.equal(mixHex("#000000", "#ffffff", 0), "#000000");
  assert.equal(mixHex("#000000", "#ffffff", 1), "#ffffff");
  assert.equal(mixHex("#000000", "#ffffff", 0.5), "#808080");
});

test("Actual preset reproduces today's storefront values exactly", () => {
  const tokens = deriveThemeTokens(THEME_PRESETS.actual);

  assert.equal(tokens.canvas, "#f4ede4"); // --background
  assert.equal(tokens.ink, "#2f241b"); // --foreground
  // --muted, nudged from #786b5f (4.45:1) to the nearest value passing AA.
  assert.equal(tokens.inkMuted, "#76695d");
  assert.equal(tokens.surface, "#fffaf4"); // --surface
  assert.equal(tokens.line, "#ddd0c2"); // --border
  assert.equal(tokens.cta, "#604738"); // --color-accent-strong
  assert.equal(tokens.promo, "#b51429");
  assert.equal(tokens.promoStrong, "#8f0f21");
  assert.equal(tokens.promoSoft, "#fbeaea");
  assert.equal(tokens.promoForeground, "#fff8f6");
});

test("globals.css defaults stay in sync with the Actual preset", () => {
  const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
  const rootBlock = css.slice(css.indexOf(":root {"), css.indexOf("}", css.indexOf(":root {")));
  const tokens = deriveThemeTokens(THEME_PRESETS.actual);

  for (const [name, variable] of Object.entries(THEME_CSS_VARIABLES) as [ThemeTokenName, string][]) {
    const match = rootBlock.match(new RegExp(`${variable}:\\s*(#[0-9a-fA-F]{6})\\s*;`));
    assert.ok(match, `${variable} missing from :root in globals.css`);
    assert.equal(match[1].toLowerCase(), tokens[name], `${variable} out of sync`);
  }
});

test("Actual passes every AA check now that ink-muted is fixed", () => {
  const validation = validateThemeTokens(deriveThemeTokens(THEME_PRESETS.actual));

  assert.equal(validation.meetsAA, true, JSON.stringify(validation.contrastIssues));
});

test("Deluar editorial passes every AA check", () => {
  const validation = validateThemeTokens(deriveThemeTokens(THEME_PRESETS["deluar-editorial"]));

  assert.equal(validation.meetsAA, true, JSON.stringify(validation.contrastIssues));
  // Red next to olive: similar lightness, flagged as a colour-blindness risk.
  assert.ok(validation.warnings.some((warning) => warning.id === "promo-brand-adjacent"));
});

test("derived colours meet AA by construction for an arbitrary palette", () => {
  const tokens = deriveThemeTokens({
    base: {
      canvas: "#ffffff",
      surface: "#f7f7f7",
      ink: "#1a1a2e",
      cta: "#f2c94c", // light CTA: foreground must flip to dark ink
      brand: "#1f4e79",
      promo: "#c0392b",
    },
  });
  const validation = validateThemeTokens(tokens);

  assert.equal(tokens.ctaForeground, "#1a1a2e");
  assert.equal(tokens.brandForeground, "#f7f7f7");
  assert.ok(contrastRatio(tokens.inkMuted, tokens.canvas) >= 4.5);
  assert.ok(contrastRatio(tokens.lineStrong, tokens.canvas) >= 3);
  assert.equal(validation.meetsAA, true, JSON.stringify(validation.contrastIssues));
});

test("brandAlt follows brand unless pinned; its foreground follows the final brandAlt", () => {
  const editorial = deriveThemeTokens(THEME_PRESETS["deluar-editorial"]);
  assert.equal(editorial.brandAlt, editorial.brand);

  const actual = deriveThemeTokens(THEME_PRESETS.actual);
  assert.equal(actual.brand, "#604738");
  assert.equal(actual.brandAlt, "#465344");
  assert.equal(actual.brandAltForeground, "#fffaf4");

  // A light pinned brandAlt must get the dark foreground, not brand's light one.
  const lightAlt = deriveThemeTokens({
    base: THEME_PRESETS.actual.base,
    overrides: { brandAlt: "#f2e6c9" },
  });
  assert.equal(lightAlt.brandAltForeground, THEME_PRESETS.actual.base.ink);
  assert.ok(contrastRatio(lightAlt.brandAltForeground, lightAlt.brandAlt) >= 4.5);
});

test("error is the shared red, independent of the editable colours and promo", () => {
  const actual = deriveThemeTokens(THEME_PRESETS.actual);
  const editorial = deriveThemeTokens(THEME_PRESETS["deluar-editorial"]);
  assert.equal(actual.error, ERROR_ANCHOR);
  assert.equal(editorial.error, ERROR_ANCHOR);

  // Changing promo, brand or cta never moves it.
  const repainted = deriveThemeTokens({
    base: { ...THEME_PRESETS.actual.base, promo: "#1f7a3a", brand: "#1f4e79", cta: "#6b21a8" },
  });
  assert.equal(repainted.error, ERROR_ANCHOR);
  assert.notEqual(repainted.error, repainted.promo);

  // On a dark canvas it lightens just enough to stay AA.
  const dark = deriveThemeTokens({
    base: { canvas: "#1c1917", surface: "#26221f", ink: "#f5f0ea", cta: "#f5f0ea", brand: "#8aa086", promo: "#ff6b6b" },
  });
  assert.ok(contrastRatio(dark.error, dark.canvas) >= 4.5);
  assert.ok(contrastRatio(dark.error, dark.surface) >= 4.5);
});

test("Deluar editorial is the default preset; Actual stays available", () => {
  assert.equal(DEFAULT_THEME_PRESET_ID, "deluar-editorial");
  assert.ok(THEME_PRESETS.actual);
});

test("overrides pin derived tokens; invalid overrides are ignored", () => {
  const tokens = deriveThemeTokens({
    base: THEME_PRESETS["deluar-editorial"].base,
    overrides: { line: "#123456", ctaHover: "not-a-colour" },
  });

  assert.equal(tokens.line, "#123456");
  assert.match(tokens.ctaHover, /^#[0-9a-f]{6}$/);
});

test("sanitizeThemeInput falls back per token and drops unknown keys", () => {
  const input = sanitizeThemeInput({
    base: { canvas: "#FFF", ink: "url(javascript:alert(1))", cta: 7 },
    overrides: { line: "#abcdef", injected: "#000000", promoSoft: "red" },
  });

  assert.equal(input.base.canvas, "#ffffff");
  assert.equal(input.base.ink, THEME_PRESETS[DEFAULT_THEME_PRESET_ID].base.ink);
  assert.equal(input.base.cta, THEME_PRESETS[DEFAULT_THEME_PRESET_ID].base.cta);
  assert.deepEqual(input.overrides, { line: "#abcdef" });
  assert.deepEqual(sanitizeThemeInput(null).base, THEME_PRESETS[DEFAULT_THEME_PRESET_ID].base);
});

test("CSS declarations contain only known variables and hex values", () => {
  const css = themeTokensToCssDeclarations(deriveThemeTokens(THEME_PRESETS["deluar-editorial"]));

  assert.match(css, /^(--[a-z-]+:#[0-9a-f]{6};)+$/);
  assert.equal(css.split(";").filter(Boolean).length, Object.keys(THEME_CSS_VARIABLES).length);
});
