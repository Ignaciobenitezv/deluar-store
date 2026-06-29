import type { DashboardStatBadgeTone, DashboardTone } from "../types/dashboard";

export const dashboardUi = {
  pageBackground: "bg-[#f6f7fb]",
  pageOuter: "min-h-screen bg-[#f6f7fb] text-foreground",
  shell: "rounded-[28px] border border-slate-200/70 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.05)]",
  surface: "bg-white",
  card: "rounded-[24px] border border-slate-200/70 bg-white shadow-[0_12px_28px_rgba(15,23,42,0.04)]",
  cardInset: "rounded-[18px] border border-slate-200/70 bg-white",
  cardHeader:
    "flex flex-wrap items-start justify-between gap-3 border-b border-slate-200/70 px-5 py-4",
  cardBody: "px-5 py-5",
  sectionTitle: "text-sm font-semibold tracking-[-0.02em] text-slate-900",
  sectionDescription: "mt-1 text-sm leading-6 text-slate-500",
  mutedLabel: "text-[11px] uppercase tracking-[0.22em] text-slate-500",
  shellGrid: "grid gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]",
  shellInner: "grid gap-5 min-w-0",
  contentMaxWidth: "max-w-[1480px]",
  contentPadding: "px-4 py-4 lg:px-6 lg:py-6",
  panelPadding: "p-5 lg:p-6",
  pageStack: "space-y-4",
  shadowSoft: "shadow-[0_10px_24px_rgba(15,23,42,0.04)]",
  shadowCard: "shadow-[0_12px_28px_rgba(15,23,42,0.05)]",
  radiusCard: "rounded-[24px]",
  radiusKpi: "rounded-[22px]",
  divider: "border-slate-200/70",
  spacingPage: "gap-5",
  spacingSection: "gap-4",
  pill: "inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500",
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

