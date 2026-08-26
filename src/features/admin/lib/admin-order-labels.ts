import { getOrderStatusLabel } from "@/features/order/status";

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  GOCUOTAS: "GoCuotas",
  MERCADO_PAGO: "Mercado Pago",
  TRANSFER: "Transferencia",
  GETNET: "Getnet",
  UNICOBROS: "Unicobros",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: "No iniciado",
  PENDING: "Pendiente",
  APPROVED: "Pagado",
  REJECTED: "Fallido",
  CANCELLED: "Cancelado",
  REFUNDED: "Reembolsado",
  CHARGED_BACK: "Contracargo",
};

const SHIPPING_METHOD_LABELS: Record<string, string> = {
  home_delivery: "Envío a domicilio",
  city_branch: "Envío a sucursal de tu ciudad",
  resistance_pickup: "Retiro en Resistencia",
};

function normalizeKey(value: string) {
  return value.toUpperCase();
}

export function getAdminOrderStatusLabel(status: string) {
  return getOrderStatusLabel(status as Parameters<typeof getOrderStatusLabel>[0]);
}

export function getAdminPaymentMethodLabel(method: string) {
  const normalized = normalizeKey(method);
  return PAYMENT_METHOD_LABELS[normalized] ?? method;
}

export function getAdminPaymentStatusLabel(status: string) {
  const normalized = normalizeKey(status);
  return PAYMENT_STATUS_LABELS[normalized] ?? status;
}

export function getAdminShippingMethodLabel(method: string) {
  return SHIPPING_METHOD_LABELS[method] ?? method;
}
