import { getSanityImageUrl } from "@/integrations/sanity/image";
import { sanityFetch } from "@/integrations/sanity/client";
import { productsBySlugsQuery } from "@/integrations/sanity/queries";
import { logger } from "@/lib/logger";
import type { ProductDocument } from "@/types/cms";
import { normalizeProductVariants } from "@/features/catalog/variant-normalizer";
import { sendOrderCreatedEmails } from "@/features/emails/email-service";
import {
  INSUFFICIENT_STOCK_ERROR_MESSAGE,
} from "@/features/inventory/inventory-service";
import {
  isVariantStockTargetResolutionError,
  resolveVariantStockTarget,
} from "@/features/inventory/variant-stock-target";
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
import { linkAnalyticsCartToOrder } from "@/features/analytics/server/cart-link";
import {
  markOrderWithCheckout,
  markOrderProviderInitFailed,
  saveOrder,
} from "@/features/orders/server/order-repository";
import { resolveCommercialUnitPrice } from "@/features/pricing/commercial-pricing";
import { calculateShippingCost } from "@/features/shipping/shipping";

function buildProductMap(products: ProductDocument[]) {
  return new Map(products.map((product) => [product.slug.current, product]));
}

function resolveProductCommercialPricing(
  product: ProductDocument,
  selection: {
    variantId?: string | null;
    variantValue?: string | null;
  },
) {
  const normalizedVariants = normalizeProductVariants(product);
  const selectedVariant = normalizedVariants.find((variant) => {
    if (selection.variantId && variant.id === selection.variantId) {
      return true;
    }

    if (selection.variantValue && variant.value === selection.variantValue) {
      return true;
    }

    return false;
  });

  if (selectedVariant) {
    return {
      basePrice: selectedVariant.basePrice,
      transferPrice: selectedVariant.transferPrice,
    };
  }

  return {
    basePrice: product.basePrice,
    transferPrice: product.transferPrice,
  };
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

  const orderItems = normalizedItems.map((item, index) => {
    const sourceItem = input.items?.[index];
    const product = productMap.get(item.slug);
    let stockTarget: ReturnType<typeof resolveVariantStockTarget> | null = null;

    if (!product) {
      logger.warn("checkout.order.create.product_missing", {
        productSlug: item.slug,
      });
      pricingErrors.push(`El producto "${item.slug}" no existe o no esta disponible.`);
      return null;
    }

    try {
      stockTarget = resolveVariantStockTarget(product, {
        quantity: item.quantity,
        variantId: sourceItem?.variantId,
        variantValue: sourceItem?.variantValue,
        variantLabel: sourceItem?.variantLabel,
        variantSku: sourceItem?.variantSku,
        variantAttributes: sourceItem?.variantAttributes,
      });
    } catch (error) {
      if (isVariantStockTargetResolutionError(error)) {
        logger.warn("checkout.order.create.variant_unavailable", {
          productSlug: product.slug.current,
          variantId: sourceItem?.variantId ?? null,
          variantValue: sourceItem?.variantValue ?? null,
          reason: error.reason,
        });
        hasStockError = true;
        return null;
      }

      throw error;
    }

    if (item.quantity > stockTarget.stock) {
      logger.warn("checkout.order.create.insufficient_stock", {
        productSlug: product.slug.current,
        variantId: stockTarget.variant?.key ?? null,
        requestedQuantity: item.quantity,
        availableStock: stockTarget.stock,
        stockSource: stockTarget.stockSource,
      });
      hasStockError = true;
      return null;
    }

    const primaryImage = product.images?.[0];
    const commercialPrices = resolveProductCommercialPricing(product, {
      variantId: sourceItem?.variantId,
      variantValue: sourceItem?.variantValue,
    });
    const unitPrice = resolveCommercialUnitPrice(commercialPrices, paymentMethod);

    return {
      productId: product._id,
      productSlug: product.slug.current,
      title: product.title,
      imageUrl: getSanityImageUrl(primaryImage, 640, 800),
      imageAlt: primaryImage?.alt || product.title,
      variantId: sourceItem?.variantId,
      variantValue: sourceItem?.variantValue,
      variantLabel: sourceItem?.variantLabel,
      variantAttributes: sourceItem?.variantAttributes,
      variantSku: sourceItem?.variantSku,
      quantity: item.quantity,
      unitPrice,
      transferPrice: commercialPrices.transferPrice,
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

  if (input.analyticsCartId) {
    await linkAnalyticsCartToOrder({
      cartId: input.analyticsCartId,
      orderId: order.id,
    });
  }

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
        order,
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
