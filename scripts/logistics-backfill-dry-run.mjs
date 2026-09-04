import dotenv from "dotenv";
import { createClient } from "@sanity/client";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  buildVariantSignature,
  decodeWindows1252,
  normalizeProducts,
  parseCsvRows,
  slugify,
} from "./import-tiendanube.mjs";

const ROOT_DIR = process.cwd();
const CSV_PATH = path.join(
  ROOT_DIR,
  "imports",
  "tiendanube-4147750-17859311121905920727825559417 (1).csv",
);
const REPORT_JSON_PATH = path.join(ROOT_DIR, "reports", "logistics-backfill-dry-run.json");
const REPORT_TEXT_PATH = path.join(ROOT_DIR, "reports", "logistics-backfill-dry-run.txt");

function loadEnvFiles() {
  dotenv.config({ path: path.join(ROOT_DIR, ".env.example"), override: false });
  dotenv.config({ path: path.join(ROOT_DIR, ".env.local"), override: false });
  dotenv.config({ path: path.join(ROOT_DIR, ".env.production.local"), override: false });
}

function normalizeText(value) {
  return String(value ?? "")
    .replace(/\u0000/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeComparableText(value) {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function parsePositiveLogistics(row) {
  const weightKg = row.sourceWeight;
  const heightCm = row.sourceDimensions?.heightCm;
  const widthCm = row.sourceDimensions?.widthCm;
  const depthCm = row.sourceDimensions?.depthCm;

  const rawValues = [weightKg, heightCm, widthCm, depthCm];
  const allPresent = rawValues.every((value) => typeof value === "number" && Number.isFinite(value));

  if (!allPresent) {
    return {
      status: "invalid",
      reason: "Faltan uno o mas campos de peso o dimensiones.",
      value: null,
    };
  }

  if (weightKg <= 0 || heightCm <= 0 || widthCm <= 0 || depthCm <= 0) {
    return {
      status: "invalid",
      reason: "El peso o alguna dimension no es positiva.",
      value: null,
    };
  }

  return {
    status: "complete",
    reason: null,
    value: {
      weightGrams: Math.round(weightKg * 1000),
      heightCm,
      widthCm,
      depthCm,
    },
  };
}

function logisticsKey(logistics) {
  if (!logistics) {
    return "";
  }

  return [
    logistics.weightGrams,
    logistics.heightCm,
    logistics.widthCm,
    logistics.depthCm,
  ].join("|");
}

function isCompleteLogistics(logistics) {
  return (
    logistics &&
    typeof logistics.weightGrams === "number" &&
    Number.isFinite(logistics.weightGrams) &&
    logistics.weightGrams > 0 &&
    typeof logistics.heightCm === "number" &&
    Number.isFinite(logistics.heightCm) &&
    logistics.heightCm > 0 &&
    typeof logistics.widthCm === "number" &&
    Number.isFinite(logistics.widthCm) &&
    logistics.widthCm > 0 &&
    typeof logistics.depthCm === "number" &&
    Number.isFinite(logistics.depthCm) &&
    logistics.depthCm > 0
  );
}

function buildSourceLogisticsRows(rows) {
  return rows.map((row) => {
    const parsed = parsePositiveLogistics(row);

    return {
      rowNumber: row.rowNumber,
      sku: normalizeText(row.sourceSku),
      title: normalizeText(row.sourceProductName),
      variantSignature: buildVariantSignature(row.variantAttributes).signature || "__product__",
      variantLabel: buildVariantSignature(row.variantAttributes).label || normalizeText(row.sourceProductName),
      variantValue: buildVariantSignature(row.variantAttributes).value || "",
      rawWeightKg: row.sourceWeight ?? null,
      rawDimensions: row.sourceDimensions ?? null,
      status: parsed.status,
      reason: parsed.reason,
      logistics: parsed.value,
    };
  });
}

function groupRowsByProduct(rows) {
  const groups = new Map();

  for (const row of rows) {
    const sourceId = slugify(row.sourceProductUrlIdentifier);

    if (!groups.has(sourceId)) {
      groups.set(sourceId, []);
    }

    groups.get(sourceId).push(row);
  }

  return groups;
}

function groupRowsByVariant(rows) {
  const groups = new Map();

  for (const row of rows) {
    const signature = buildVariantSignature(row.variantAttributes).signature || "__product__";

    if (!groups.has(signature)) {
      groups.set(signature, []);
    }

    groups.get(signature).push(row);
  }

  return groups;
}

function summarizeLogisticsGroup(rows) {
  const logisticsEntries = buildSourceLogisticsRows(rows);
  const completeEntries = logisticsEntries.filter((entry) => entry.status === "complete" && entry.logistics);
  const invalidEntries = logisticsEntries.filter((entry) => entry.status !== "complete");
  const uniqueLogistics = [...new Map(completeEntries.map((entry) => [logisticsKey(entry.logistics), entry.logistics])).values()];

  if (completeEntries.length === 0) {
    return {
      status: "INVALID_LOGISTICS",
      reason: "No hay una logistica completa valida en este grupo.",
      logistics: null,
      entries: logisticsEntries,
    };
  }

  if (uniqueLogistics.length > 1) {
    return {
      status: "INVALID_LOGISTICS",
      reason: "El grupo contiene mas de una logistica distinta.",
      logistics: null,
      entries: logisticsEntries,
    };
  }

  if (invalidEntries.length > 0) {
    return {
      status: "INVALID_LOGISTICS",
      reason: "El grupo mezcla filas validas con filas incompletas o invalidas.",
      logistics: null,
      entries: logisticsEntries,
    };
  }

  return {
    status: "complete",
    reason: null,
    logistics: uniqueLogistics[0],
    entries: logisticsEntries,
  };
}

function buildCurrentVariantRecords(product) {
  const canonicalVariants = Array.isArray(product.variants) && product.variants.length > 0;
  const sourceVariants = canonicalVariants ? product.variants ?? [] : product.colorVariants ?? [];

  return sourceVariants.map((variant) => {
    const logistics = variant.logistics ?? null;
    const attributes = canonicalVariants
      ? Array.isArray(variant.attributes)
        ? variant.attributes
        : []
      : [
          {
            name: "Color",
            value: normalizeText(variant.value ?? variant.title ?? ""),
          },
        ];

    const signature = canonicalVariants
      ? buildVariantSignature(
          attributes.map((attribute) => ({
            name: normalizeText(attribute.name),
            value: normalizeText(attribute.value),
          })),
        ).signature
      : `Color:${normalizeComparableText(variant.value ?? variant.title ?? "")}`;

    return {
      key: normalizeText(variant._key) || normalizeText(variant.value) || normalizeText(variant.title),
      title: normalizeText(variant.title),
      value: normalizeText(variant.value),
      sku: normalizeText(variant.sku),
      logistics,
      hasCompleteLogistics: isCompleteLogistics(logistics),
      attributes,
      signature,
      sourceType: canonicalVariants ? "variants" : "colorVariants",
    };
  });
}

function buildSanityIndexes(products) {
  const byId = new Map();
  const bySlug = new Map();
  const byTitle = new Map();
  const bySku = new Map();

  for (const product of products) {
    const normalizedTitle = normalizeComparableText(product.title);
    const normalizedSlug = normalizeComparableText(product.slug);

    if (!byId.has(product._id)) {
      byId.set(product._id, []);
    }
    byId.get(product._id).push(product);

    if (!bySlug.has(normalizedSlug)) {
      bySlug.set(normalizedSlug, []);
    }
    bySlug.get(normalizedSlug).push(product);

    if (!byTitle.has(normalizedTitle)) {
      byTitle.set(normalizedTitle, []);
    }
    byTitle.get(normalizedTitle).push(product);

    for (const variant of buildCurrentVariantRecords(product)) {
      if (!variant.sku) {
        continue;
      }

      if (!bySku.has(variant.sku)) {
        bySku.set(variant.sku, []);
      }
      bySku.get(variant.sku).push({
        product,
        variant,
      });
    }
  }

  return {
    byId,
    bySlug,
    byTitle,
    bySku,
  };
}

function findUniqueItem(matches) {
  if (!matches || matches.length === 0) {
    return null;
  }

  if (matches.length > 1) {
    return null;
  }

  return matches[0];
}

function resolveProductMatch(sourceProduct, indexes) {
  const importId = `import-product-${sourceProduct.slug}`;
  const exactIdMatch = findUniqueItem(indexes.byId.get(importId) ?? []);
  if (exactIdMatch) {
    return {
      status: "MATCH_EXACT",
      method: "import_id",
      product: exactIdMatch,
      productId: exactIdMatch._id,
      reason: `Coincidencia exacta por _id (${importId}).`,
    };
  }

  const exactSlugMatch = findUniqueItem(indexes.bySlug.get(normalizeComparableText(sourceProduct.slug)) ?? []);
  if (exactSlugMatch) {
    return {
      status: "MATCH_EXACT",
      method: "slug",
      product: exactSlugMatch,
      productId: exactSlugMatch._id,
      reason: `Coincidencia exacta por slug (${sourceProduct.slug}).`,
    };
  }

  const sourceSku = normalizeText(sourceProduct.sourceSku ?? "");
  if (sourceSku) {
    const skuMatches = indexes.bySku.get(sourceSku) ?? [];
    const uniqueSkuProducts = [
      ...new Map(skuMatches.map((item) => [item.product._id, item.product])).values(),
    ];

    if (uniqueSkuProducts.length === 1) {
      return {
        status: "MATCH_EXACT",
        method: "sku",
        product: uniqueSkuProducts[0],
        productId: uniqueSkuProducts[0]._id,
        reason: `Coincidencia exacta por SKU (${sourceSku}).`,
      };
    }

    if (uniqueSkuProducts.length > 1) {
      return {
        status: "AMBIGUOUS",
        method: "sku",
        product: null,
        productId: null,
        reason: `El SKU ${sourceSku} coincide con mas de un producto.`,
      };
    }
  }

  const titleMatches = indexes.byTitle.get(normalizeComparableText(sourceProduct.title)) ?? [];
  const uniqueTitleMatch = findUniqueItem(titleMatches);
  if (uniqueTitleMatch) {
    return {
      status: "MATCH_EXACT",
      method: "title",
      product: uniqueTitleMatch,
      productId: uniqueTitleMatch._id,
      reason: `Coincidencia exacta por titulo (${sourceProduct.title}).`,
    };
  }

  if (titleMatches.length > 1) {
    return {
      status: "AMBIGUOUS",
      method: "title",
      product: null,
      productId: null,
      reason: `El titulo ${sourceProduct.title} coincide con mas de un producto.`,
    };
  }

  return {
    status: "NOT_FOUND",
    method: null,
    product: null,
    productId: null,
    reason: "No hubo match exacto con ID, slug, SKU ni titulo.",
  };
}

function resolveVariantMatch(sourceVariantGroup, matchedProduct) {
  const currentVariants = buildCurrentVariantRecords(matchedProduct);

  if (currentVariants.length === 0) {
    return {
      status: "NOT_FOUND",
      method: null,
      variant: null,
      reason: "El producto no tiene variantes actuales sobre las que matchear.",
    };
  }

  const sourceSku = normalizeText(sourceVariantGroup.entries.find((entry) => entry.sku)?.sku ?? "");
  if (sourceSku) {
    const skuMatches = currentVariants.filter((variant) => variant.sku === sourceSku);

    if (skuMatches.length === 1) {
      return {
        status: "MATCH_VARIANT",
        method: "sku",
        variant: skuMatches[0],
        reason: `Coincidencia exacta de variante por SKU (${sourceSku}).`,
      };
    }

    if (skuMatches.length > 1) {
      return {
        status: "AMBIGUOUS",
        method: "sku",
        variant: null,
        reason: `El SKU de variante ${sourceSku} coincide con mas de una variante.`,
      };
    }
  }

  const sourceSignature = sourceVariantGroup.signature;
  const signatureMatches = currentVariants.filter((variant) => variant.signature === sourceSignature);
  if (signatureMatches.length === 1) {
    return {
      status: "MATCH_VARIANT",
      method: "signature",
      variant: signatureMatches[0],
      reason: `Coincidencia exacta de variante por atributos (${sourceSignature}).`,
    };
  }

  if (signatureMatches.length > 1) {
    return {
      status: "AMBIGUOUS",
      method: "signature",
      variant: null,
      reason: `La firma de atributos ${sourceSignature} coincide con mas de una variante.`,
    };
  }

  const sourceValue = normalizeComparableText(sourceVariantGroup.variantValue);
  if (sourceValue) {
    const valueMatches = currentVariants.filter(
      (variant) => normalizeComparableText(variant.value || variant.title) === sourceValue,
    );

    if (valueMatches.length === 1) {
      return {
        status: "MATCH_VARIANT",
        method: "value",
        variant: valueMatches[0],
        reason: `Coincidencia exacta de variante por value/titulo (${sourceVariantGroup.variantValue}).`,
      };
    }

    if (valueMatches.length > 1) {
      return {
        status: "AMBIGUOUS",
        method: "value",
        variant: null,
        reason: `El value/titulo ${sourceVariantGroup.variantValue} coincide con mas de una variante.`,
      };
    }
  }

  return {
    status: "NOT_FOUND",
    method: null,
    variant: null,
    reason: "No hubo match exacto de variante por SKU, atributos ni value/titulo.",
  };
}

function compareLogistics(left, right) {
  return logisticsKey(left) === logisticsKey(right);
}

function buildProductSourceGroups(normalizedProducts, parsedRows) {
  const rawRowsBySlug = groupRowsByProduct(parsedRows);
  return normalizedProducts.map((product) => {
    const rawRows = rawRowsBySlug.get(product.slug) ?? [];
    return {
      ...product,
      rawRows,
      rawLogisticsRows: buildSourceLogisticsRows(rawRows),
      sourceSku: normalizeText(rawRows.find((row) => normalizeText(row.sourceSku))?.sourceSku ?? ""),
    };
  });
}

function evaluateProductLogisticsPlan(sourceProduct, productMatch) {
  const rawRows = sourceProduct.rawRows;
  const variantGroups = [...groupRowsByVariant(rawRows).entries()].map(([signature, rows]) => ({
    signature,
    rows,
    summary: summarizeLogisticsGroup(rows),
  }));

  const allVariantSummariesAreComplete = variantGroups.every((group) => group.summary.status === "complete");
  const allVariantLogistics = variantGroups
    .filter((group) => group.summary.status === "complete" && group.summary.logistics)
    .map((group) => group.summary.logistics);
  const uniqueVariantLogistics = [...new Map(allVariantLogistics.map((logistics) => [logisticsKey(logistics), logistics])).values()];
  const productSummary = summarizeLogisticsGroup(rawRows);
  const currentProductLogistics = productMatch.product?.logistics ?? null;
  const currentProductHasCompleteLogistics = isCompleteLogistics(currentProductLogistics);

  const canonicalVariants = buildCurrentVariantRecords(productMatch.product ?? {});
  const canStoreVariantOverrides = canonicalVariants.length > 0;
  const hasLegacyVariantModel = (productMatch.product?.colorVariants ?? []).length > 0 && canonicalVariants.length === 0;

  const targets = [];

  if (productSummary.status === "complete" && allVariantSummariesAreComplete && uniqueVariantLogistics.length === 1) {
    const sourceLogistics = productSummary.logistics;

    if (currentProductHasCompleteLogistics) {
      targets.push({
        destination: "product.logistics",
        status:
          compareLogistics(currentProductLogistics, sourceLogistics) ? "ALREADY_HAS_LOGISTICS" : "REVIEW_REQUIRED",
        reason: compareLogistics(currentProductLogistics, sourceLogistics)
          ? "El producto ya tiene una logistica completa igual a la fuente."
          : "El producto ya tiene logistica completa pero no coincide con la fuente historica.",
        proposedLogistics: sourceLogistics,
        currentLogistics: currentProductLogistics,
      });
    } else {
      targets.push({
        destination: "product.logistics",
        status: "SAFE_TO_BACKFILL",
        reason: "La fuente historica tiene una logistica completa uniforme para todo el producto.",
        proposedLogistics: sourceLogistics,
        currentLogistics: currentProductLogistics,
      });
    }

    return {
      productMode: "product",
      targets,
      sourceLogistics: sourceLogistics,
      variantGroups,
      currentProductLogistics,
      canStoreVariantOverrides,
      hasLegacyVariantModel,
    };
  }

  if (productSummary.status !== "complete") {
    return {
      productMode: "invalid",
      targets: [
        {
          destination: "product.logistics",
          status: "INVALID_LOGISTICS",
          reason: productSummary.reason,
          proposedLogistics: null,
          currentLogistics: currentProductLogistics,
        },
      ],
      sourceLogistics: null,
      variantGroups,
      currentProductLogistics,
      canStoreVariantOverrides,
      hasLegacyVariantModel,
    };
  }

  if (variantGroups.some((group) => group.summary.status !== "complete")) {
    return {
      productMode: "variant-review",
      targets: variantGroups.map((group) => ({
        destination: canStoreVariantOverrides ? "variant.logistics" : "product.logistics",
        status: "REVIEW_REQUIRED",
        reason:
          group.summary.status === "INVALID_LOGISTICS"
            ? group.summary.reason
            : "El grupo de variantes no tiene una logistica completa uniforme.",
        variantSignature: group.signature,
        proposedLogistics: group.summary.logistics,
        currentLogistics: null,
      })),
      sourceLogistics: null,
      variantGroups,
      currentProductLogistics,
      canStoreVariantOverrides,
      hasLegacyVariantModel,
    };
  }

  const distinctVariantLogistics = uniqueVariantLogistics;

  if (distinctVariantLogistics.length === 1) {
    const sourceLogistics = distinctVariantLogistics[0];

    if (currentProductHasCompleteLogistics) {
      targets.push({
        destination: "product.logistics",
        status:
          compareLogistics(currentProductLogistics, sourceLogistics) ? "ALREADY_HAS_LOGISTICS" : "REVIEW_REQUIRED",
        reason: compareLogistics(currentProductLogistics, sourceLogistics)
          ? "El producto ya tiene una logistica base igual a la fuente historica."
          : "El producto ya tiene una logistica base que no coincide con la fuente historica.",
        proposedLogistics: sourceLogistics,
        currentLogistics: currentProductLogistics,
      });
    } else {
      targets.push({
        destination: "product.logistics",
        status: "SAFE_TO_BACKFILL",
        reason: "Todas las variantes comparten la misma logistica y el producto no tiene base completa.",
        proposedLogistics: sourceLogistics,
        currentLogistics: currentProductLogistics,
      });
    }

    return {
      productMode: "uniform-variant-logistics",
      targets,
      sourceLogistics,
      variantGroups,
      currentProductLogistics,
      canStoreVariantOverrides,
      hasLegacyVariantModel,
    };
  }

  if (!canStoreVariantOverrides && hasLegacyVariantModel) {
    return {
      productMode: "legacy-variant-model",
      targets: [
        {
          destination: "product.logistics",
          status: "REVIEW_REQUIRED",
          reason:
            "El producto usa colorVariants legacy y la fuente historica tiene logisticas distintas por variante, asi que no se puede completar automaticamente sin migrar el modelo legacy.",
          proposedLogistics: null,
          currentLogistics: currentProductLogistics,
        },
      ],
      sourceLogistics: null,
      variantGroups,
      currentProductLogistics,
      canStoreVariantOverrides,
      hasLegacyVariantModel,
    };
  }

  const variantTargets = [];

  for (const group of variantGroups) {
    const variantMatch = resolveVariantMatch(group, productMatch.product);
    const currentVariant = variantMatch.variant;
    const sourceLogistics = group.summary.logistics;

    if (variantMatch.status === "AMBIGUOUS") {
      variantTargets.push({
        destination: canStoreVariantOverrides ? "variant.logistics" : "product.logistics",
        status: "AMBIGUOUS",
        reason: variantMatch.reason,
        variantSignature: group.signature,
        proposedLogistics: sourceLogistics,
        currentLogistics: currentVariant?.logistics ?? null,
        matchMethod: variantMatch.method,
      });
      continue;
    }

    if (variantMatch.status === "NOT_FOUND") {
      variantTargets.push({
        destination: canStoreVariantOverrides ? "variant.logistics" : "product.logistics",
        status: "NOT_FOUND",
        reason: variantMatch.reason,
        variantSignature: group.signature,
        proposedLogistics: sourceLogistics,
        currentLogistics: null,
        matchMethod: variantMatch.method,
      });
      continue;
    }

    const currentVariantLogistics = currentVariant?.logistics ?? null;
    const currentVariantHasCompleteLogistics = isCompleteLogistics(currentVariantLogistics);
    const equalToProductBase =
      currentProductHasCompleteLogistics && compareLogistics(sourceLogistics, currentProductLogistics);

    if (currentVariantHasCompleteLogistics) {
      variantTargets.push({
        destination: canStoreVariantOverrides ? "variant.logistics" : "product.logistics",
        status: compareLogistics(currentVariantLogistics, sourceLogistics)
          ? "ALREADY_HAS_LOGISTICS"
          : "REVIEW_REQUIRED",
        reason: compareLogistics(currentVariantLogistics, sourceLogistics)
          ? "La variante ya tiene una logistica completa igual a la fuente."
          : "La variante ya tiene logistica completa pero no coincide con la fuente historica.",
        variantSignature: group.signature,
        proposedLogistics: sourceLogistics,
        currentLogistics: currentVariantLogistics,
        matchMethod: variantMatch.method,
      });
      continue;
    }

    if (equalToProductBase) {
      variantTargets.push({
        destination: canStoreVariantOverrides ? "variant.logistics" : "product.logistics",
        status: "ALREADY_HAS_LOGISTICS",
        reason: "La variante ya queda cubierta por la logistica base del producto.",
        variantSignature: group.signature,
        proposedLogistics: sourceLogistics,
        currentLogistics: currentVariantLogistics,
        matchMethod: variantMatch.method,
      });
      continue;
    }

    variantTargets.push({
      destination: canStoreVariantOverrides ? "variant.logistics" : "product.logistics",
      status: "SAFE_TO_BACKFILL",
      reason: "La variante no tiene override completo y la fuente historica es completa.",
      variantSignature: group.signature,
      proposedLogistics: sourceLogistics,
      currentLogistics: currentVariantLogistics,
      matchMethod: variantMatch.method,
    });
  }

  return {
    productMode: "variant-specific",
    targets: variantTargets,
    sourceLogistics: null,
    variantGroups,
    currentProductLogistics,
    canStoreVariantOverrides,
    hasLegacyVariantModel,
  };
}

function buildRowStatistics(rawRows) {
  const stats = {
    withWeightOnly: 0,
    withDimensionsOnly: 0,
    complete: 0,
    incomplete: 0,
  };

  for (const row of rawRows) {
    const weightKg = row.sourceWeight;
    const heightCm = row.sourceDimensions?.heightCm;
    const widthCm = row.sourceDimensions?.widthCm;
    const depthCm = row.sourceDimensions?.depthCm;

    const hasWeight = typeof weightKg === "number" && Number.isFinite(weightKg) && weightKg > 0;
    const hasHeight = typeof heightCm === "number" && Number.isFinite(heightCm) && heightCm > 0;
    const hasWidth = typeof widthCm === "number" && Number.isFinite(widthCm) && widthCm > 0;
    const hasDepth = typeof depthCm === "number" && Number.isFinite(depthCm) && depthCm > 0;
    const hasDimensions = hasHeight && hasWidth && hasDepth;

    if (hasWeight && hasDimensions) {
      stats.complete += 1;
      continue;
    }

    stats.incomplete += 1;

    if (hasWeight && !hasDimensions) {
      stats.withWeightOnly += 1;
    } else if (!hasWeight && hasDimensions) {
      stats.withDimensionsOnly += 1;
    }
  }

  return stats;
}

function buildTextReport(report) {
  const lines = [];
  lines.push("Logistics backfill dry-run");
  lines.push(`Generated at: ${report.generatedAt}`);
  lines.push(`Source file: ${report.sourceFile}`);
  lines.push("");
  lines.push("Summary");
  lines.push(`- Tiendanube rows analyzed: ${report.summary.rowsAnalyzed}`);
  lines.push(`- Tiendanube products analyzed: ${report.summary.productsAnalyzed}`);
  lines.push(`- Sanity products current: ${report.summary.currentSanityProducts}`);
  lines.push(`- Exact matches: ${report.summary.exactMatches}`);
  lines.push(`- Variant matches: ${report.summary.variantMatches}`);
  lines.push(`- Auto-recoverable products: ${report.summary.autoRecoverableProducts}`);
  lines.push(`- Auto-recoverable variants: ${report.summary.autoRecoverableVariants}`);
  lines.push(`- Ambiguous products: ${report.summary.ambiguousProducts}`);
  lines.push(`- Unmatched products: ${report.summary.notFoundProducts}`);
  lines.push(`- Rows with weight but no dimensions: ${report.summary.rowsWithWeightOnly}`);
  lines.push(`- Rows with dimensions but no weight: ${report.summary.rowsWithDimensionsOnly}`);
  lines.push(`- Rows with complete logistics: ${report.summary.rowsWithCompleteLogistics}`);
  lines.push(`- Products already with manual logistics: ${report.summary.productsAlreadyWithManualLogistics}`);
  lines.push("");
  lines.push(`Products that can receive automatic logistics backfill: ${report.summary.autoRecoverableProducts} / ${report.summary.currentSanityProducts} (${report.summary.autoRecoverableProductsPercent}%)`);
  lines.push(`Is it safe to run the automatic backfill now: ${report.summary.safeToRunBackfill ? "YES" : "NO"}`);
  lines.push("");
  lines.push("Sample recoverable cases");
  for (const item of report.candidates.filter((candidate) => candidate.state === "SAFE_TO_BACKFILL").slice(0, 10)) {
    lines.push(`- ${item.slug} | ${item.state} | ${item.reason}`);
  }
  lines.push("");
  lines.push("Blocked cases");
  for (const item of report.problems.slice(0, 20)) {
    lines.push(`- ${item.slug} | ${item.state} | ${item.reason}`);
  }
  return lines.join("\n");
}

async function fetchSanityProducts(client) {
  const query = `
    *[_type == "product"]{
      _id,
      title,
      "slug": slug.current,
      logistics{
        weightGrams,
        heightCm,
        widthCm,
        depthCm
      },
      variants[]{
        _key,
        title,
        value,
        sku,
        isActive,
        logistics{
          weightGrams,
          heightCm,
          widthCm,
          depthCm
        },
        attributes[]{
          name,
          value
        }
      },
      colorVariants[]{
        _key,
        title,
        value,
        sku,
        basePrice,
        transferPrice,
        stock
      }
    }
  `;

  return client.fetch(query);
}

async function main() {
  loadEnvFiles();

  const projectId =
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_PROJECT_ID || "";
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || process.env.SANITY_DATASET || "";
  const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2026-04-01";
  const readToken = process.env.SANITY_READ_TOKEN || "";

  if (!projectId || !dataset) {
    throw new Error(
      "Missing Sanity config. Set NEXT_PUBLIC_SANITY_PROJECT_ID and NEXT_PUBLIC_SANITY_DATASET (or SANITY_PROJECT_ID / SANITY_DATASET).",
    );
  }

  const client = createClient({
    projectId,
    dataset,
    apiVersion,
    useCdn: !readToken,
    token: readToken || undefined,
    perspective: "published",
  });

  const buffer = await readFile(CSV_PATH);
  const csvText = decodeWindows1252(buffer);
  const parsed = parseCsvRows(csvText);
  const normalized = normalizeProducts(parsed.rows);
  const sourceGroups = buildProductSourceGroups(normalized.products, parsed.rows);

  const sanityProducts = await fetchSanityProducts(client);
  const indexes = buildSanityIndexes(sanityProducts);

  const candidates = [];
  const problems = [];
  const stats = {
    exactMatches: 0,
    variantMatches: 0,
    safeProductTargets: 0,
    safeVariantTargets: 0,
    ambiguousProducts: 0,
    notFoundProducts: 0,
    invalidProducts: 0,
    alreadyHasManualLogisticsProducts: 0,
    productsWithAnySafeTarget: 0,
    productsFullyRecoverableAutomatically: 0,
  };

  for (const sourceProduct of sourceGroups) {
    const productMatch = resolveProductMatch(sourceProduct, indexes);

    if (productMatch.status === "AMBIGUOUS") {
      stats.ambiguousProducts += 1;
      problems.push({
        slug: sourceProduct.slug,
        state: "AMBIGUOUS",
        reason: productMatch.reason,
      });
      candidates.push({
        slug: sourceProduct.slug,
        title: sourceProduct.title,
        sku: sourceProduct.sourceSku || null,
        matchStatus: productMatch.status,
        matchMethod: productMatch.method,
        productId: null,
        destination: null,
        state: "AMBIGUOUS",
        reason: productMatch.reason,
        sourceLogistics: null,
        currentLogistics: null,
        targets: [],
        rawRows: sourceProduct.rawRows.length,
        variantGroups: [],
      });
      continue;
    }

    if (productMatch.status === "NOT_FOUND") {
      stats.notFoundProducts += 1;
      problems.push({
        slug: sourceProduct.slug,
        state: "NOT_FOUND",
        reason: productMatch.reason,
      });
      candidates.push({
        slug: sourceProduct.slug,
        title: sourceProduct.title,
        sku: sourceProduct.sourceSku || null,
        matchStatus: productMatch.status,
        matchMethod: productMatch.method,
        productId: null,
        destination: null,
        state: "NOT_FOUND",
        reason: productMatch.reason,
        sourceLogistics: null,
        currentLogistics: null,
        targets: [],
        rawRows: sourceProduct.rawRows.length,
        variantGroups: [],
      });
      continue;
    }

    const logisticsPlan = evaluateProductLogisticsPlan(sourceProduct, productMatch);
    const isManualExisting =
      isCompleteLogistics(logisticsPlan.currentProductLogistics) ||
      logisticsPlan.targets.some((target) => target.status === "ALREADY_HAS_LOGISTICS");

    if (isManualExisting) {
      stats.alreadyHasManualLogisticsProducts += 1;
    }

    const safeTargets = logisticsPlan.targets.filter((target) => target.status === "SAFE_TO_BACKFILL");
    const reviewTargets = logisticsPlan.targets.filter((target) => target.status === "REVIEW_REQUIRED");
    const ambiguousTargets = logisticsPlan.targets.filter((target) => target.status === "AMBIGUOUS");
    const notFoundTargets = logisticsPlan.targets.filter((target) => target.status === "NOT_FOUND");
    const invalidTargets = logisticsPlan.targets.filter((target) => target.status === "INVALID_LOGISTICS");

    stats.safeProductTargets += logisticsPlan.targets.filter(
      (target) => target.destination === "product.logistics" && target.status === "SAFE_TO_BACKFILL",
    ).length;
    stats.safeVariantTargets += logisticsPlan.targets.filter(
      (target) => target.destination === "variant.logistics" && target.status === "SAFE_TO_BACKFILL",
    ).length;

    if (productMatch.status === "MATCH_EXACT") {
      stats.exactMatches += 1;
    }

    if (
      logisticsPlan.targets.some((target) => target.matchMethod === "sku" || target.matchMethod === "signature")
    ) {
      stats.variantMatches += logisticsPlan.targets.filter(
        (target) => target.matchMethod === "sku" || target.matchMethod === "signature",
      ).length;
    }

    if (safeTargets.length > 0) {
      stats.productsWithAnySafeTarget += 1;
    }

    const missingTargets = logisticsPlan.targets.filter(
      (target) => target.status === "SAFE_TO_BACKFILL" || target.status === "REVIEW_REQUIRED" || target.status === "AMBIGUOUS" || target.status === "NOT_FOUND" || target.status === "INVALID_LOGISTICS",
    );
    if (missingTargets.length > 0 && missingTargets.every((target) => target.status === "SAFE_TO_BACKFILL")) {
      stats.productsFullyRecoverableAutomatically += 1;
    }

    if (invalidTargets.length > 0) {
      stats.invalidProducts += 1;
    }

    for (const target of logisticsPlan.targets) {
      if (target.status !== "SAFE_TO_BACKFILL" && target.status !== "ALREADY_HAS_LOGISTICS") {
        problems.push({
          slug: sourceProduct.slug,
          state: target.status,
          reason: target.reason,
        });
      }

      candidates.push({
        slug: sourceProduct.slug,
        title: sourceProduct.title,
        sku: sourceProduct.sourceSku || null,
        matchStatus: productMatch.status === "MATCH_EXACT" && target.matchMethod ? "MATCH_VARIANT" : productMatch.status,
        matchMethod: target.matchMethod ?? productMatch.method,
        productId: productMatch.productId,
        destination: target.destination,
        state: target.status,
        reason: target.reason,
        sourceLogistics: target.proposedLogistics,
        currentLogistics: target.currentLogistics,
        variantSignature: target.variantSignature ?? null,
        rawRows: sourceProduct.rawRows.length,
        variantGroups: logisticsPlan.variantGroups.map((group) => ({
          signature: group.signature,
          rows: group.rows.map((row) => row.rowNumber),
          state: group.summary.status,
          reason: group.summary.reason,
          logistics: group.summary.logistics,
        })),
      });
    }

    const hasAnyProblem = reviewTargets.length > 0 || ambiguousTargets.length > 0 || notFoundTargets.length > 0 || invalidTargets.length > 0;
    if (!hasAnyProblem && safeTargets.length > 0) {
      stats.productsFullyRecoverableAutomatically += 0; // keep explicit, no-op.
    }
  }

  const currentSanityProducts = sanityProducts.length;
  const rowsWithWeightOnly = buildRowStatistics(parsed.rows).withWeightOnly;
  const rowsWithDimensionsOnly = buildRowStatistics(parsed.rows).withDimensionsOnly;
  const rowsWithCompleteLogistics = buildRowStatistics(parsed.rows).complete;
  const rowsIncomplete = buildRowStatistics(parsed.rows).incomplete;

  const summary = {
    rowsAnalyzed: parsed.rows.length,
    productsAnalyzed: normalized.products.length,
    currentSanityProducts,
    exactMatches: stats.exactMatches,
    variantMatches: stats.variantMatches,
    autoRecoverableProducts: stats.productsFullyRecoverableAutomatically,
    autoRecoverableVariants: stats.safeVariantTargets,
    ambiguousProducts: stats.ambiguousProducts,
    notFoundProducts: stats.notFoundProducts,
    invalidProducts: stats.invalidProducts,
    rowsWithWeightOnly,
    rowsWithDimensionsOnly,
    rowsWithCompleteLogistics,
    rowsIncomplete,
    productsAlreadyWithManualLogistics: stats.alreadyHasManualLogisticsProducts,
    productsWithAnySafeTarget: stats.productsWithAnySafeTarget,
    autoRecoverableProductsPercent: currentSanityProducts
      ? Number(((stats.productsFullyRecoverableAutomatically / currentSanityProducts) * 100).toFixed(2))
      : 0,
    safeToRunBackfill: false,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    sourceFile: CSV_PATH,
    sourceCsvRows: parsed.rows.length,
    sourceCsvProducts: normalized.products.length,
    sanity: {
      projectId,
      dataset,
      currentProducts: currentSanityProducts,
    },
    summary,
    candidates,
    problems,
  };

  await mkdir(path.dirname(REPORT_JSON_PATH), { recursive: true });
  await writeFile(REPORT_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(REPORT_TEXT_PATH, `${buildTextReport(report)}\n`, "utf8");

  console.log(buildTextReport(report));
  console.log("");
  console.log(`JSON report written to: ${REPORT_JSON_PATH}`);
  console.log(`Text report written to: ${REPORT_TEXT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
