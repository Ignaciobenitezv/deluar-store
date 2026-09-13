/**
 * Visual vocabulary for the Ventas surface, sharing the analytics system that
 * /admin/dashboard established: cool neutral surfaces, indigo as the primary
 * data colour, a teal and a sky tone when a second or third series exists, and
 * green / amber / red reserved for what order states actually mean.
 */
export const ledgerColor = {
  // ── Surfaces ─────────────────────────────────────────────────────────
  ground: "#f6f8fb",
  module: "#ffffff",
  inset: "#f8fafc",
  headRow: "#f8fafc",
  rowHover: "#f8fafc",
  rowMarked: "#eef1fb",

  ink: "#0f172a",
  inkSoft: "#334155",
  muted: "#64748b",

  // Cool hairlines: outlines carry no temperature, colour belongs to the data.
  rule: "#eef2f7",
  ruleStrong: "#dfe5ec",
  border: "#e3e8ef",

  accent: "#4f52c9",
  /** The one control that carries a filled brand surface. */
  accentSolid: "#4f52c9",

  // ── Data ─────────────────────────────────────────────────────────────
  /**
   * Colour follows the series, never the tile it sits in. All three belong to
   * the same analytics family; none of them is green, because green here means
   * a paid order, not a quantity.
   */
  series: "#4f52c9",
  seriesSoft: "#a9abe6",
  seriesSecondary: "#0d8b9b",
  seriesTertiary: "#2b87c4",
  /** Days with no activity: present, but clearly inert. */
  inactive: "#e2e8f0",

  positive: "#14804b",
  negative: "#c0392f",
} as const;

/**
 * Order states are the page's only categorical palette, and it is a real
 * partition of the period's orders — not a set of hues chosen per card.
 */
export const ledgerStateStyle: Record<
  string,
  { label: string; color: string; filled: boolean }
> = {
  fulfilled: { label: "Entregadas", color: "#14804b", filled: true },
  paid: { label: "Pagadas", color: "#1f9d55", filled: false },
  pending: { label: "Pendientes de pago", color: "#b45309", filled: false },
  created: { label: "Creadas", color: "#94a3b8", filled: false },
  failed: { label: "Fallidas", color: "#c0392f", filled: false },
  cancelled: { label: "Canceladas", color: "#8c4a44", filled: false },
};

/** Singular labels for the ledger's own state column. */
export const ledgerStateRowLabel: Record<string, string> = {
  fulfilled: "Entregada",
  paid: "Pagada",
  pending: "Pendiente",
  created: "Creada",
  failed: "Fallida",
  cancelled: "Cancelada",
};

export const ledgerRadius = {
  module: "rounded-[8px]",
  control: "rounded-[6px]",
  mark: "rounded-[2px]",
} as const;

export const ledgerUi = {
  module: "border border-[#e3e8ef] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]",

  label: "text-[11px] font-semibold uppercase tracking-[0.12em] text-[#64748b]",
  moduleTitle: "text-[17px] font-semibold tracking-[-0.02em] text-[#0f172a]",
  note: "text-[12.5px] leading-[1.45] text-[#64748b]",
  figure: "tabular-nums tracking-[-0.025em] text-[#0f172a]",

  /** The module header row, shared by the server modules and the chart module. */
  moduleHead:
    "flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-6 pb-4 pt-5",

  link: "text-[#4f52c9] underline-offset-[3px] hover:underline focus-visible:underline",
} as const;

/**
 * Money is set, not printed: the currency mark is smaller and quieter than the
 * digits it belongs to. Presentational only — the value itself is untouched.
 */
export function splitCurrency(formatted: string) {
  const match = formatted.match(/^(\D+)\s*(.*)$/);

  if (!match) {
    return { symbol: "", amount: formatted };
  }

  return { symbol: match[1].trim(), amount: match[2] };
}
