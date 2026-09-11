import type { DashboardStatBadgeTone, DashboardTone } from "../types/dashboard";

export const dashboardUi = {
  // ─── Backgrounds ──────────────────────────────────────────────────────
  pageBackground: "bg-[#f6f7fb]",
  bgPage:         "bg-[#f6f7fb]",
  bgSubtle:       "bg-[#f4f8fb]",
  pageOuter:      "min-h-screen bg-[#f6f7fb] text-foreground",
  surface:        "bg-white",

  // ─── Radius tiers ─────────────────────────────────────────────────────
  radiusShell:   "rounded-[24px] sm:rounded-[28px]",
  radiusCard:    "rounded-[20px] sm:rounded-[24px]",
  radiusInset:   "rounded-[14px] sm:rounded-[16px]",
  radiusInput:   "rounded-[12px]",
  radiusControl: "rounded-[10px]",
  radiusKpi:     "rounded-[20px] sm:rounded-[24px]",

  // ─── Shadows ──────────────────────────────────────────────────────────
  shadowSm:       "shadow-[0_4px_12px_rgba(15,23,42,0.05)]",
  shadowCard:     "shadow-[0_8px_20px_rgba(15,23,42,0.05)]",
  shadowHeader:   "shadow-[0_12px_28px_rgba(15,23,42,0.06)]",
  shadowElevated: "shadow-[0_20px_48px_rgba(15,23,42,0.14)]",
  shadowSoft:     "shadow-[0_4px_12px_rgba(15,23,42,0.05)]",

  // ─── Borders ──────────────────────────────────────────────────────────
  borderDefault: "border-slate-200/60",
  borderSubtle:  "border-slate-200/40",
  divider:       "border-slate-200/60",

  // ─── Compound surfaces ────────────────────────────────────────────────
  shell:
    "rounded-[24px] border border-slate-200/60 bg-white shadow-[0_8px_20px_rgba(15,23,42,0.05)] sm:rounded-[28px] sm:shadow-[0_12px_28px_rgba(15,23,42,0.06)]",
  card:
    "rounded-[20px] border border-slate-200/60 bg-white shadow-[0_8px_20px_rgba(15,23,42,0.05)] sm:rounded-[24px]",
  cardInset:
    "rounded-[14px] border border-slate-200/60 bg-white sm:rounded-[16px]",
  cardHeader:
    "flex flex-wrap items-start justify-between gap-2 px-4 py-3 sm:gap-3 sm:px-5 sm:py-4 lg:px-6",
  cardBody:
    "px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6",

  // ─── Typography ───────────────────────────────────────────────────────
  headingPage:
    "text-[1.5rem] font-semibold tracking-[-0.05em] text-slate-950 sm:text-[2.25rem]",
  sectionTitle:       "text-sm font-semibold tracking-[-0.02em] text-slate-900",
  sectionDescription: "mt-1 text-sm leading-6 text-slate-500",
  mutedLabel:         "text-[11px] font-semibold uppercase tracking-[0.20em] text-slate-500",
  tableHeader:        "text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500",

  // ─── Pills / labels ───────────────────────────────────────────────────
  pill:
    "inline-flex items-center rounded-full border border-slate-200/60 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500",
  labelPill:
    "inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600",

  // ─── Actions ──────────────────────────────────────────────────────────
  primaryAction:
    "rounded-[10px] border border-[#314158] bg-[#314158] text-white shadow-[0_10px_22px_rgba(49,65,88,0.16)] transition hover:border-[#3b4f69] hover:bg-[#3b4f69] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#314158]/30",
  softAction:
    "rounded-[10px] border border-[#d7e0ea] bg-[#eef3f8] text-[#334155] shadow-[0_8px_16px_rgba(15,23,42,0.04)] transition hover:border-[#c8d4e1] hover:bg-[#e4ebf3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/40",

  // ─── Form controls ────────────────────────────────────────────────────
  focusInput:
    "focus:border-[#bda88d] focus:outline-none focus:ring-2 focus:ring-[#d9c8b4]/60",

  // ─── Layout ───────────────────────────────────────────────────────────
  shellGrid:       "grid gap-3 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-4",
  shellInner:      "grid gap-3 min-w-0 sm:gap-4",
  contentMaxWidth: "max-w-[1520px]",
  contentPadding:  "px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-6",
  panelPadding:    "p-4 sm:p-5 lg:p-6",
  pageStack:       "space-y-3 sm:space-y-4",
  spacingPage:     "gap-4 sm:gap-5",
  spacingSection:  "gap-3 sm:gap-4",

  // ─── Misc ─────────────────────────────────────────────────────────────
  navbarSurface: "bg-white/95 backdrop-blur",
};

export const dashboardToneStyles: Record<DashboardTone, string> = {
  neutral: "border-slate-200/70 bg-white text-slate-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  accent:  "border-sky-200 bg-sky-50 text-sky-900",
  danger:  "border-rose-200 bg-rose-50 text-rose-900",
};

export const dashboardStatBadgeStyles: Record<DashboardStatBadgeTone, string> = {
  approved:  "border-emerald-200 bg-emerald-50 text-emerald-900",
  pending:   "border-amber-200 bg-amber-50 text-amber-900",
  failed:    "border-rose-200 bg-rose-50 text-rose-900",
  cancelled: "border-slate-200 bg-slate-50 text-slate-800",
  neutral:   "border-slate-200 bg-white text-slate-900",
  warning:   "border-amber-200 bg-amber-50 text-amber-900",
};
