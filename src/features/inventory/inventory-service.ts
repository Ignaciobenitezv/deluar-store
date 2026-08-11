import { sanityWriteClient } from "@/integrations/sanity/client";
import {
  inventoryProductsByIdsQuery as sanityInventoryProductsByIdsQuery,
} from "@/integrations/sanity/queries";
import { logger } from "@/lib/logger";
import type { ProductDocument } from "@/types/cms";
import {
  isVariantStockTargetResolutionError,
  resolveVariantStockTarget,
  type VariantStockTarget,
} from "@/features/inventory/variant-stock-target";

export const INSUFFICIENT_STOCK_ERROR_MESSAGE =
  "No hay stock suficiente para uno o más productos.";

export type InventoryStockItem = {
  sanityProductId: string;
  slug: string;
  title: string;
  quantity: number;
  variantId?: string | null;
  variantValue?: string | null;
  variantLabel?: string | null;
  variantAttributes?: unknown;
  variantSku?: string | null;
};

export type PreparedInventoryStockItem = {
  product: SanityInventoryProduct;
  target: VariantStockTarget;
  quantity: number;
  sourceItem: InventoryStockItem;
};

type SanityInventoryProduct = Pick<
  ProductDocument,
  "_id" | "_rev" | "slug" | "title" | "stock" | "variants" | "colorVariants"
>;

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

function buildVariantStockPath(collection: "variants" | "colorVariants", key: string) {
  return `${collection}[_key==${JSON.stringify(key)}].stock`;
}

function withRevisionGuard<T extends { ifRevisionId(rev: string): T }>(patch: T, rev?: string) {
  return rev ? patch.ifRevisionId(rev) : patch;
}

async function fetchInventoryProducts(items: InventoryStockItem[]) {
  const client = getSanityInventoryClient();
  const ids = [...new Set(items.map((item) => item.sanityProductId))];
  const slugs = [...new Set(items.map((item) => item.slug).filter(Boolean))];
  const products = await client.fetch<SanityInventoryProduct[]>(
    sanityInventoryProductsByIdsQuery,
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

function toPreparedInventoryStockItem(
  product: SanityInventoryProduct,
  sourceItem: InventoryStockItem,
): PreparedInventoryStockItem {
  const target = resolveVariantStockTarget(product, {
    quantity: sourceItem.quantity,
    variantId: sourceItem.variantId,
    variantValue: sourceItem.variantValue,
    variantLabel: sourceItem.variantLabel,
    variantAttributes: sourceItem.variantAttributes,
    variantSku: sourceItem.variantSku,
  });

  return {
    product,
    target,
    quantity: normalizeQuantity(sourceItem.quantity),
    sourceItem,
  };
}

export async function prepareSanityStockTargets(items: InventoryStockItem[]) {
  const { productsById, productsBySlug } = await fetchInventoryProducts(items);
  const preparedItems: PreparedInventoryStockItem[] = [];

  for (const item of items) {
    const product = productsById.get(item.sanityProductId) ?? productsBySlug.get(item.slug);

    if (!product) {
      logger.warn("inventory.sanity.stock_unavailable", {
        sanityProductId: item.sanityProductId,
        slug: item.slug,
        requestedQuantity: normalizeQuantity(item.quantity),
        availableStock: null,
        found: false,
      });
      throw new InsufficientStockError();
    }

    try {
      const preparedItem = toPreparedInventoryStockItem(product, item);

      if (preparedItem.quantity > preparedItem.target.stock) {
        logger.warn("inventory.sanity.stock_unavailable", {
          sanityProductId: item.sanityProductId,
          slug: item.slug,
          requestedQuantity: preparedItem.quantity,
          availableStock: preparedItem.target.stock,
          found: true,
          stockSource: preparedItem.target.stockSource,
          variantId: preparedItem.target.variant?.key ?? null,
        });
        throw new InsufficientStockError();
      }

      preparedItems.push(preparedItem);
    } catch (error) {
      if (isVariantStockTargetResolutionError(error)) {
        logger.warn("inventory.sanity.variant_unavailable", {
          sanityProductId: item.sanityProductId,
          slug: item.slug,
          variantId: item.variantId ?? null,
          variantValue: item.variantValue ?? null,
          reason: error.reason,
        });
        throw new InsufficientStockError();
      }

      throw error;
    }
  }

  return preparedItems;
}

export async function validateSanityStock(items: InventoryStockItem[]) {
  await prepareSanityStockTargets(items);
}

export async function decrementSanityStock(items: PreparedInventoryStockItem[]) {
  const client = getSanityInventoryClient();
  let transaction = client.transaction();

  for (const item of items) {
    logger.info("inventory.sanity.decrement_queued", {
      sanityProductId: item.product._id,
      slug: item.product.slug?.current ?? item.sourceItem.slug,
      quantity: item.quantity,
      previousStock: item.target.stock,
      stockSource: item.target.stockSource,
      variantId: item.target.variant?.key ?? null,
    });

    if (item.target.stockSource === "product") {
      transaction = transaction.patch(item.product._id, (patch) =>
        withRevisionGuard(patch, item.product._rev).dec({ stock: item.quantity }),
      );
      continue;
    }

    const variantTarget = item.target.variant;

    if (!variantTarget) {
      throw new InsufficientStockError();
    }

    transaction = transaction.patch(item.product._id, (patch) =>
      withRevisionGuard(patch, item.product._rev).dec({
        [buildVariantStockPath(variantTarget.collection, variantTarget.key)]: item.quantity,
      }),
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

export async function restoreSanityStock(items: PreparedInventoryStockItem[]) {
  const client = getSanityInventoryClient();
  let transaction = client.transaction();

  for (const item of items) {
    if (item.target.stockSource === "product") {
      transaction = transaction.patch(item.product._id, (patch) =>
        patch.inc({ stock: item.quantity }),
      );
      continue;
    }

    const variantTarget = item.target.variant;

    if (!variantTarget) {
      continue;
    }

    transaction = transaction.patch(item.product._id, (patch) =>
      patch.inc({
        [buildVariantStockPath(variantTarget.collection, variantTarget.key)]: item.quantity,
      }),
    );
  }

  await transaction.commit({
    visibility: "sync",
  });
}
