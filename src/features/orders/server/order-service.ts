import { getSanityImageUrl } from "@/integrations/sanity/image";
import { sanityFetch } from "@/integrations/sanity/client";
import { productsBySlugsQuery } from "@/integrations/sanity/queries";
import { logger } from "@/lib/logger";
import type { ProductDocument } from "@/types/cms";
import { sendOrderCreatedEmails } from "@/features/emails/email-service";
import {
  INSUFFICIENT_STOCK_ERROR_MESSAGE,
} from "@/features/inventory/inventory-service";
import type { CreateOrderInput, CreateOrderResult } from "@/features/order/types";
import { resolvePaymentProvider } from "@/features/payments/registry";
import {
  normalizeOrderShippingMethod,
  normalizeCheckoutCustomer,
  normalizeOrderPaymentMethod,
  normalizeOrderItems,
  sanitizeShippingFields,
  validateOrderCustomer,
  validateOrderPaymentMethod,
  validateOrderShippingMethod,
  validateOrderItems,
} from "@/features/order/validation";
import { generateOrderNumber } from "@/features/orders/server/order-number";
import {
  markOrderWithCheckout,
  markOrderProviderInitFailed,
  saveOrder,
} from "@/features/orders/server/order-repository";
import { calculateShippingCost } from "@/features/shipping/shipping";

function buildProductMap(products: ProductDocument[]) {
  return new Map(products.map((product) => [product.slug.current, product]));
}

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const customer = normalizeCheckoutCustomer(input.customer);
  const normalizedItems = normalizeOrderItems(input.items);
  const paymentMethod = normalizeOrderPaymentMethod(input.paymentMethod);
  const shippingMethod = normalizeOrderShippingMethod(input.shippingMethod);
  const uniqueSlugs = [...new Set(normalizedItems.map((item) => item.slug).filter(Boolean))];

  logger.info("checkout.order.create.started", {
    itemCount: normalizedItems.length,
    uniqueProductCount: uniqueSlugs.length,
  });

  const validationErrors = [
    ...validateOrderCustomer(customer),
    ...validateOrderItems(normalizedItems),
    ...validateOrderShippingMethod(input.shippingMethod),
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
  let hasStockError = false;

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
      hasStockError = true;
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

  if (hasStockError) {
    logger.warn("checkout.order.create.stock_failed", {
      itemCount: normalizedItems.length,
    });

    return {
      ok: false,
      status: 409,
      errors: [INSUFFICIENT_STOCK_ERROR_MESSAGE],
    };
  }

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
  const shippingCost = calculateShippingCost(subtotal, shippingMethod);
  const total = subtotal + shippingCost;
  const shippingAddress = sanitizeShippingFields({
    address: customer.address,
    city: customer.city,
    province: customer.province,
    postalCode: customer.postalCode,
    shippingMethod,
  });

  let order = await saveOrder({
    orderNumber: generateOrderNumber(),
    items,
    shippingMethod,
    paymentMethod,
    subtotal,
    shippingCost,
    total,
    customer: {
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone,
      notes: customer.notes,
    },
    shippingAddress: {
      address: shippingAddress.address,
      city: shippingAddress.city,
      province: shippingAddress.province,
      postalCode: shippingAddress.postalCode,
    },
  });

  const paymentProvider = resolvePaymentProvider(paymentMethod);

  if (paymentProvider) {
    try {
      logger.info("checkout.order.provider.create_checkout.started", {
        orderId: order.id,
        orderNumber: order.orderNumber,
        total: order.total,
        provider: paymentProvider.method,
      });

      const checkout = await paymentProvider.createCheckout(order);

      order = await markOrderWithCheckout({
        orderId: order.id,
        checkoutUrl: checkout.checkoutUrl,
        rawProviderStatus: checkout.rawProviderStatus,
        externalReference: checkout.externalReference ?? order.orderNumber,
        providerPaymentId: checkout.providerPaymentId,
      });

      logger.info("checkout.order.provider.create_checkout.succeeded", {
        orderId: order.id,
        orderNumber: order.orderNumber,
        provider: paymentProvider.method,
        hasCheckoutUrl: Boolean(order.checkoutUrl),
      });
    } catch (error) {
      await markOrderProviderInitFailed({
        orderId: order.id,
        rawProviderStatus: "provider_init_failed",
      }).catch(() => null);

      logger.error("checkout.order.provider.create_checkout.failed", {
        orderId: order.id,
        orderNumber: order.orderNumber,
        provider: paymentProvider?.method ?? paymentMethod,
        error: error instanceof Error ? error.message : "unknown_error",
      });

      return {
        ok: false,
        status: 502,
        errors: [
          error instanceof Error
            ? error.message
            : paymentProvider?.checkoutFailureMessage ?? "No se pudo crear el checkout externo.",
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
