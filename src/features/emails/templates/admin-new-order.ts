import type { Order } from "@/features/order/types";
import {
  escapeHtml,
  formatCurrency,
  formatOrderStatus,
  formatPaymentMethod,
  formatPaymentStatus,
  renderCustomerBlock,
  renderEmailLayout,
  renderItemsTable,
  renderShippingBlock,
} from "@/features/emails/templates/shared";

export function renderAdminNewOrderEmail(order: Order) {
  return renderEmailLayout({
    title: `Nueva orden en Deluar - ${order.orderNumber}`,
    preview: `Nueva orden ${order.orderNumber} por ${formatCurrency(order.total)}.`,
    children: `
      <h1 style="margin:0 0 12px;color:#2f241f;font-size:24px;line-height:1.25;">Nueva orden recibida</h1>
      <p style="margin:0 0 18px;color:#5f4b42;font-size:15px;line-height:1.6;">
        Se registro la orden <strong>${escapeHtml(order.orderNumber)}</strong>.
      </p>
      <div style="background:#fbf8f5;border:1px solid #eadfd7;border-radius:12px;padding:16px;margin:20px 0;">
        <div style="font-size:14px;line-height:1.7;color:#2f241f;">
          <div><strong>Total:</strong> ${formatCurrency(order.total)}</div>
          <div><strong>Metodo de pago:</strong> ${escapeHtml(formatPaymentMethod(order.paymentMethod))}</div>
          <div><strong>Estado orden:</strong> ${escapeHtml(formatOrderStatus(order.status))}</div>
          <div><strong>Estado pago:</strong> ${escapeHtml(formatPaymentStatus(order.paymentStatus))}</div>
        </div>
      </div>
      <h2 style="margin:22px 0 10px;color:#2f241f;font-size:17px;">Cliente</h2>
      ${renderCustomerBlock(order)}
      <h2 style="margin:22px 0 10px;color:#2f241f;font-size:17px;">Envio</h2>
      ${renderShippingBlock(order)}
      ${renderItemsTable(order)}
    `,
  });
}
