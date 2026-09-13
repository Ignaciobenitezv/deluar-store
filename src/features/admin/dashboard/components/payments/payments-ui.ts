/**
 * Payments is the one analytics page where colour is not mostly blue: a payment
 * *is* its state, so state owns the palette. Blue stays on volume and money;
 * green, amber, coral and violet are spent only on what they mean.
 */
export const paymentColor = {
  primary: "#3b7ff5",
  primaryHover: "#2f6de0",
  primarySoft: "#bcd4fb",
  track: "#e8effd",
  tile: "#e8effd",
  tileSoft: "#f1f6fe",
  teal: "#0d8b9b",
  positive: "#14804b",
  negative: "#c0392f",
} as const;

/** One tone per PaymentStatus, used identically in arc, legend and badge. */
export const paymentStatusTone: Record<string, { color: string; soft: string; ink: string }> = {
  APPROVED: { color: "#14804b", soft: "#e8f5ee", ink: "#0f6b3d" },
  PENDING: { color: "#d08700", soft: "#fdf3e3", ink: "#8a5a06" },
  REJECTED: { color: "#e2564d", soft: "#fbeceb", ink: "#a8352c" },
  CHARGED_BACK: { color: "#b3352b", soft: "#fbeceb", ink: "#8f2a22" },
  REFUNDED: { color: "#7b4bc4", soft: "#f1ebfa", ink: "#5f37a0" },
  CANCELLED: { color: "#94a3b8", soft: "#f1f5f9", ink: "#475569" },
  NOT_STARTED: { color: "#cbd5e1", soft: "#f1f5f9", ink: "#64748b" },
};

export function toneForStatus(status: string) {
  return paymentStatusTone[status] ?? paymentStatusTone.NOT_STARTED;
}
