import { getSanityImageUrl } from "@/integrations/sanity/image";
import { sanityFetch } from "@/integrations/sanity/client";
import { productsBySlugsQuery } from "@/integrations/sanity/queries";
import { logger } from "@/lib/logger";
import type { ProductDocument } from "@/types/cms";
import { saveOrder } from "@/features/order/order-repository";
import type { CreateOrderInput, CreateOrderResult, Order } from "@/features/order/types";
import {
  normalizeCheckoutCustomer,
  normalizeOrderItems,
  validateOrderCustomer,
  validateOrderItems,
} from "@/features/order/validation";

function generateOrderId() {
  return `ord_${crypto.randomUUID()}`;
}

function generateOrderNumber() {
  const now = new Date();
  const year = now.getUTCFullYear().toString().slice(-2);
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  const suffix = crypto.randomUUID().slice(0, 6).toUpperCase();

  return `DLR-${year}${month}${day}-${suffix}`;
}

function buildProductMap(products: ProductDocument[]) {
  return new Map(products.map((product) => [product.slug.current, product]));
}

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const customer = normalizeCheckoutCustomer(input.customer);
  const normalizedItems = normalizeOrderItems(input.items);
  const uniqueSlugs = [...new Set(normalizedItems.map((item) => item.slug).filter(Boolean))];

  logger.info("checkout.order.create.started", {
    itemCount: normalizedItems.length,
    uniqueProductCount: uniqueSlugs.length,
  });

  const validationErrors = [
    ...validateOrderCustomer(customer),
    ...validateOrderItems(normalizedItems),
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

  const order: Order = {
    id: generateOrderId(),
    orderNumber: generateOrderNumber(),
    status: "pending_payment",
    items,
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
    createdAt: new Date().toISOString(),
  };

  saveOrder(order);
  logger.info("checkout.order.create.succeeded", {
    orderId: order.id,
    orderNumber: order.orderNumber,
    itemCount: order.items.length,
    total: order.total,
  });

  return {
    ok: true,
    order,
  };
}
