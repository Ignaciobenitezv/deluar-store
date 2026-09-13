/**
 * Admin Home borrows the Analytics surfaces so it reads as the same product,
 * but spends colour differently. Analytics colours data; here blue marks what
 * is navigable and amber marks the two things that actually need attention.
 * Everything else stays neutral, so a badge is never decoration.
 */
export const homeColor = {
  canvas: "#e3e6ec",
  surface: "#ffffff",
  surfaceSunken: "#f8fafc",
  border: "#e2e8f0",
  borderSubtle: "#eef2f7",
  ink: "#0f172a",
  muted: "#64748b",
  action: "#3b7ff5",
  actionHover: "#2f6de0",
  actionSoft: "#e8effd",
  actionSofter: "#f1f6fe",
  /** The header band sits on its own tint, the way the reference separates it. */
  headerTint: "#e4ecfa",
  headerTintFade: "#eff4fc",
  positive: "#14804b",
  positiveSoft: "#e8f5ee",
  /** Reserved for a real pending count, nothing else. */
  attention: "#b45309",
  attentionSoft: "#fdf3e3",
  negative: "#c0392f",
  inactive: "#e2e8f0",
  /** A day with no activity inside a spark: present, paler than the bars. */
  sparkInactive: "#dbe6fb",
} as const;

/**
 * The reference gives each module tile its own tint, and that variation is what
 * keeps the row of five from reading as one repeated shape. The hues are the
 * approved categorical family, not free pastels: one per module, fixed.
 */
const NEUTRAL_TILE = {
  soft: "#eef1f6",
  wash: "rgba(148,163,184,0.10)",
  ink: "#64748b",
  glow: "rgba(100,116,139,0.22)",
} as const;

/**
 * One neutral tile for every module. The reference spends no colour on
 * navigation at all — it is saved for state, where it means something.
 */
export const moduleTone = {
  products: NEUTRAL_TILE,
  orders: NEUTRAL_TILE,
  stats: NEUTRAL_TILE,
  shipping: NEUTRAL_TILE,
  customers: NEUTRAL_TILE,
} as const;

/**
 * Three grades of the same frosted glass, chosen by how much reading a surface
 * has to carry. The ground shows through all of them; it shows through least
 * where the text is densest, because legibility outranks the effect.
 *
 * Every grade shares the same construction — a translucent white, a blur, a
 * white hairline, one lit top edge, and an ambient shadow with real offset —
 * so the page reads as one material at three thicknesses rather than as three
 * different treatments.
 */
const GLASS_BASE =
  "border shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_1px_rgba(30,41,59,0.03),0_18px_44px_-30px_rgba(30,41,59,0.32)] backdrop-saturate-[1.12]";

export const glass = {
  /** Plane 1 · the shell. Thinnest, so the ground is legible behind it. */
  shell: `${GLASS_BASE} border-white/55 bg-white/42 backdrop-blur-2xl`,
  /** Plane 2 · figures and the greeting. Clearly glass, still calm. */
  panel: `${GLASS_BASE} border-white/60 bg-white/52 backdrop-blur-2xl`,
  /** Plane 2 · navigation modules. Medium. */
  module: `${GLASS_BASE} border-white/65 bg-white/62 backdrop-blur-xl`,
  /** Plane 2 · dense reading. Most opaque, because rows of text demand it. */
  dense: `${GLASS_BASE} border-white/70 bg-white/78 backdrop-blur-xl`,
} as const;

export const homeUi = {
  module: `rounded-[16px] ${glass.module}`,
  title: "text-[15px] font-semibold tracking-[-0.015em] text-slate-950",
  note: "text-[13px] leading-[1.45] text-slate-600",
  label: "text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600",
} as const;

/**
 * How long ago, in the coarsest unit that still tells the truth. An order from
 * last week does not need its minutes counted.
 */
export function formatRelativeTime(value: Date, now = new Date()) {
  const seconds = Math.max(Math.floor((now.getTime() - value.getTime()) / 1000), 0);

  if (seconds < 60) {
    return "Recién";
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `Hace ${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `Hace ${hours} h`;
  }

  const days = Math.floor(hours / 24);

  if (days < 30) {
    return `Hace ${days} d`;
  }

  const months = Math.floor(days / 30);

  return months < 12 ? `Hace ${months} m` : `Hace ${Math.floor(months / 12)} a`;
}
