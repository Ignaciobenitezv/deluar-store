type OrderStateLike = {
  status: string;
  paymentStatus: string;
};

export function isPaidOrder(order: OrderStateLike) {
  return order.status === "PAID" || order.status === "FULFILLED" || order.paymentStatus === "APPROVED";
}

export function isPendingPaymentOrder(order: OrderStateLike) {
  return order.status === "PENDING_PAYMENT" || order.paymentStatus === "PENDING";
}

export function isFailedOrder(order: OrderStateLike) {
  return order.status === "PAYMENT_FAILED" || order.paymentStatus === "REJECTED" || order.paymentStatus === "CHARGED_BACK";
}

export function isCancelledOrder(order: OrderStateLike) {
  return order.status === "CANCELLED" || order.paymentStatus === "CANCELLED";
}

export function isFulfilledOrder(order: OrderStateLike) {
  return order.status === "FULFILLED";
}
