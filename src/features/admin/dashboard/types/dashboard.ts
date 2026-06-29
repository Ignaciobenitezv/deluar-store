export type DashboardPeriodValue = "today" | "7d" | "30d" | "90d";

export type DashboardSectionId =
  | "overview"
  | "sales"
  | "checkout"
  | "products"
  | "customers"
  | "location"
  | "payments"
  | "shipping"
  | "marketing"
  | "reports";

export type DashboardTone = "neutral" | "success" | "warning" | "accent" | "danger";

export type DashboardNavItem = {
  id: DashboardSectionId;
  label: string;
  href: string;
  description: string;
  group: "principal" | "commerce" | "operations" | "future";
};

export type DashboardRankingItem = {
  id: string;
  title: string;
  subtitle?: string;
  value: number;
  secondaryValue?: string;
  tone?: DashboardTone;
};

export type DashboardStatBadgeTone = "approved" | "pending" | "failed" | "cancelled" | "neutral" | "warning";
