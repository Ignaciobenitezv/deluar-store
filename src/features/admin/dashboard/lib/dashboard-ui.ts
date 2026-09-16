/**
 * Shared class strings for the dashboard/analytics surface, all built on the
 * semantic admin tokens (src/app/admin/admin-theme.css) so this system
 * renders correctly in both light and dark without per-component overrides.
 * Only keys actually referenced elsewhere are kept — dead entries were
 * removed rather than carried forward unused.
 */
export const dashboardUi = {
  pageOuter: "min-h-screen bg-background text-text-primary",

  card: "rounded-2xl border border-border bg-surface",
  cardHeader: "flex flex-wrap items-start justify-between gap-2 border-b border-border px-4 py-3 sm:gap-3 sm:px-5 sm:py-3.5",
  cardBody: "px-4 py-4 sm:px-5 sm:py-4 lg:px-6 lg:py-5",

  sectionTitle: "text-[13px] font-semibold tracking-[-0.01em] text-text-primary",
  sectionDescription: "mt-1 text-[12.5px] leading-5 text-text-secondary",
  mutedLabel: "text-[10px] font-semibold uppercase tracking-[0.16em] text-text-secondary",

  pill: "inline-flex items-center rounded-md border border-border bg-surface-elevated px-2 py-[3px] text-[10px] font-semibold uppercase tracking-[0.14em] text-text-secondary",
  labelPill: "inline-flex items-center rounded-md bg-surface-elevated px-2 py-[3px] text-[10px] font-semibold uppercase tracking-[0.14em] text-text-secondary",

  primaryAction:
    "rounded-xl border border-primary bg-primary text-primary-foreground shadow-[var(--admin-shadow-sm)] transition-colors duration-150 hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
  softAction:
    "rounded-xl border border-border bg-surface text-text-primary shadow-[var(--admin-shadow-sm)] transition-colors duration-150 hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20",

  shadowSoft: "shadow-[var(--admin-shadow-sm)]",

  shellInner: "grid gap-3 min-w-0 sm:gap-4",
  contentPadding: "px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-6",
  pageStack: "space-y-3 sm:space-y-4",
} as const;
