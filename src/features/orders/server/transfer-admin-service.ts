import { sendPaymentApprovedEmails } from "@/features/emails/email-service";
import {
  decrementSanityStock,
  INSUFFICIENT_STOCK_ERROR_MESSAGE,
  InventoryWriteUnavailableError,
  isInsufficientStockError,
} from "@/features/inventory/inventory-service";
import type { Order } from "@/features/order/types";
import { PAYMENT_METHODS } from "@/features/payments/types";
import { logger } from "@/lib/logger";
import {
  getOrderById,
  markTransferOrderPaid,
} from "@/features/orders/server/order-repository";

type MarkTransferOrderPaidResult =
  | {
      ok: true;
      alreadyPaid: boolean;
      order: Order;
    }
  | {
      ok: false;
      status: number;
      errors: string[];
    };

function isPaid(order: Order) {
  return order.status === "paid" || order.paymentStatus === "approved";
}

function mapOrderItemsToInventoryItems(order: Order) {
  return order.items.map((item) => ({
    sanityProductId: item.productId,
    slug: item.productSlug,
    title: item.title,
    quantity: item.quantity,
  }));
}

export async function markTransferOrderAsPaid(
  orderId: string,
): Promise<MarkTransferOrderPaidResult> {
  const order = await getOrderById(orderId);

  if (!order) {
    return {
      ok: false,
      status: 404,
      errors: ["La orden no existe."],
    };
  }

  if (order.paymentMethod !== PAYMENT_METHODS.TRANSFER) {
    return {
      ok: false,
      status: 409,
      errors: ["Solo se pueden aprobar manualmente ordenes por transferencia."],
    };
  }

  if (isPaid(order)) {
    logger.info("admin.orders.mark_paid.already_paid", {
      orderId: order.id,
      orderNumber: order.orderNumber,
    });

    return {
      ok: true,
      alreadyPaid: true,
      order,
    };
  }

  try {
    await decrementSanityStock(mapOrderItemsToInventoryItems(order));
  } catch (error) {
    if (isInsufficientStockError(error)) {
      logger.warn("admin.orders.mark_paid.inventory_failed", {
        orderId: order.id,
        orderNumber: order.orderNumber,
      });

      return {
        ok: false,
        status: 409,
        errors: [INSUFFICIENT_STOCK_ERROR_MESSAGE],
      };
    }

    if (error instanceof InventoryWriteUnavailableError) {
      logger.error("admin.orders.mark_paid.inventory_write_unavailable", {
        orderId: order.id,
        orderNumber: order.orderNumber,
      });

      return {
        ok: false,
        status: 503,
        errors: ["No se pudo actualizar el stock en este momento."],
      };
    }

    throw error;
  }

  const updatedOrder = await markTransferOrderPaid(order.id);
  await sendPaymentApprovedEmails(updatedOrder);

  logger.info("admin.orders.mark_paid.succeeded", {
    orderId: updatedOrder.id,
    orderNumber: updatedOrder.orderNumber,
  });

  return {
    ok: true,
    alreadyPaid: false,
    order: updatedOrder,
  };
}
