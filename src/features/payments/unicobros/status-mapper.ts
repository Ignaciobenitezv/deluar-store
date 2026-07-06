import type { OrderStatus, PaymentStatus } from "@/generated/prisma/client";

export type UnicobrosMappedStatus = {
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  category: "approved" | "pending" | "cancelled" | "failed" | "review";
};

export function mapUnicobrosStatus(code: number | undefined): UnicobrosMappedStatus {
  switch (code) {
    case 0:
    case 1:
      return { orderStatus: "PENDING_PAYMENT", paymentStatus: "PENDING", category: "pending" };
    case 2:
    case 3:
    case 4:
    case 100:
    case 201:
    case 600:
    case 605:
    case 800:
      return { orderStatus: "PENDING_PAYMENT", paymentStatus: "PENDING", category: "review" };
    case 200:
    case 210:
    case 300:
    case 301:
    case 302:
    case 303:
      return { orderStatus: "PAID", paymentStatus: "APPROVED", category: "approved" };
    case 401:
    case 402:
    case 601:
    case 602:
    case 603:
    case 606:
    case 610:
      return {
        orderStatus: code === 401 ? "EXPIRED" : "CANCELLED",
        paymentStatus: "CANCELLED",
        category: "cancelled",
      };
    case 400:
    case 403:
    case 410:
    case 411:
    case 412:
    case 413:
    case 414:
    case 415:
    case 416:
    case 417:
    case 500:
    case 501:
    case 604:
      return { orderStatus: "PAYMENT_FAILED", paymentStatus: "REJECTED", category: "failed" };
    default:
      return { orderStatus: "PENDING_PAYMENT", paymentStatus: "PENDING", category: "review" };
  }
}
