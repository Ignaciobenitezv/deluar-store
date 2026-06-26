import groq from "groq";
import { sanityWriteClient } from "@/integrations/sanity/client";
import { logger } from "@/lib/logger";

export const INSUFFICIENT_STOCK_ERROR_MESSAGE =
  "No hay stock suficiente para uno o más productos.";

export type InventoryStockItem = {
  sanityProductId: string;
  slug: string;
  title: string;
  quantity: number;
};

type SanityInventoryProduct = {
  _id: string;
  _rev: string;
  slug?: {
    current?: string;
  };
  stock: number;
};

const inventoryProductsByIdsQuery = groq`
  *[_type == "product" && (_id in $ids || slug.current in $slugs)] {
    _id,
    _rev,
    slug,
    stock
  }
`;

export class InsufficientStockError extends Error {
  constructor() {
    super(INSUFFICIENT_STOCK_ERROR_MESSAGE);
    this.name = "InsufficientStockError";
  }
}

export class InventoryWriteUnavailableError extends Error {
  constructor() {
    super("No hay credenciales de escritura de Sanity configuradas.");
    this.name = "InventoryWriteUnavailableError";
  }
}

export function isInsufficientStockError(error: unknown) {
  return error instanceof InsufficientStockError;
}

function getSanityInventoryClient() {
  if (!sanityWriteClient) {
    throw new InventoryWriteUnavailableError();
  }

  return sanityWriteClient;
}

export function assertSanityInventoryWriteAvailable() {
  getSanityInventoryClient();
}

function normalizeQuantity(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

async function fetchInventoryProducts(items: InventoryStockItem[]) {
  const client = getSanityInventoryClient();
  const ids = [...new Set(items.map((item) => item.sanityProductId))];
  const slugs = [...new Set(items.map((item) => item.slug).filter(Boolean))];
  const products = await client.fetch<SanityInventoryProduct[]>(
    inventoryProductsByIdsQuery,
    { ids, slugs },
  );
  const productsById = new Map(products.map((product) => [product._id, product]));
  const productsBySlug = new Map(
    products
      .map((product) => [product.slug?.current, product] as const)
      .filter((entry): entry is [string, SanityInventoryProduct] => Boolean(entry[0])),
  );

  logger.info("inventory.sanity.products_loaded", {
    requestedCount: items.length,
    foundCount: products.length,
    ids,
    slugs,
  });

  return {
    client,
    productsById,
    productsBySlug,
  };
}

export async function validateSanityStock(items: InventoryStockItem[]) {
  const { productsById, productsBySlug } = await fetchInventoryProducts(items);

  for (const item of items) {
    const product = productsById.get(item.sanityProductId) ?? productsBySlug.get(item.slug);
    const quantity = normalizeQuantity(item.quantity);

    if (!product || product.stock < quantity) {
      logger.warn("inventory.sanity.stock_unavailable", {
        sanityProductId: item.sanityProductId,
        slug: item.slug,
        requestedQuantity: quantity,
        availableStock: product?.stock ?? null,
        found: Boolean(product),
      });
      throw new InsufficientStockError();
    }
  }
}

export async function decrementSanityStock(items: InventoryStockItem[]) {
  const { client, productsById, productsBySlug } = await fetchInventoryProducts(items);
  let transaction = client.transaction();

  for (const item of items) {
    const product = productsById.get(item.sanityProductId) ?? productsBySlug.get(item.slug);
    const quantity = normalizeQuantity(item.quantity);

    if (!product || product.stock < quantity) {
      logger.warn("inventory.sanity.decrement_unavailable", {
        sanityProductId: item.sanityProductId,
        slug: item.slug,
        requestedQuantity: quantity,
        availableStock: product?.stock ?? null,
        found: Boolean(product),
      });
      throw new InsufficientStockError();
    }

    logger.info("inventory.sanity.decrement_queued", {
      sanityProductId: product._id,
      slug: product.slug?.current ?? item.slug,
      quantity,
      previousStock: product.stock,
    });

    transaction = transaction.patch(product._id, (patch) =>
      patch.ifRevisionId(product._rev).dec({ stock: quantity }),
    );
  }

  try {
    await transaction.commit({
      visibility: "sync",
    });
    logger.info("inventory.sanity.decrement_committed", {
      itemCount: items.length,
    });
  } catch {
    logger.error("inventory.sanity.decrement_commit_failed", {
      itemCount: items.length,
    });
    throw new InsufficientStockError();
  }
}

export async function restoreSanityStock(items: InventoryStockItem[]) {
  const client = getSanityInventoryClient();
  let transaction = client.transaction();

  for (const item of items) {
    transaction = transaction.patch(item.sanityProductId, (patch) =>
      patch.inc({ stock: normalizeQuantity(item.quantity) }),
    );
  }

  await transaction.commit({
    visibility: "sync",
  });
}
