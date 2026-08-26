import type { Order } from "@/features/order/types";
import {
  escapeHtml,
  formatCurrency,
  formatDateTime,
  formatOrderStatus,
  formatPaymentMethod,
  formatPaymentStatus,
  renderCustomerBlock,
  renderEmailLayout,
  renderItemsTable,
  renderOrderSummary,
  renderShippingBlock,
} from "@/features/emails/templates/shared";

type RenderPaymentStockFailedEmailInput = {
  order: Order;
  provider: NonNullable<Order["paymentProvider"]>;
};

const providerLabels: Record<RenderPaymentStockFailedEmailInput["provider"], string> = {
  gocuotas: "GoCuotas",
  unicobros: "Unicobros",
  getnet: "Getnet",
  mercado_pago: "Mercado Pago",
};

export function renderAdminPaymentStockFailedEmail({
  order,
  provider,
}: RenderPaymentStockFailedEmailInput) {
  const providerLabel = providerLabels[provider] ?? provider;

  return renderEmailLayout({
    title: `ATENCION: pago confirmado sin stock - Pedido ${order.orderNumber}`,
    preview: `Pago confirmado por ${providerLabel} pero sin stock para la orden ${order.orderNumber}.`,
    children: `
      <h1 style="margin:0 0 12px;color:#2f241f;font-size:24px;line-height:1.25;">Pago confirmado sin stock</h1>
      <p style="margin:0 0 18px;color:#5f4b42;font-size:15px;line-height:1.6;">
        El proveedor <strong>${escapeHtml(providerLabel)}</strong> confirmo el pago de la orden
        <strong>${escapeHtml(order.orderNumber)}</strong>, pero no fue posible completar el pedido por falta de stock.
        Revisar manualmente el pedido y gestionar el caso con el cliente.
      </p>
      <div style="background:#fff6f3;border:1px solid #f0d6cc;border-radius:12px;padding:16px;margin:20px 0;">
        <div style="font-size:14px;line-height:1.7;color:#2f241f;">
          <div><strong>Pedido:</strong> ${escapeHtml(order.orderNumber)}</div>
          <div><strong>Proveedor:</strong> ${escapeHtml(providerLabel)}</div>
          <div><strong>Metodo de pago:</strong> ${escapeHtml(formatPaymentMethod(order.paymentMethod))}</div>
          <div><strong>Estado actual:</strong> ${escapeHtml(formatOrderStatus(order.status))}</div>
          <div><strong>Estado de pago:</strong> ${escapeHtml(formatPaymentStatus(order.paymentStatus))}</div>
          <div><strong>Total cobrado:</strong> ${formatCurrency(order.total)}</div>
          <div><strong>Fecha:</strong> ${escapeHtml(formatDateTime(order.createdAt))}</div>
        </div>
      </div>
      <h2 style="margin:22px 0 10px;color:#2f241f;font-size:17px;">Cliente</h2>
      ${renderCustomerBlock(order)}
      <h2 style="margin:22px 0 10px;color:#2f241f;font-size:17px;">Envio</h2>
      ${renderShippingBlock(order)}
      ${renderOrderSummary(order)}
      ${renderItemsTable(order)}
    `,
  });
}
