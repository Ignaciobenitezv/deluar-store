import type { Order } from "@/features/order/types";
import { getShippingMethodLabel } from "@/features/shipping/shipping";

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

const paymentMethodLabels: Record<Order["paymentMethod"], string> = {
  gocuotas: "GoCuotas",
  transfer: "Transferencia bancaria",
  getnet: "Metodo legado",
  unicobros: "Unicobros",
};

const paymentStatusLabels: Record<Order["paymentStatus"], string> = {
  not_started: "No iniciado",
  pending: "Pendiente",
  approved: "Aprobado",
  rejected: "Rechazado",
  cancelled: "Cancelado",
  refunded: "Reintegrado",
  charged_back: "Contracargo",
};

const orderStatusLabels: Record<Order["status"], string> = {
  created: "Creada",
  pending_payment: "Pendiente de pago",
  paid: "Pagada",
  payment_failed: "Pago fallido",
  cancelled: "Cancelada",
  expired: "Expirada",
  fulfilled: "Completada",
  refunded: "Reintegrada",
};

export function escapeHtml(value: string | number | undefined | null) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

export function formatPaymentMethod(method: Order["paymentMethod"]) {
  return paymentMethodLabels[method] ?? method;
}

export function formatPaymentStatus(status: Order["paymentStatus"]) {
  return paymentStatusLabels[status] ?? status;
}

export function formatOrderStatus(status: Order["status"]) {
  return orderStatusLabels[status] ?? status;
}

export function renderEmailLayout(params: {
  title: string;
  preview: string;
  children: string;
}) {
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(params.title)}</title>
  </head>
  <body style="margin:0;background:#f8f4ef;color:#2f241f;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(params.preview)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f4ef;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border:1px solid #eadfd7;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="background:#6f4b3a;padding:24px 28px;color:#f8f4ef;">
                <div style="font-size:20px;font-weight:700;letter-spacing:.02em;">DELUAR</div>
                <div style="font-size:13px;margin-top:4px;opacity:.86;">Tienda online</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                ${params.children}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px;background:#fbf8f5;color:#6f4b3a;font-size:13px;line-height:1.5;border-top:1px solid #eadfd7;">
                Si tenes alguna consulta, respondé este email o escribinos por WhatsApp. Gracias por elegir Deluar.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function renderItemsTable(order: Order) {
  const rows = order.items
    .map(
      (item) => `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #eee4dd;">
            <div style="font-weight:600;color:#2f241f;">${escapeHtml(item.title)}</div>
            <div style="font-size:13px;color:#7a6256;">${escapeHtml(item.productSlug)}</div>
          </td>
          <td align="center" style="padding:12px 8px;border-bottom:1px solid #eee4dd;color:#2f241f;">${item.quantity}</td>
          <td align="right" style="padding:12px 0;border-bottom:1px solid #eee4dd;color:#2f241f;">${formatCurrency(item.lineTotal)}</td>
        </tr>`,
    )
    .join("");

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:20px 0;">
      <thead>
        <tr>
          <th align="left" style="padding:0 0 10px;border-bottom:1px solid #d9c9bd;color:#6f4b3a;font-size:12px;text-transform:uppercase;">Producto</th>
          <th align="center" style="padding:0 8px 10px;border-bottom:1px solid #d9c9bd;color:#6f4b3a;font-size:12px;text-transform:uppercase;">Cant.</th>
          <th align="right" style="padding:0 0 10px;border-bottom:1px solid #d9c9bd;color:#6f4b3a;font-size:12px;text-transform:uppercase;">Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

export function renderOrderSummary(order: Order) {
  return `
    <div style="background:#fbf8f5;border:1px solid #eadfd7;border-radius:12px;padding:16px;margin:20px 0;">
      <div style="font-size:14px;line-height:1.7;color:#2f241f;">
        <div><strong>Orden:</strong> ${escapeHtml(order.orderNumber)}</div>
        <div><strong>Metodo de pago:</strong> ${escapeHtml(formatPaymentMethod(order.paymentMethod))}</div>
        <div><strong>Metodo de envio:</strong> ${escapeHtml(getShippingMethodLabel(order.shippingMethod))}</div>
        <div><strong>Costo de envio:</strong> ${formatCurrency(order.shippingCost)}</div>
        <div><strong>Estado del pago:</strong> ${escapeHtml(formatPaymentStatus(order.paymentStatus))}</div>
        <div><strong>Total:</strong> ${formatCurrency(order.total)}</div>
      </div>
    </div>`;
}

export function renderCustomerBlock(order: Order) {
  const fullName = `${order.customer.firstName} ${order.customer.lastName}`.trim();

  return `
    <div style="font-size:14px;line-height:1.7;color:#2f241f;">
      <div><strong>Cliente:</strong> ${escapeHtml(fullName)}</div>
      <div><strong>Email:</strong> ${escapeHtml(order.customer.email)}</div>
      <div><strong>Telefono:</strong> ${escapeHtml(order.customer.phone)}</div>
    </div>`;
}

export function renderShippingBlock(order: Order) {
  const address = [
    order.shippingAddress.address,
    order.shippingAddress.city,
    order.shippingAddress.province,
    order.shippingAddress.postalCode,
  ]
    .filter(Boolean)
    .join(", ");

  return `
    <div style="font-size:14px;line-height:1.7;color:#2f241f;">
      <div><strong>Direccion/envio:</strong> ${escapeHtml(address || "Sin direccion cargada")}</div>
      <div><strong>Metodo de envio:</strong> ${escapeHtml(getShippingMethodLabel(order.shippingMethod))}</div>
      <div><strong>Costo de envio:</strong> ${formatCurrency(order.shippingCost)}</div>
      ${
        order.customer.notes
          ? `<div><strong>Notas:</strong> ${escapeHtml(order.customer.notes)}</div>`
          : ""
      }
    </div>`;
}
