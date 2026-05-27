import { Prisma } from "@/generated/prisma/client";
import type { Order } from "@/features/order/types";
import { renderAdminNewOrderEmail } from "@/features/emails/templates/admin-new-order";
import {
  renderAdminPaymentApprovedEmail,
  renderPaymentApprovedEmail,
} from "@/features/emails/templates/payment-approved";
import { renderOrderCreatedEmail } from "@/features/emails/templates/order-created";
import { hasEmailConfig, sendEmail } from "@/integrations/email/resend";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

type SendTransactionalEmailInput = {
  eventKey: string;
  orderId: string;
  to?: string;
  subject: string;
  html: string;
  template: string;
};

async function sendTransactionalEmail(input: SendTransactionalEmailInput) {
  if (!input.to) {
    logger.warn("emails.transactional.recipient_missing", {
      eventKey: input.eventKey,
      orderId: input.orderId,
      template: input.template,
    });
    return;
  }

  if (!hasEmailConfig()) {
    logger.warn("emails.transactional.config_missing", {
      eventKey: input.eventKey,
      orderId: input.orderId,
      template: input.template,
    });
    return;
  }

  try {
    const existingLog = await prisma.emailLog.findUnique({
      where: { eventKey: input.eventKey },
      select: { id: true },
    });

    if (existingLog) {
      logger.info("emails.transactional.duplicated", {
        eventKey: input.eventKey,
        orderId: input.orderId,
        template: input.template,
      });
      return;
    }

    const result = await sendEmail({
      to: input.to,
      subject: input.subject,
      html: input.html,
    });

    await prisma.emailLog.create({
      data: {
        eventKey: input.eventKey,
        orderId: input.orderId,
        recipient: input.to,
        subject: input.subject,
        template: input.template,
        providerMessageId: result.providerMessageId,
      },
    });

    logger.info("emails.transactional.sent", {
      eventKey: input.eventKey,
      orderId: input.orderId,
      template: input.template,
      providerMessageId: result.providerMessageId,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      logger.info("emails.transactional.duplicated", {
        eventKey: input.eventKey,
        orderId: input.orderId,
        template: input.template,
      });
      return;
    }

    logger.error("emails.transactional.failed", {
      eventKey: input.eventKey,
      orderId: input.orderId,
      template: input.template,
      error: error instanceof Error ? error.message : "unknown_error",
    });
  }
}

export async function sendOrderCreatedEmails(order: Order) {
  await Promise.all([
    sendTransactionalEmail({
      eventKey: `order-created:buyer:${order.id}`,
      orderId: order.id,
      to: order.customer.email,
      subject: "Recibimos tu pedido en Deluar",
      html: renderOrderCreatedEmail(order),
      template: "order-created",
    }),
    sendTransactionalEmail({
      eventKey: `order-created:admin:${order.id}`,
      orderId: order.id,
      to: env.emailAdminTo,
      subject: `Nueva orden en Deluar - ${order.orderNumber}`,
      html: renderAdminNewOrderEmail(order),
      template: "admin-new-order",
    }),
  ]);
}

export async function sendPaymentApprovedEmails(order: Order) {
  await Promise.all([
    sendTransactionalEmail({
      eventKey: `payment-approved:buyer:${order.id}`,
      orderId: order.id,
      to: order.customer.email,
      subject: "Tu pago fue aprobado - Deluar",
      html: renderPaymentApprovedEmail(order),
      template: "payment-approved",
    }),
    sendTransactionalEmail({
      eventKey: `payment-approved:admin:${order.id}`,
      orderId: order.id,
      to: env.emailAdminTo,
      subject: `Pago aprobado - Orden ${order.orderNumber}`,
      html: renderAdminPaymentApprovedEmail(order),
      template: "admin-payment-approved",
    }),
  ]);
}
