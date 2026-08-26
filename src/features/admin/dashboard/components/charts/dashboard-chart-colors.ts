export const dashboardChartColors = {
  navy: "#314158",
  navySoft: "#4b5f77",
  sky: "#3b82f6",
  emerald: "#10b981",
  amber: "#f59e0b",
  rose: "#f43f5e",
  slate: "#64748b",
  slateSoft: "#cbd5e1",
  grid: "#e2e8f0",
  surface: "#f8fafc",
} as const;

export const orderStatusChartColors: Record<string, string> = {
  CREATED: "#94a3b8",
  PENDING_PAYMENT: "#f59e0b",
  PAID: "#10b981",
  PAYMENT_FAILED: "#f43f5e",
  CANCELLED: "#64748b",
  EXPIRED: "#cbd5e1",
  FULFILLED: "#314158",
  REFUNDED: "#3b82f6",
};

export const paymentMethodChartColors = [
  "#314158",
  "#3f536d",
  "#5b708b",
  "#7c93ab",
  "#9fb1c3",
  "#c6d2de",
];
