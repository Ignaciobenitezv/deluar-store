import type { OrderStatus, PaymentStatus } from "@/generated/prisma/client";

type MercadoPagoState = string | undefined | null;

export type MercadoPagoMappedStatus = {
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
};

export function mapMercadoPagoStatus(state: MercadoPagoState): MercadoPagoMappedStatus {
  const normalized = String(state ?? "").toLowerCase();

  if (normalized === "approved") {
    return { orderStatus: "PAID", paymentStatus: "APPROVED" };
  }

  if (normalized === "pending" || normalized === "in_process") {
    return { orderStatus: "PENDING_PAYMENT", paymentStatus: "PENDING" };
  }

  if (normalized === "rejected") {
    return { orderStatus: "PAYMENT_FAILED", paymentStatus: "REJECTED" };
  }

  if (normalized === "cancelled" || normalized === "canceled") {
    return { orderStatus: "CANCELLED", paymentStatus: "CANCELLED" };
  }

  if (normalized === "refunded") {
    return { orderStatus: "REFUNDED", paymentStatus: "REFUNDED" };
  }

  return { orderStatus: "PENDING_PAYMENT", paymentStatus: "PENDING" };
}
