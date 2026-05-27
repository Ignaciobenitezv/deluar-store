import type { Order } from "@/features/order/types";
import {
  escapeHtml,
  formatCurrency,
  renderCustomerBlock,
  renderEmailLayout,
  renderItemsTable,
  renderOrderSummary,
} from "@/features/emails/templates/shared";

export function renderPaymentApprovedEmail(order: Order) {
  return renderEmailLayout({
    title: "Tu pago fue aprobado - Deluar",
    preview: `El pago de la orden ${order.orderNumber} fue aprobado.`,
    children: `
      <h1 style="margin:0 0 12px;color:#2f241f;font-size:24px;line-height:1.25;">Tu pago fue aprobado</h1>
      <p style="margin:0 0 18px;color:#5f4b42;font-size:15px;line-height:1.6;">
        Hola ${escapeHtml(order.customer.firstName)}, confirmamos el pago de tu pedido. Vamos a preparar tu compra y te contactaremos para coordinar los proximos pasos.
      </p>
      ${renderOrderSummary(order)}
      ${renderItemsTable(order)}
    `,
  });
}

export function renderAdminPaymentApprovedEmail(order: Order) {
  return renderEmailLayout({
    title: `Pago aprobado - Orden ${order.orderNumber}`,
    preview: `Pago aprobado para la orden ${order.orderNumber} por ${formatCurrency(order.total)}.`,
    children: `
      <h1 style="margin:0 0 12px;color:#2f241f;font-size:24px;line-height:1.25;">Pago aprobado</h1>
      <p style="margin:0 0 18px;color:#5f4b42;font-size:15px;line-height:1.6;">
        Se aprobo el pago de la orden <strong>${escapeHtml(order.orderNumber)}</strong>.
      </p>
      <div style="background:#fbf8f5;border:1px solid #eadfd7;border-radius:12px;padding:16px;margin:20px 0;">
        <div style="font-size:14px;line-height:1.7;color:#2f241f;">
          <div><strong>Total:</strong> ${formatCurrency(order.total)}</div>
          <div><strong>Proveedor:</strong> ${escapeHtml(order.paymentProvider ?? "Sin proveedor")}</div>
          <div><strong>Estado proveedor:</strong> ${escapeHtml(order.rawProviderStatus ?? "approved")}</div>
        </div>
      </div>
      <h2 style="margin:22px 0 10px;color:#2f241f;font-size:17px;">Cliente</h2>
      ${renderCustomerBlock(order)}
      ${renderItemsTable(order)}
    `,
  });
}
