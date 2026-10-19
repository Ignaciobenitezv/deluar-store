// Storefront theme model. Tokens are named by role, never by hue: the
// person editing the palette may pick any colour for any role.

/** The six colours the admin will be able to edit. */
export type ThemeBaseColors = {
  /** Page background. */
  canvas: string;
  /** Cards, panels, drawers. */
  surface: string;
  /** Headings and body text. */
  ink: string;
  /** Primary call to action (add to cart, checkout). */
  cta: string;
  /** Brand surfaces (announcement bar, benefits, footer). */
  brand: string;
  /** Promotional price and discount only. */
  promo: string;
};

/** Everything the storefront consumes, base colours included. */
export type ThemeTokens = ThemeBaseColors & {
  canvasAlt: string;
  /** Raised panels above the canvas: cards, header, menus, drawers. */
  surfaceRaised: string;
  inkMuted: string;
  line: string;
  lineStrong: string;
  ctaHover: string;
  ctaForeground: string;
  brandHover: string;
  brandSoft: string;
  brandForeground: string;
  /**
   * Secondary brand surface (e.g. the home benefits strip). Follows `brand`
   * unless a preset pins it; not one of the six editable colours.
   */
  brandAlt: string;
  brandAltForeground: string;
  promoStrong: string;
  promoSoft: string;
  promoForeground: string;
  /** Decorative warm detail: ornamental borders, active pills, timeline. */
  accent: string;
  /** Soft decorative fill: eyebrow chips, highlight backgrounds. */
  accentSoft: string;
  /** Validation errors and blocking notices (text, borders, tints). */
  error: string;
  focusRing: string;
};

export type ThemeTokenName = keyof ThemeTokens;

export type DerivedTokenName = Exclude<ThemeTokenName, keyof ThemeBaseColors>;

/**
 * What gets stored (a preset in code, or the custom palette of the Sanity document): the
 * base colours plus optional pinned values for derived tokens.
 */
export type ThemeInput = {
  base: ThemeBaseColors;
  overrides?: Partial<Record<DerivedTokenName, string>>;
};

export type ThemePresetId = "actual" | "deluar-editorial";

export type ThemePreset = ThemeInput & {
  id: ThemePresetId;
  label: string;
  description: string;
};

/**
 * Why the default preset is rendered instead of the published document:
 * none published, unreadable values, or Sanity unreachable. (Low contrast is
 * not a reason: it is only a warning.)
 */
export type ThemeFallbackReason = "missing" | "invalid" | "unavailable";

/** The theme the storefront renders, wherever it came from. */
export type StorefrontTheme = {
  source:
    | { kind: "preset"; presetId: ThemePresetId }
    | { kind: "custom" }
    | { kind: "fallback"; presetId: ThemePresetId; reason: ThemeFallbackReason; detail?: string };
  tokens: ThemeTokens;
  /**
   * Set only for an authorised admin in draft mode: the saved draft is being
   * previewed (or was unreadable, and the published theme is shown instead).
   */
  preview?: { hasDraft: boolean; draftRejected: boolean };
};
