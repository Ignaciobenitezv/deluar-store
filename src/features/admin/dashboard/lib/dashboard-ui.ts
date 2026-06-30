import type { DashboardStatBadgeTone, DashboardTone } from "../types/dashboard";

export const dashboardUi = {
  pageBackground: "bg-[#f6f7fb]",
  pageOuter: "min-h-screen bg-[#f6f7fb] text-foreground overflow-x-clip",
  shell: "rounded-[24px] border border-slate-200/50 bg-white shadow-[0_10px_22px_rgba(15,23,42,0.03)] sm:rounded-[30px] sm:shadow-[0_12px_28px_rgba(15,23,42,0.035)]",
  surface: "bg-white",
  card: "rounded-[22px] border border-slate-200/50 bg-white shadow-[0_8px_18px_rgba(15,23,42,0.028)] sm:rounded-[26px] sm:shadow-[0_10px_22px_rgba(15,23,42,0.03)]",
  cardInset: "rounded-[18px] border border-slate-200/50 bg-white sm:rounded-[20px]",
  cardHeader:
    "flex flex-wrap items-start justify-between gap-2 px-4 py-3 sm:gap-3 sm:px-5 sm:py-4 lg:px-6",
  cardBody: "px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6",
  sectionTitle: "text-sm font-semibold tracking-[-0.02em] text-slate-900",
  sectionDescription: "mt-1 text-sm leading-6 text-slate-500",
  mutedLabel: "text-[11px] uppercase tracking-[0.22em] text-slate-500",
  shellGrid: "grid gap-3 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-4",
  shellInner: "grid gap-3 min-w-0 sm:gap-4",
  contentMaxWidth: "max-w-[1520px]",
  contentPadding: "px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-6",
  panelPadding: "p-4 sm:p-5 lg:p-6",
  pageStack: "space-y-3 sm:space-y-4",
  shadowSoft: "shadow-[0_8px_18px_rgba(15,23,42,0.028)]",
  shadowCard: "shadow-[0_8px_18px_rgba(15,23,42,0.028)] sm:shadow-[0_10px_22px_rgba(15,23,42,0.03)]",
  radiusCard: "rounded-[22px] sm:rounded-[26px]",
  radiusKpi: "rounded-[20px] sm:rounded-[22px]",
  divider: "border-slate-200/50",
  spacingPage: "gap-4 sm:gap-5",
  spacingSection: "gap-3 sm:gap-4",
  pill: "inline-flex items-center rounded-full border border-slate-200/60 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500",
  labelPill: "inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600",
  navbarSurface: "bg-white/95 backdrop-blur",
};

export const dashboardToneStyles: Record<DashboardTone, string> = {
  neutral: "border-slate-200/70 bg-white text-slate-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  accent: "border-sky-200 bg-sky-50 text-sky-900",
  danger: "border-rose-200 bg-rose-50 text-rose-900",
};

export const dashboardStatBadgeStyles: Record<DashboardStatBadgeTone, string> = {
  approved: "border-emerald-200 bg-emerald-50 text-emerald-900",
  pending: "border-amber-200 bg-amber-50 text-amber-900",
  failed: "border-rose-200 bg-rose-50 text-rose-900",
  cancelled: "border-slate-200 bg-slate-50 text-slate-800",
  neutral: "border-slate-200 bg-white text-slate-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
};
