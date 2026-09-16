/**
 * The checkout page's own reading of the analytics system: blue carries the
 * funnel's volume, coral carries what is lost. Nothing here decorates — every
 * value is spent on a quantity or on a state.
 */
export const checkoutColor = {
  primary: "#3b7ff5",
  primaryHover: "#2f6de0",
  /** The funnel darkens toward the top and lightens toward the bottom. */
  funnel: ["#2f6de0", "#3b7ff5", "#5c95f7", "#7dabf9", "#9dc1fb", "#bcd4fb"] as const,
  track: "var(--admin-surface-elevated)",
  tile: "var(--admin-info-soft)",
  tileSoft: "var(--admin-surface-elevated)",
  /** Reserved for loss, in the funnel and in the drop-off list. */
  loss: "#e2564d",
  lossTrack: "var(--admin-danger-soft)",
  teal: "#0d8b9b",
  ink: "var(--admin-text-primary)",
  positive: "var(--admin-success)",
  warning: "var(--admin-warning)",
} as const;

/** The four series of the evolution chart, in funnel order. */
export const checkoutSeriesColor = {
  carts: "#3b7ff5",
  checkouts: "#7dabf9",
  orders: "#0d8b9b",
  purchases: "var(--admin-success)",
} as const;
