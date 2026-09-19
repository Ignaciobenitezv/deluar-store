/**
 * Backfill Deluar's transfer-price rule (always exactly 20% off, via the
 * centralized `calculateTransferPrice`) across the published catalog.
 *
 * DRY-RUN BY DEFAULT. This script never writes to Sanity unless invoked with
 * the explicit `--apply` flag — there is no other way to enable writes (no
 * env var, no prompt-default-yes, nothing implicit). A write-capable Sanity
 * client is only ever constructed inside the `--apply` branch.
 *
 * Usage:
 *   npx tsx scripts/backfill-transfer-price.ts            (dry-run, no writes)
 *   npx tsx scripts/backfill-transfer-price.ts --apply    (writes)
 *
 * Every run (dry-run or apply) re-fetches the catalog live from Sanity at
 * the moment it executes — it never reads reports/transfer-price-audit-*.json
 * as a source of truth for what to write, only as a human-readable artifact
 * from a previous, separate run.
 */
import dotenv from "dotenv";
import { createClient, type SanityClient } from "@sanity/client";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { calculateTransferPrice, isValidCommercialPrice } from "../src/features/pricing/commercial-pricing";

const ROOT_DIR = process.cwd();
const APPLY = process.argv.includes("--apply");
const RUN_TIMESTAMP = new Date().toISOString().replace(/[:.]/g, "-");
const REPORT_JSON_PATH = path.join(
  ROOT_DIR,
  "reports",
  `transfer-price-backfill-${APPLY ? "apply" : "dry-run"}-${RUN_TIMESTAMP}.json`,
);
const REPORT_TEXT_PATH = path.join(
  ROOT_DIR,
  "reports",
  `transfer-price-backfill-${APPLY ? "apply" : "dry-run"}-${RUN_TIMESTAMP}.txt`,
);

function loadEnvFiles() {
  dotenv.config({ path: path.join(ROOT_DIR, ".env.example"), override: false });
  dotenv.config({ path: path.join(ROOT_DIR, ".env.local"), override: false });
  dotenv.config({ path: path.join(ROOT_DIR, ".env.production.local"), override: false });
}

loadEnvFiles();

const readClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2024-01-01",
  useCdn: false,
  perspective: "published",
});

// Only ever called from inside the `if (APPLY)` branch in main() — a
// dry-run's code path never reaches this function, so it never even
// constructs a client capable of writing.
function createWriteClient(): SanityClient {
  const token = process.env.SANITY_WRITE_TOKEN;

  if (!token) {
    throw new Error("SANITY_WRITE_TOKEN no está configurado — no se puede aplicar el backfill.");
  }

  return createClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
    apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2024-01-01",
    useCdn: false,
    token,
    perspective: "published",
  });
}

type RawVariant = {
  _key: string;
  basePrice?: number;
  transferPrice?: number;
};

type RawProduct = {
  _id: string;
  _rev: string;
  title: string;
  basePrice?: number;
  transferPrice?: number;
  variants?: RawVariant[];
};

type VariantOperation =
  | { kind: "set"; variantKey: string; from: number | null; to: number }
  | { kind: "unset"; variantKey: string; from: number };

type ProductPlan = {
  productId: string;
  title: string;
  rev: string;
  basePrice: number;
  productOperation: { from: number | null; to: number } | null;
  variantOperations: VariantOperation[];
};

type InvalidProduct = {
  productId: string;
  title: string;
  reason: string;
};

type ResultKind = "would_modify" | "modified" | "unchanged" | "conflict" | "error";

type ProductResult = {
  productId: string;
  title: string;
  kind: ResultKind;
  before?: unknown;
  after?: unknown;
  operations?: string[];
  message?: string;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isRevisionConflictError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as {
    statusCode?: number;
    response?: { statusCode?: number };
    message?: string;
  };

  return (
    candidate.statusCode === 409 ||
    candidate.response?.statusCode === 409 ||
    (typeof candidate.message === "string" && candidate.message.toLowerCase().includes("revision"))
  );
}

/**
 * Same classification rule as scripts/audit-transfer-price-dry-run.ts:
 * `null` from Sanity means "no value" (a missing field and an explicit null
 * round-trip identically through JSON), never "invalid".
 */
function buildProductPlan(product: RawProduct): ProductPlan | InvalidProduct {
  if (!isValidCommercialPrice(product.basePrice)) {
    return {
      productId: product._id,
      title: product.title,
      reason: `basePrice inválido o no positivo (${JSON.stringify(product.basePrice)}) — no se puede derivar transferPrice.`,
    };
  }

  const basePrice = product.basePrice as number;
  const expected = calculateTransferPrice(basePrice);
  const currentTransfer = isFiniteNumber(product.transferPrice) ? product.transferPrice : null;

  const productOperation = currentTransfer !== expected ? { from: currentTransfer, to: expected } : null;

  const variantOperations: VariantOperation[] = [];

  for (const variant of product.variants ?? []) {
    const hasOwnBasePrice = isFiniteNumber(variant.basePrice) && variant.basePrice > 0;
    const variantTransfer = isFiniteNumber(variant.transferPrice) ? variant.transferPrice : null;

    if (hasOwnBasePrice) {
      const variantExpected = calculateTransferPrice(variant.basePrice as number);
      if (variantTransfer !== variantExpected) {
        variantOperations.push({
          kind: "set",
          variantKey: variant._key,
          from: variantTransfer,
          to: variantExpected,
        });
      }
    } else if (variantTransfer !== null) {
      // No own basePrice (inherits the product's) but still carries a frozen
      // own transferPrice from before this rule existed — clear it so read
      // time falls through to the product's own (now-derived) value, instead
      // of persisting a value disconnected from any basePrice.
      variantOperations.push({ kind: "unset", variantKey: variant._key, from: variantTransfer });
    }
  }

  return {
    productId: product._id,
    title: product.title,
    rev: product._rev,
    basePrice,
    productOperation,
    variantOperations,
  };
}

async function main() {
  console.log(APPLY ? "MODO: --apply (va a escribir en Sanity)" : "MODO: dry-run (no escribe nada)");

  const products = await readClient.fetch<RawProduct[]>(
    `*[_type == "product"]{
      _id,
      _rev,
      title,
      basePrice,
      transferPrice,
      variants[]{ _key, basePrice, transferPrice }
    }`,
  );

  const writeClient = APPLY ? createWriteClient() : null;

  const invalidProducts: InvalidProduct[] = [];
  const results: ProductResult[] = [];

  let documentsAnalyzed = 0;
  let productsCorrected = 0;
  let variantsCorrected = 0;
  let variantsClearedForInheritance = 0;
  let documentsUnchanged = 0;
  let revisionConflicts = 0;
  let errors = 0;

  for (const product of products) {
    documentsAnalyzed += 1;
    const plan = buildProductPlan(product);

    if ("reason" in plan) {
      invalidProducts.push(plan);
      continue;
    }

    const needsWrite = plan.productOperation !== null || plan.variantOperations.length > 0;

    if (!needsWrite) {
      documentsUnchanged += 1;
      continue;
    }

    const operationsDescription: string[] = [];
    if (plan.productOperation) {
      operationsDescription.push(
        `producto.transferPrice: ${plan.productOperation.from} -> ${plan.productOperation.to}`,
      );
    }
    for (const op of plan.variantOperations) {
      operationsDescription.push(
        op.kind === "set"
          ? `variante[${op.variantKey}].transferPrice: ${op.from} -> ${op.to}`
          : `variante[${op.variantKey}].transferPrice: ${op.from} -> (unset, hereda del producto)`,
      );
    }

    const before = {
      transferPrice: product.transferPrice ?? null,
      variants: (product.variants ?? []).map((v) => ({ key: v._key, transferPrice: v.transferPrice ?? null })),
    };
    const after = {
      transferPrice: plan.productOperation ? plan.productOperation.to : (product.transferPrice ?? null),
      variants: (product.variants ?? []).map((v) => {
        const op = plan.variantOperations.find((o) => o.variantKey === v._key);
        if (!op) {
          return { key: v._key, transferPrice: v.transferPrice ?? null };
        }
        return { key: v._key, transferPrice: op.kind === "set" ? op.to : null };
      }),
    };

    if (!APPLY) {
      results.push({
        productId: plan.productId,
        title: plan.title,
        kind: "would_modify",
        before,
        after,
        operations: operationsDescription,
      });
      if (plan.productOperation) productsCorrected += 1;
      variantsCorrected += plan.variantOperations.filter((o) => o.kind === "set").length;
      variantsClearedForInheritance += plan.variantOperations.filter((o) => o.kind === "unset").length;
      continue;
    }

    // --apply: build one patch per product, using _key-scoped paths for
    // variants so no other variant field (images, sku, attributes,
    // logistics, stock, isActive) is ever touched or resent.
    try {
      const setOps: Record<string, unknown> = {};
      const unsetPaths: string[] = [];

      if (plan.productOperation) {
        setOps.transferPrice = plan.productOperation.to;
      }

      for (const op of plan.variantOperations) {
        const fieldPath = `variants[_key=="${op.variantKey}"].transferPrice`;
        if (op.kind === "set") {
          setOps[fieldPath] = op.to;
        } else {
          unsetPaths.push(fieldPath);
        }
      }

      let patch = writeClient!.patch(plan.productId).ifRevisionId(plan.rev);
      if (Object.keys(setOps).length > 0) {
        patch = patch.set(setOps);
      }
      if (unsetPaths.length > 0) {
        patch = patch.unset(unsetPaths);
      }

      await patch.commit();

      results.push({
        productId: plan.productId,
        title: plan.title,
        kind: "modified",
        before,
        after,
        operations: operationsDescription,
      });
      if (plan.productOperation) productsCorrected += 1;
      variantsCorrected += plan.variantOperations.filter((o) => o.kind === "set").length;
      variantsClearedForInheritance += plan.variantOperations.filter((o) => o.kind === "unset").length;
    } catch (error) {
      if (isRevisionConflictError(error)) {
        revisionConflicts += 1;
        results.push({
          productId: plan.productId,
          title: plan.title,
          kind: "conflict",
          message: "El documento cambió (_rev distinto) entre la lectura y la escritura — se saltó, no se sobrescribió.",
        });
        // Never abort the run — continue with the remaining documents.
        continue;
      }

      errors += 1;
      results.push({
        productId: plan.productId,
        title: plan.title,
        kind: "error",
        message: error instanceof Error ? error.message : String(error),
      });
      // Never abort the run — continue with the remaining documents.
      continue;
    }
  }

  const documentsToModify = results.filter((r) => r.kind === "would_modify" || r.kind === "modified").length;

  const summary = {
    mode: APPLY ? "apply" : "dry-run",
    generatedAt: new Date().toISOString(),
    documentsAnalyzed,
    documentsToModify,
    productsCorrected,
    variantsCorrected,
    variantsClearedForInheritance,
    documentsUnchanged,
    revisionConflicts,
    errors,
    invalidProductCount: invalidProducts.length,
  };

  const report = {
    ...summary,
    invalidProducts,
    results,
  };

  await mkdir(path.join(ROOT_DIR, "reports"), { recursive: true });
  await writeFile(REPORT_JSON_PATH, JSON.stringify(report, null, 2), "utf8");

  const lines: string[] = [];
  lines.push(`BACKFILL TRANSFER PRICE — modo: ${summary.mode} — ${summary.generatedAt}`);
  lines.push("");
  lines.push(`documentos analizados:                 ${summary.documentsAnalyzed}`);
  lines.push(
    `documentos ${APPLY ? "modificados" : "que se modificarían"}:            ${summary.documentsToModify}`,
  );
  lines.push(`productos corregidos:                  ${summary.productsCorrected}`);
  lines.push(`variantes corregidas:                  ${summary.variantsCorrected}`);
  lines.push(`variantes limpiadas para herencia:      ${summary.variantsClearedForInheritance}`);
  lines.push(`documentos sin cambios:                 ${summary.documentsUnchanged}`);
  lines.push(`conflictos de _rev:                     ${summary.revisionConflicts}`);
  lines.push(`errores:                                ${summary.errors}`);
  lines.push(`productos inválidos (no migrables):     ${summary.invalidProductCount}`);
  lines.push("");

  if (invalidProducts.length > 0) {
    lines.push("PRODUCTOS INVÁLIDOS (no tocados, requieren revisión manual)");
    for (const invalid of invalidProducts) {
      lines.push(`  ${invalid.title} (${invalid.productId}) — ${invalid.reason}`);
    }
    lines.push("");
  }

  const changed = results.filter((r) => r.kind === "would_modify" || r.kind === "modified");
  lines.push(`DETALLE DE DOCUMENTOS ${APPLY ? "MODIFICADOS" : "A MODIFICAR"} (before/after)`);
  for (const result of changed) {
    lines.push(`  ${result.title} (${result.productId})`);
    for (const op of result.operations ?? []) {
      lines.push(`    - ${op}`);
    }
  }
  lines.push("");

  if (revisionConflicts > 0) {
    lines.push("CONFLICTOS DE _rev (saltados, no sobrescritos)");
    for (const result of results.filter((r) => r.kind === "conflict")) {
      lines.push(`  ${result.title} (${result.productId}) — ${result.message}`);
    }
    lines.push("");
  }

  if (errors > 0) {
    lines.push("ERRORES");
    for (const result of results.filter((r) => r.kind === "error")) {
      lines.push(`  ${result.title} (${result.productId}) — ${result.message}`);
    }
    lines.push("");
  }

  await writeFile(REPORT_TEXT_PATH, lines.join("\n") + "\n", "utf8");

  console.log(lines.join("\n"));
  console.log(`Reporte JSON: ${REPORT_JSON_PATH}`);
  console.log(`Reporte TXT:  ${REPORT_TEXT_PATH}`);

  if (!APPLY) {
    console.log("");
    console.log("Este fue un dry-run: no se escribió nada en Sanity.");
    console.log("Para aplicar los cambios reales, ejecutá:");
    console.log("  npx tsx scripts/backfill-transfer-price.ts --apply");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
