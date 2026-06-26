import type { OrderStatus as CheckoutOrderStatus } from "@/features/order/types";
import type { OrderStatus as PersistedOrderStatus } from "@/generated/prisma/enums";
import type { PaymentMethod } from "@/features/payments/types";

export type OrderStatusInput = CheckoutOrderStatus | PersistedOrderStatus;

export type OrderStatusTone =
  | "neutral"
  | "progress"
  | "success"
  | "warning"
  | "danger";

export type OrderTimelineStepState = "complete" | "current" | "pending";

export type OrderTimelineStep = {
  id: "received" | "payment" | "preparing" | "completed";
  label: string;
  state: OrderTimelineStepState;
};

export type OrderTimelineOptions = {
  paymentMethod?: PaymentMethod;
  paymentStatus?: "not_started" | "pending" | "approved" | "rejected" | "cancelled" | "refunded" | "charged_back";
};

export type OrderTimeline =
  | {
      kind: "progress";
      steps: OrderTimelineStep[];
    }
  | {
      kind: "terminal";
      label: string;
      description: string;
      tone: OrderStatusTone;
      steps: OrderTimelineStep[];
    };

type OrderStatusMetadata = {
  label: string;
  description: string;
  tone: OrderStatusTone;
};

const FALLBACK_STATUS: PersistedOrderStatus = "CREATED";

const ORDER_STATUS_ALIASES = {
  created: "CREATED",
  pending_payment: "PENDING_PAYMENT",
  paid: "PAID",
  payment_failed: "PAYMENT_FAILED",
  cancelled: "CANCELLED",
  expired: "EXPIRED",
  fulfilled: "FULFILLED",
  refunded: "REFUNDED",
} as const satisfies Record<CheckoutOrderStatus, PersistedOrderStatus>;

export const ORDER_STATUS_METADATA = {
  CREATED: {
    label: "Pedido creado",
    description: "Recibimos tu pedido y estamos esperando el siguiente paso de pago.",
    tone: "neutral",
  },
  PENDING_PAYMENT: {
    label: "Esperando pago",
    description: "Tu pedido esta creado y queda pendiente la confirmacion del pago.",
    tone: "progress",
  },
  PAID: {
    label: "Pago aprobado",
    description: "El pago fue aprobado y vamos a preparar tu pedido.",
    tone: "success",
  },
  PAYMENT_FAILED: {
    label: "Pago rechazado",
    description: "El pago no pudo aprobarse. Podes volver a intentar la compra.",
    tone: "danger",
  },
  CANCELLED: {
    label: "Cancelado",
    description: "El pedido fue cancelado y no continuara su preparacion.",
    tone: "neutral",
  },
  EXPIRED: {
    label: "Expirado",
    description: "El plazo de pago expiro y el pedido no continuara su preparacion.",
    tone: "warning",
  },
  FULFILLED: {
    label: "Entregado",
    description: "El pedido fue completado.",
    tone: "success",
  },
  REFUNDED: {
    label: "Reembolsado",
    description: "El pago fue reembolsado.",
    tone: "warning",
  },
} as const satisfies Record<PersistedOrderStatus, OrderStatusMetadata>;

export const ORDER_STATUS_FLOW: OrderTimelineStep[] = [
  {
    id: "received",
    label: "Pedido recibido",
    state: "pending",
  },
  {
    id: "payment",
    label: "Pago confirmado",
    state: "pending",
  },
  {
    id: "preparing",
    label: "Preparando pedido",
    state: "pending",
  },
  {
    id: "completed",
    label: "Pedido completado",
    state: "pending",
  },
];

const TERMINAL_STATUSES = new Set<PersistedOrderStatus>([
  "PAYMENT_FAILED",
  "CANCELLED",
  "EXPIRED",
  "REFUNDED",
]);

function normalizeOrderStatus(status: OrderStatusInput): PersistedOrderStatus {
  if (status in ORDER_STATUS_METADATA) {
    return status as PersistedOrderStatus;
  }

  return ORDER_STATUS_ALIASES[status as CheckoutOrderStatus] ?? FALLBACK_STATUS;
}

function createFlow(
  states: OrderTimelineStepState[],
  options: OrderTimelineOptions = {},
): OrderTimelineStep[] {
  return ORDER_STATUS_FLOW.map((step, index) => ({
    ...step,
    label:
      step.id === "payment" &&
      options.paymentMethod === "transfer" &&
      options.paymentStatus === "pending"
        ? "Esperando pago"
        : step.label,
    state: states[index] ?? "pending",
  }));
}

export function getOrderStatusLabel(status: OrderStatusInput) {
  return ORDER_STATUS_METADATA[normalizeOrderStatus(status)].label;
}

export function getOrderStatusDescription(status: OrderStatusInput) {
  return ORDER_STATUS_METADATA[normalizeOrderStatus(status)].description;
}

export function getOrderStatusTone(status: OrderStatusInput) {
  return ORDER_STATUS_METADATA[normalizeOrderStatus(status)].tone;
}

export function getOrderStatusBadgeClasses(status: OrderStatusInput) {
  const tone = getOrderStatusTone(status);

  switch (tone) {
    case "success":
      return "border-emerald-700/20 bg-emerald-50 text-emerald-800";
    case "danger":
      return "border-red-700/20 bg-red-50 text-red-800";
    case "warning":
      return "border-amber-700/20 bg-amber-50 text-amber-800";
    case "progress":
      return "border-[var(--color-accent-strong)]/25 bg-[rgba(182,146,114,0.14)] text-[var(--color-accent-strong)]";
    case "neutral":
    default:
      return "border-border bg-surface text-foreground";
  }
}

export function buildOrderTimeline(
  status: OrderStatusInput,
  options: OrderTimelineOptions = {},
): OrderTimeline {
  const normalizedStatus = normalizeOrderStatus(status);
  const metadata = ORDER_STATUS_METADATA[normalizedStatus];

  if (TERMINAL_STATUSES.has(normalizedStatus)) {
    return {
      kind: "terminal",
      label: metadata.label,
      description: metadata.description,
      tone: metadata.tone,
      steps: createFlow(["complete", "pending", "pending", "pending"], options),
    };
  }

  if (normalizedStatus === "FULFILLED") {
    return {
      kind: "progress",
      steps: createFlow(["complete", "complete", "complete", "complete"], options),
    };
  }

  if (normalizedStatus === "PAID") {
    return {
      kind: "progress",
      steps: createFlow(["complete", "complete", "current", "pending"], options),
    };
  }

  if (normalizedStatus === "PENDING_PAYMENT") {
    return {
      kind: "progress",
      steps: createFlow(["complete", "current", "pending", "pending"], options),
    };
  }

  return {
    kind: "progress",
    steps: createFlow(["complete", "pending", "pending", "pending"], options),
  };
}
