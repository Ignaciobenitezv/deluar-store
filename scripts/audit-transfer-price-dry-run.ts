/**
 * Read-only audit of Deluar's transfer-price (20% off) rule against the
 * currently published catalog in Sanity.
 *
 * DRY-RUN ONLY. This script never imports a write-capable Sanity client and
 * never calls `.patch()`/`.commit()` — there is no code path here that can
 * modify a document, by construction, not just by an "--apply" flag that
 * could be misused. It only reads the published dataset and writes a report
 * to reports/transfer-price-audit-dry-run.{json,txt}.
 *
 * Run with: npx tsx scripts/audit-transfer-price-dry-run.ts
 */
import dotenv from "dotenv";
import { createClient } from "@sanity/client";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { calculateTransferPrice, isValidCommercialPrice } from "../src/features/pricing/commercial-pricing";

const ROOT_DIR = process.cwd();
const REPORT_JSON_PATH = path.join(ROOT_DIR, "reports", "transfer-price-audit-dry-run.json");
const REPORT_TEXT_PATH = path.join(ROOT_DIR, "reports", "transfer-price-audit-dry-run.txt");

function loadEnvFiles() {
  dotenv.config({ path: path.join(ROOT_DIR, ".env.example"), override: false });
  dotenv.config({ path: path.join(ROOT_DIR, ".env.local"), override: false });
  dotenv.config({ path: path.join(ROOT_DIR, ".env.production.local"), override: false });
}

loadEnvFiles();

// Read-only client, published perspective — the exact same view the
// storefront and the admin listing already read. No token with write scope
// is referenced anywhere in this file.
const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2024-01-01",
  useCdn: false,
  perspective: "published",
});

type RawVariant = {
  _key: string;
  title?: string;
  basePrice?: number;
  transferPrice?: number;
};

type RawProduct = {
  _id: string;
  title: string;
  basePrice?: number;
  transferPrice?: number;
  variants?: RawVariant[];
  colorVariants?: RawVariant[];
};

type ItemStatus = "correcto" | "faltante" | "incorrecto" | "invalido";

type ProductFinding = {
  productId: string;
  title: string;
  basePrice: number | undefined;
  transferPriceActual: number | undefined | null;
  expectedTransferPrice: number | null;
  status: ItemStatus;
  reason?: string;
};

type VariantFinding = {
  productId: string;
  productTitle: string;
  variantKey: string;
  variantTitle: string | undefined;
  hasOwnBasePrice: boolean;
  basePrice: number | undefined;
  transferPriceActual: number | undefined | null;
  expectedTransferPrice: number | null;
  status: ItemStatus | "heredada_transferprice_a_eliminar" | "heredada_ok";
  reason?: string;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function classifyProduct(product: RawProduct): ProductFinding {
  const base = {
    productId: product._id,
    title: product.title,
    basePrice: product.basePrice,
    transferPriceActual: product.transferPrice ?? null,
  };

  if (!isValidCommercialPrice(product.basePrice)) {
    return {
      ...base,
      expectedTransferPrice: null,
      status: "invalido",
      reason: `basePrice inválido o no positivo (${JSON.stringify(product.basePrice)})`,
    };
  }

  // Sanity's HTTP API round-trips a missing field the same way it round-trips
  // an explicitly-null one — both come back as JSON `null`, never as an
  // absent key — so `null` here means "no transferPrice", not "corrupted
  // value". Only a defined, non-null value that still isn't a finite number
  // (a stray string, NaN, etc.) counts as genuinely invalid.
  if (
    product.transferPrice !== undefined &&
    product.transferPrice !== null &&
    !isFiniteNumber(product.transferPrice)
  ) {
    return {
      ...base,
      expectedTransferPrice: calculateTransferPrice(product.basePrice),
      status: "invalido",
      reason: `transferPrice tiene un tipo/valor inesperado (${JSON.stringify(product.transferPrice)})`,
    };
  }

  const expected = calculateTransferPrice(product.basePrice);

  if (product.transferPrice === undefined || product.transferPrice === null) {
    return { ...base, expectedTransferPrice: expected, status: "faltante" };
  }

  if (product.transferPrice === expected) {
    return { ...base, expectedTransferPrice: expected, status: "correcto" };
  }

  return { ...base, expectedTransferPrice: expected, status: "incorrecto" };
}

function classifyVariant(product: RawProduct, variant: RawVariant): VariantFinding {
  const base = {
    productId: product._id,
    productTitle: product.title,
    variantKey: variant._key,
    variantTitle: variant.title,
    transferPriceActual: variant.transferPrice ?? null,
  };

  const hasOwnBasePrice = isFiniteNumber(variant.basePrice) && variant.basePrice > 0;

  if (!hasOwnBasePrice) {
    // Inherits the product's basePrice/transferPrice — the new architecture
    // expects this variant to have NO own transferPrice at all, so read time
    // correctly falls through to the product's (now-derived) value. A
    // leftover own transferPrice here is a frozen, potentially inconsistent
    // value that a backfill should clear, not "correct" to some number.
    if (isFiniteNumber(variant.transferPrice)) {
      return {
        ...base,
        hasOwnBasePrice: false,
        basePrice: variant.basePrice,
        expectedTransferPrice: null,
        status: "heredada_transferprice_a_eliminar",
      };
    }

    return {
      ...base,
      hasOwnBasePrice: false,
      basePrice: variant.basePrice,
      expectedTransferPrice: null,
      status: "heredada_ok",
    };
  }

  if (
    variant.transferPrice !== undefined &&
    variant.transferPrice !== null &&
    !isFiniteNumber(variant.transferPrice)
  ) {
    return {
      ...base,
      hasOwnBasePrice: true,
      basePrice: variant.basePrice,
      expectedTransferPrice: calculateTransferPrice(variant.basePrice as number),
      status: "invalido",
      reason: `transferPrice tiene un tipo/valor inesperado (${JSON.stringify(variant.transferPrice)})`,
    };
  }

  const expected = calculateTransferPrice(variant.basePrice as number);

  if (variant.transferPrice === undefined || variant.transferPrice === null) {
    return { ...base, hasOwnBasePrice: true, basePrice: variant.basePrice, expectedTransferPrice: expected, status: "faltante" };
  }

  if (variant.transferPrice === expected) {
    return { ...base, hasOwnBasePrice: true, basePrice: variant.basePrice, expectedTransferPrice: expected, status: "correcto" };
  }

  return { ...base, hasOwnBasePrice: true, basePrice: variant.basePrice, expectedTransferPrice: expected, status: "incorrecto" };
}

async function main() {
  const products = await client.fetch<RawProduct[]>(
    `*[_type == "product"]{
      _id,
      title,
      basePrice,
      transferPrice,
      variants[]{ _key, title, basePrice, transferPrice },
      colorVariants[]{ _key, title, basePrice, transferPrice }
    }`,
  );

  const productFindings: ProductFinding[] = [];
  const variantFindings: VariantFinding[] = [];

  let colorVariantProductCount = 0;
  let colorVariantTotal = 0;
  let colorVariantWithOwnBasePrice = 0;
  let colorVariantWithTransferPrice = 0;
  let colorVariantInconsistentUnderNewRule = 0;

  const productsNeedingWrite = new Set<string>();

  for (const product of products) {
    const productFinding = classifyProduct(product);
    productFindings.push(productFinding);

    if (productFinding.status === "faltante" || productFinding.status === "incorrecto") {
      productsNeedingWrite.add(product._id);
    }

    for (const variant of product.variants ?? []) {
      const variantFinding = classifyVariant(product, variant);
      variantFindings.push(variantFinding);

      if (
        variantFinding.status === "faltante" ||
        variantFinding.status === "incorrecto" ||
        variantFinding.status === "heredada_transferprice_a_eliminar"
      ) {
        productsNeedingWrite.add(product._id);
      }
    }

    const colorVariants = product.colorVariants ?? [];
    if (colorVariants.length > 0) {
      colorVariantProductCount += 1;
    }

    for (const colorVariant of colorVariants) {
      colorVariantTotal += 1;
      const hasOwnBasePrice = isFiniteNumber(colorVariant.basePrice) && colorVariant.basePrice > 0;
      const hasTransferPrice = isFiniteNumber(colorVariant.transferPrice);

      if (hasOwnBasePrice) colorVariantWithOwnBasePrice += 1;
      if (hasTransferPrice) colorVariantWithTransferPrice += 1;

      if (hasOwnBasePrice) {
        const expected = calculateTransferPrice(colorVariant.basePrice as number);
        if (!hasTransferPrice || colorVariant.transferPrice !== expected) {
          colorVariantInconsistentUnderNewRule += 1;
        }
      } else if (hasTransferPrice) {
        // Inherited-price colorVariant carrying its own frozen transferPrice
        // — inconsistent under the same "inherit means no own value" rule
        // variants follow, reported here but never touched.
        colorVariantInconsistentUnderNewRule += 1;
      }
    }
  }

  const productSummary = {
    total: productFindings.length,
    correcto: productFindings.filter((f) => f.status === "correcto").length,
    faltante: productFindings.filter((f) => f.status === "faltante").length,
    incorrecto: productFindings.filter((f) => f.status === "incorrecto").length,
    invalido: productFindings.filter((f) => f.status === "invalido").length,
  };

  const variantSummary = {
    total: variantFindings.length,
    correcto: variantFindings.filter((f) => f.status === "correcto").length,
    faltante: variantFindings.filter((f) => f.status === "faltante").length,
    incorrecto: variantFindings.filter((f) => f.status === "incorrecto").length,
    invalido: variantFindings.filter((f) => f.status === "invalido").length,
    heredada_ok: variantFindings.filter((f) => f.status === "heredada_ok").length,
    heredada_transferprice_a_eliminar: variantFindings.filter(
      (f) => f.status === "heredada_transferprice_a_eliminar",
    ).length,
  };

  const colorVariantSummary = {
    productsWithColorVariants: colorVariantProductCount,
    totalColorVariants: colorVariantTotal,
    withOwnBasePrice: colorVariantWithOwnBasePrice,
    withTransferPrice: colorVariantWithTransferPrice,
    inconsistentUnderNewRule: colorVariantInconsistentUnderNewRule,
  };

  const incorrectProductExamples = productFindings
    .filter((f) => f.status === "incorrecto")
    .slice(0, 15)
    .map((f) => ({
      producto: f.title,
      productId: f.productId,
      basePrice: f.basePrice,
      transferPriceActual: f.transferPriceActual,
      esperado: f.expectedTransferPrice,
      diferencia:
        typeof f.transferPriceActual === "number" && f.expectedTransferPrice !== null
          ? f.transferPriceActual - f.expectedTransferPrice
          : null,
    }));

  const invalidProductExamples = productFindings
    .filter((f) => f.status === "invalido")
    .slice(0, 15)
    .map((f) => ({ producto: f.title, productId: f.productId, basePrice: f.basePrice, motivo: f.reason }));

  const incorrectVariantExamples = variantFindings
    .filter((f) => f.status === "incorrecto")
    .slice(0, 15)
    .map((f) => ({
      producto: f.productTitle,
      productId: f.productId,
      variante: f.variantTitle,
      variantKey: f.variantKey,
      basePrice: f.basePrice,
      transferPriceActual: f.transferPriceActual,
      esperado: f.expectedTransferPrice,
      diferencia:
        typeof f.transferPriceActual === "number" && f.expectedTransferPrice !== null
          ? f.transferPriceActual - f.expectedTransferPrice
          : null,
    }));

  const toRemoveVariantExamples = variantFindings
    .filter((f) => f.status === "heredada_transferprice_a_eliminar")
    .slice(0, 15)
    .map((f) => ({
      producto: f.productTitle,
      productId: f.productId,
      variante: f.variantTitle,
      variantKey: f.variantKey,
      transferPricePropioActual: f.transferPriceActual,
    }));

  const report = {
    generatedAt: new Date().toISOString(),
    products: {
      summary: productSummary,
      examples: {
        incorrecto: incorrectProductExamples,
        invalido: invalidProductExamples,
      },
    },
    variants: {
      summary: variantSummary,
      examples: {
        incorrecto: incorrectVariantExamples,
        heredada_transferprice_a_eliminar: toRemoveVariantExamples,
      },
    },
    colorVariantsLegacy: colorVariantSummary,
    documentsThatWouldChange: {
      count: productsNeedingWrite.size,
      note:
        "Cada producto se cuenta una sola vez aunque tenga varias correcciones (propia + de una o más variantes), porque el patch de un backfill futuro sería un único documento por producto.",
    },
  };

  await mkdir(path.join(ROOT_DIR, "reports"), { recursive: true });
  await writeFile(REPORT_JSON_PATH, JSON.stringify(report, null, 2), "utf8");

  const lines: string[] = [];
  lines.push("AUDITORÍA DE TRANSFER PRICE (dry-run, solo lectura) — " + report.generatedAt);
  lines.push("");
  lines.push("PRODUCTOS");
  lines.push(`  total analizados: ${productSummary.total}`);
  lines.push(`  correcto:         ${productSummary.correcto}`);
  lines.push(`  faltante:         ${productSummary.faltante}`);
  lines.push(`  incorrecto:       ${productSummary.incorrecto}`);
  lines.push(`  invalido:         ${productSummary.invalido}`);
  lines.push("");
  lines.push("VARIANTES (variants[])");
  lines.push(`  total analizadas:                        ${variantSummary.total}`);
  lines.push(`  correcto (con basePrice propio):         ${variantSummary.correcto}`);
  lines.push(`  faltante (con basePrice propio):         ${variantSummary.faltante}`);
  lines.push(`  incorrecto (con basePrice propio):       ${variantSummary.incorrecto}`);
  lines.push(`  invalido:                                ${variantSummary.invalido}`);
  lines.push(`  heredadas ok (sin transferPrice propio):  ${variantSummary.heredada_ok}`);
  lines.push(`  heredadas con transferPrice a eliminar:   ${variantSummary.heredada_transferprice_a_eliminar}`);
  lines.push("");
  lines.push("COLORVARIANTS LEGACY (reportadas, no tocadas)");
  lines.push(`  productos que aún las tienen: ${colorVariantSummary.productsWithColorVariants}`);
  lines.push(`  total colorVariants:          ${colorVariantSummary.totalColorVariants}`);
  lines.push(`  con basePrice propio:         ${colorVariantSummary.withOwnBasePrice}`);
  lines.push(`  con transferPrice:            ${colorVariantSummary.withTransferPrice}`);
  lines.push(`  inconsistentes con la regla:  ${colorVariantSummary.inconsistentUnderNewRule}`);
  lines.push("");
  lines.push(`DOCUMENTOS QUE UN BACKFILL REALMENTE MODIFICARÍA: ${report.documentsThatWouldChange.count}`);
  lines.push("");
  lines.push("EJEMPLOS — productos incorrectos (Producto | basePrice | transferPrice actual | esperado | diferencia)");
  for (const example of incorrectProductExamples) {
    lines.push(
      `  ${example.producto} | ${example.basePrice} | ${example.transferPriceActual} | ${example.esperado} | ${example.diferencia}`,
    );
  }
  lines.push("");
  lines.push("EJEMPLOS — variantes incorrectas (Producto > Variante | basePrice | transferPrice actual | esperado | diferencia)");
  for (const example of incorrectVariantExamples) {
    lines.push(
      `  ${example.producto} > ${example.variante} | ${example.basePrice} | ${example.transferPriceActual} | ${example.esperado} | ${example.diferencia}`,
    );
  }
  lines.push("");
  lines.push("EJEMPLOS — variantes heredadas con transferPrice propio a eliminar (Producto > Variante | transferPrice propio actual)");
  for (const example of toRemoveVariantExamples) {
    lines.push(`  ${example.producto} > ${example.variante} | ${example.transferPricePropioActual}`);
  }
  lines.push("");
  lines.push("EJEMPLOS — productos inválidos (Producto | basePrice | motivo)");
  for (const example of invalidProductExamples) {
    lines.push(`  ${example.producto} | ${example.basePrice} | ${example.motivo}`);
  }

  await writeFile(REPORT_TEXT_PATH, lines.join("\n") + "\n", "utf8");

  console.log(lines.join("\n"));
  console.log("");
  console.log(`Reporte JSON: ${REPORT_JSON_PATH}`);
  console.log(`Reporte TXT:  ${REPORT_TEXT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
