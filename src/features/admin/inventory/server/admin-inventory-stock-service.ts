import "server-only";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import { adminInventoryFreshProductQuery } from "@/integrations/sanity/admin-queries";
import { getAdminProductsWriteClient } from "@/features/admin/products/server/admin-products-write-client";
import type { InventoryStockChangeProduct, InventoryStockChangeRow } from "../validation/inventory-stock";

type FreshVariant = { _key?: string; stock?: number };

type FreshProduct = {
  _id: string;
  _rev: string;
  title: string;
  stock?: number;
  variants?: FreshVariant[];
  colorVariants?: FreshVariant[];
};

export type AdminInventoryRowResultStatus =
  | "applied"
  | "no_change"
  | "missing"
  | "would_go_negative";

export type AdminInventoryRowResult = {
  key: string;
  kind: "base" | "variant";
  status: AdminInventoryRowResultStatus;
  before: number | null;
  after: number | null;
};

export type AdminInventoryProductResultStatus = "applied" | "unchanged" | "not_found" | "conflict" | "error";

export type AdminInventoryProductResult = {
  productId: string;
  title: string | null;
  status: AdminInventoryProductResultStatus;
  message?: string;
  rows: AdminInventoryRowResult[];
};

export type AdminInventoryApplyResult = {
  results: AdminInventoryProductResult[];
  productsApplied: number;
  productsWithIssues: number;
};

function normalizeStock(value: number | undefined) {
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value ?? 0)) : 0;
}

function isRevisionConflictError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as { statusCode?: number; response?: { statusCode?: number }; message?: string };

  return (
    candidate.statusCode === 409 ||
    candidate.response?.statusCode === 409 ||
    (typeof candidate.message === "string" && candidate.message.toLowerCase().includes("revision"))
  );
}

function findFreshVariantStock(product: FreshProduct, key: string) {
  const inVariants = product.variants?.find((variant) => variant._key === key);
  if (inVariants) {
    return { collection: "variants" as const, stock: normalizeStock(inVariants.stock) };
  }

  const inColorVariants = product.colorVariants?.find((variant) => variant._key === key);
  if (inColorVariants) {
    return { collection: "colorVariants" as const, stock: normalizeStock(inColorVariants.stock) };
  }

  return null;
}

/**
 * Applies one product's pending row changes as relative deltas
 * (`.inc()`/`.dec()`), never as absolute `.set()` values — the same strategy
 * `decrementSanityStock` (features/inventory/inventory-service.ts) already
 * uses for checkout, which is what makes this safe against a concurrent
 * sale: the delta is computed against the value Lucila saw when she started
 * editing that row, but it's applied by Sanity against whatever the real
 * current value is at commit time, never overwriting it with a stale
 * absolute number.
 *
 * Rereads the document fresh (via the write client, bypassing CDN) right
 * before building the patch — never trusts the snapshot Inventario's list
 * page loaded with. This also lets each row be checked individually against
 * the real current value: a row whose variant key no longer exists, or whose
 * delta would push the real current stock below zero, is excluded from the
 * patch and reported, while every other row for that same product (and every
 * other product in the batch) still gets applied normally.
 */
async function applyProductStockChanges(change: InventoryStockChangeProduct): Promise<AdminInventoryProductResult> {
  let fresh: FreshProduct | null;
  let writeClient: ReturnType<typeof getAdminProductsWriteClient>;

  try {
    writeClient = getAdminProductsWriteClient();
    fresh = await writeClient.fetch<FreshProduct | null>(adminInventoryFreshProductQuery, {
      productId: change.productId,
    });
  } catch (error) {
    logger.error("admin.inventory.stock.read_failed", {
      productId: change.productId,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      productId: change.productId,
      title: null,
      status: "error",
      message: "No pudimos leer el producto para aplicar el cambio.",
      rows: [],
    };
  }

  if (!fresh) {
    return {
      productId: change.productId,
      title: null,
      status: "not_found",
      message: "El producto ya no existe.",
      rows: change.rows.map((row) => ({ key: row.key, kind: row.kind, status: "missing", before: null, after: null })),
    };
  }

  const incOps: Record<string, number> = {};
  const rowResults: AdminInventoryRowResult[] = [];

  for (const row of change.rows) {
    const delta = row.newStock - row.originalStock;

    if (delta === 0) {
      rowResults.push({ key: row.key, kind: row.kind, status: "no_change", before: null, after: null });
      continue;
    }

    if (row.kind === "base") {
      const currentStock = normalizeStock(fresh.stock);
      const prospective = currentStock + delta;

      if (prospective < 0) {
        rowResults.push({ key: row.key, kind: "base", status: "would_go_negative", before: currentStock, after: null });
        continue;
      }

      incOps.stock = (incOps.stock ?? 0) + delta;
      rowResults.push({ key: row.key, kind: "base", status: "applied", before: currentStock, after: prospective });
      continue;
    }

    const target = findFreshVariantStock(fresh, row.key);

    if (!target) {
      rowResults.push({ key: row.key, kind: "variant", status: "missing", before: null, after: null });
      continue;
    }

    const prospective = target.stock + delta;

    if (prospective < 0) {
      rowResults.push({ key: row.key, kind: "variant", status: "would_go_negative", before: target.stock, after: null });
      continue;
    }

    const path = `${target.collection}[_key=="${row.key}"].stock`;
    incOps[path] = (incOps[path] ?? 0) + delta;
    rowResults.push({ key: row.key, kind: "variant", status: "applied", before: target.stock, after: prospective });
  }

  const hasWrites = Object.keys(incOps).length > 0;

  if (!hasWrites) {
    return {
      productId: change.productId,
      title: fresh.title,
      status: "unchanged",
      rows: rowResults,
    };
  }

  const mutationId = crypto.randomUUID();
  logger.debug("admin.inventory.stock.mutation_started", {
    mutationId,
    productId: change.productId,
    incOps,
  });

  try {
    await writeClient.patch(fresh._id).ifRevisionId(fresh._rev).inc(incOps).commit();

    logger.debug("admin.inventory.stock.mutation_committed", { mutationId, productId: change.productId });

    return {
      productId: change.productId,
      title: fresh.title,
      status: "applied",
      rows: rowResults,
    };
  } catch (error) {
    if (isRevisionConflictError(error)) {
      logger.warn("admin.inventory.stock.conflict", { productId: change.productId });
      return {
        productId: change.productId,
        title: fresh.title,
        status: "conflict",
        message: "El producto cambió justo mientras se guardaba — no se aplicó nada. Volvé a intentarlo.",
        rows: [],
      };
    }

    logger.error("admin.inventory.stock.write_failed", {
      productId: change.productId,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      productId: change.productId,
      title: fresh.title,
      status: "error",
      message: "No pudimos guardar este producto. Intentalo de nuevo.",
      rows: [],
    };
  }
}

/**
 * Every product is its own independent read + patch + commit — deliberately
 * never bundled into one Sanity transaction across products (a transaction
 * is all-or-nothing; one conflict would then discard every other product's
 * changes too). Sequential, same reasoning as scripts/backfill-transfer-price.ts.
 */
export async function applyAdminInventoryStockChanges(
  changes: InventoryStockChangeProduct[],
): Promise<AdminInventoryApplyResult> {
  const results: AdminInventoryProductResult[] = [];

  for (const change of changes) {
    try {
      const result = await applyProductStockChanges(change);
      results.push(result);
    } catch (error) {
      // Defense in depth: applyProductStockChanges already catches its own
      // read/write errors, but nothing here may ever let one product's
      // unexpected failure abort the rest of the batch.
      logger.error("admin.inventory.stock.unexpected_failure", {
        productId: change.productId,
        error: error instanceof Error ? error.message : String(error),
      });
      results.push({
        productId: change.productId,
        title: null,
        status: "error",
        message: "No pudimos guardar este producto. Intentalo de nuevo.",
        rows: [],
      });
    }
  }

  revalidatePath("/admin/productos/inventario");
  revalidatePath("/admin/productos");

  return {
    results,
    productsApplied: results.filter((result) => result.status === "applied").length,
    productsWithIssues: results.filter((result) => result.status === "conflict" || result.status === "error" || result.status === "not_found")
      .length,
  };
}

export type { InventoryStockChangeRow };
