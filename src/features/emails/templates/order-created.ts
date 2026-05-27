import type { Order } from "@/features/order/types";
import {
  escapeHtml,
  renderEmailLayout,
  renderItemsTable,
  renderOrderSummary,
} from "@/features/emails/templates/shared";

export function renderOrderCreatedEmail(order: Order) {
  return renderEmailLayout({
    title: "Recibimos tu pedido en Deluar",
    preview: `Recibimos tu pedido ${order.orderNumber}. El pago esta pendiente.`,
    children: `
      <h1 style="margin:0 0 12px;color:#2f241f;font-size:24px;line-height:1.25;">Recibimos tu pedido</h1>
      <p style="margin:0 0 18px;color:#5f4b42;font-size:15px;line-height:1.6;">
        Hola ${escapeHtml(order.customer.firstName)}, tu pedido ya fue registrado. Te avisaremos cuando el pago se confirme.
      </p>
      ${renderOrderSummary(order)}
      ${renderItemsTable(order)}
      <div style="font-size:14px;line-height:1.7;color:#2f241f;">
        <strong>Datos de contacto</strong><br />
        Email: ${escapeHtml(order.customer.email)}<br />
        Telefono: ${escapeHtml(order.customer.phone)}
      </div>
    `,
  });
}
