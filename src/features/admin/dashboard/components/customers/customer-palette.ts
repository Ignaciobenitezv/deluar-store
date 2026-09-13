/**
 * The customers page keeps its own copy of the blue pair because the reference
 * uses a brighter, purer tone than the indigo the rest of Analytics ships. It
 * lives here so this page can match its reference without touching the shared
 * token every other route reads.
 */
export const customerColor = {
  /** New customers, bar fills, active marks. */
  primary: "#3b7ff5",
  /** Returning customers: the same hue, far lighter. */
  secondary: "#bcd4fb",
  /** The rail a bar sits in — a blue tint, not grey. */
  track: "#e8effd",
  tilePrimary: "#e8effd",
  tileSecondary: "#f1f6fe",
} as const;
