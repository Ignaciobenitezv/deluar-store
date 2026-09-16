/**
 * Payments is the one analytics page where colour is not mostly blue: a payment
 * *is* its state, so state owns the palette. Blue stays on volume and money;
 * green, amber, coral and violet are spent only on what they mean.
 */
export const paymentColor = {
  primary: "#3b7ff5",
  primaryHover: "#2f6de0",
  primarySoft: "var(--admin-info-soft)",
  track: "var(--admin-surface-elevated)",
  tile: "var(--admin-info-soft)",
  tileSoft: "var(--admin-surface-elevated)",
  teal: "#0d8b9b",
  positive: "var(--admin-success)",
  negative: "var(--admin-danger)",
} as const;

/** One tone per PaymentStatus, used identically in arc, legend and badge. */
export const paymentStatusTone: Record<string, { color: string; soft: string; ink: string }> = {
  APPROVED: { color: "var(--admin-success)", soft: "var(--admin-success-soft)", ink: "var(--admin-success)" },
  PENDING: { color: "var(--admin-warning)", soft: "var(--admin-warning-soft)", ink: "var(--admin-warning)" },
  REJECTED: { color: "var(--admin-danger)", soft: "var(--admin-danger-soft)", ink: "var(--admin-danger)" },
  CHARGED_BACK: { color: "var(--admin-danger)", soft: "var(--admin-danger-soft)", ink: "var(--admin-danger)" },
  REFUNDED: { color: "var(--admin-violet)", soft: "var(--admin-violet-soft)", ink: "var(--admin-violet)" },
  CANCELLED: { color: "var(--admin-text-secondary)", soft: "var(--admin-surface-elevated)", ink: "var(--admin-text-secondary)" },
  NOT_STARTED: { color: "var(--admin-text-secondary)", soft: "var(--admin-surface-elevated)", ink: "var(--admin-text-secondary)" },
};

export function toneForStatus(status: string) {
  return paymentStatusTone[status] ?? paymentStatusTone.NOT_STARTED;
}
