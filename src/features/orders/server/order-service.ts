import { getSanityImageUrl } from "@/integrations/sanity/image";
import { sanityFetch } from "@/integrations/sanity/client";
import { productsBySlugsQuery } from "@/integrations/sanity/queries";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";
import type { ProductDocument } from "@/types/cms";
import { sendOrderCreatedEmails } from "@/features/emails/email-service";
import type { CreateOrderInput, CreateOrderResult } from "@/features/order/types";
import { createCheckout } from "@/features/payments/gocuotas/client";
import { PAYMENT_METHODS } from "@/features/payments/types";
import {
  normalizeCheckoutCustomer,
  normalizeOrderPaymentMethod,
  normalizeOrderItems,
  validateOrderCustomer,
  validateOrderPaymentMethod,
  validateOrderItems,
} from "@/features/order/validation";
import { generateOrderNumber } from "@/features/orders/server/order-number";
import {
  markOrderWithGoCuotasCheckout,
  saveOrder,
} from "@/features/orders/server/order-repository";

function buildProductMap(products: ProductDocument[]) {
  return new Map(products.map((product) => [product.slug.current, product]));
}

function toAmountInCents(value: number) {
  return Math.round(value * 100);
}

function buildSiteUrl(path: string) {
  return new URL(path, env.siteUrl).toString();
}

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const customer = normalizeCheckoutCustomer(input.customer);
  const normalizedItems = normalizeOrderItems(input.items);
  const paymentMethod = normalizeOrderPaymentMethod(input.paymentMethod);
  const uniqueSlugs = [...new Set(normalizedItems.map((item) => item.slug).filter(Boolean))];

  logger.info("checkout.order.create.started", {
    itemCount: normalizedItems.length,
    uniqueProductCount: uniqueSlugs.length,
  });

  const validationErrors = [
    ...validateOrderCustomer(customer),
    ...validateOrderItems(normalizedItems),
    ...validateOrderPaymentMethod(input.paymentMethod),
  ];

  if (validationErrors.length > 0) {
    logger.warn("checkout.order.create.validation_failed", {
      errorCount: validationErrors.length,
    });

    return {
      ok: false,
      status: 400,
      errors: validationErrors,
    };
  }

  const products = await sanityFetch<ProductDocument[]>(productsBySlugsQuery, {
    slugs: uniqueSlugs,
  });

  logger.info("checkout.order.create.products_loaded", {
    requestedProductCount: uniqueSlugs.length,
    foundProductCount: products.length,
  });

  const productMap = buildProductMap(products);
  const pricingErrors: string[] = [];

  const orderItems = normalizedItems.map((item) => {
    const product = productMap.get(item.slug);

    if (!product) {
      logger.warn("checkout.order.create.product_missing", {
        productSlug: item.slug,
      });
      pricingErrors.push(`El producto "${item.slug}" no existe o no esta disponible.`);
      return null;
    }

    if (item.quantity > product.stock) {
      logger.warn("checkout.order.create.insufficient_stock", {
        productSlug: product.slug.current,
        requestedQuantity: item.quantity,
        availableStock: product.stock,
      });
      pricingErrors.push(
        `No hay stock suficiente para "${product.title}". Disponible: ${product.stock}.`,
      );
      return null;
    }

    const primaryImage = product.images?.[0];
    const unitPrice = product.basePrice;

    return {
      productId: product._id,
      productSlug: product.slug.current,
      title: product.title,
      imageUrl: getSanityImageUrl(primaryImage, 640, 800),
      imageAlt: primaryImage?.alt || product.title,
      quantity: item.quantity,
      unitPrice,
      transferPrice: product.transferPrice,
      lineTotal: unitPrice * item.quantity,
    };
  });

  if (pricingErrors.length > 0) {
    logger.warn("checkout.order.create.pricing_failed", {
      errorCount: pricingErrors.length,
    });

    return {
      ok: false,
      status: 400,
      errors: pricingErrors,
    };
  }

  const items = orderItems.filter((item): item is NonNullable<typeof item> => item !== null);
  const subtotal = items.reduce((accumulator, item) => accumulator + item.lineTotal, 0);

  let order = await saveOrder({
    orderNumber: generateOrderNumber(),
    items,
    paymentMethod,
    subtotal,
    total: subtotal,
    customer: {
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone,
      notes: customer.notes,
    },
    shippingAddress: {
      address: customer.address,
      city: customer.city,
      province: customer.province,
      postalCode: customer.postalCode,
    },
  });

  if (paymentMethod === PAYMENT_METHODS.GOCUOTAS) {
    try {
      logger.info("checkout.order.gocuotas.create_checkout.started", {
        orderId: order.id,
        orderNumber: order.orderNumber,
        total: order.total,
      });

      const checkout = await createCheckout({
        amount_in_cents: toAmountInCents(order.total),
        url_success: env.gocuotasSuccessUrl || buildSiteUrl("/checkout/success"),
        url_failure: env.gocuotasFailureUrl || buildSiteUrl("/checkout/failure"),
        webhook_url: buildSiteUrl("/api/payments/gocuotas/webhook"),
        order_reference_id: order.orderNumber,
        email: order.customer.email,
        phone_number: order.customer.phone,
      });

      order = await markOrderWithGoCuotasCheckout({
        orderId: order.id,
        checkoutUrl: checkout.checkoutUrl,
        rawProviderStatus: checkout.rawProviderStatus,
        externalReference: order.orderNumber,
      });

      logger.info("checkout.order.gocuotas.create_checkout.succeeded", {
        orderId: order.id,
        orderNumber: order.orderNumber,
        hasCheckoutUrl: Boolean(order.checkoutUrl),
      });
    } catch (error) {
      logger.error("checkout.order.gocuotas.create_checkout.failed", {
        orderId: order.id,
        orderNumber: order.orderNumber,
        error: error instanceof Error ? error.message : "unknown_error",
      });

      return {
        ok: false,
        status: 502,
        errors: [
          error instanceof Error
            ? error.message
            : "No se pudo crear el checkout de GoCuotas.",
        ],
      };
    }
  }

  logger.info("checkout.order.create.succeeded", {
    orderId: order.id,
    orderNumber: order.orderNumber,
    itemCount: order.items.length,
    total: order.total,
  });

  await sendOrderCreatedEmails(order);

  return {
    ok: true,
    order,
  };
}
