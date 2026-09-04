import dotenv from "dotenv";
import { createClient } from "@sanity/client";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  buildVariantSignature,
  decodeWindows1252,
  parseCsvRows,
  slugify,
} from "./import-tiendanube.mjs";

const ROOT_DIR = process.cwd();
const CSV_PATH = path.join(
  ROOT_DIR,
  "imports",
  "tiendanube-4147750-17859311121905920727825559417 (1).csv",
);
const DRY_RUN_REPORT_PATH = path.join(ROOT_DIR, "reports", "logistics-backfill-dry-run.json");
const REVIEW_JSON_PATH = path.join(ROOT_DIR, "reports", "logistics-backfill-blocked-review.json");
const REVIEW_TEXT_PATH = path.join(ROOT_DIR, "reports", "logistics-backfill-blocked-review.txt");

const STOPWORDS = new Set([
  "de",
  "del",
  "la",
  "el",
  "y",
  "con",
  "sin",
  "para",
  "por",
  "un",
  "una",
  "unos",
  "unas",
  "al",
  "en",
  "o",
  "the",
]);

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

function tokenize(value) {
  return normalizeComparableText(value)
    .split(/[^a-z0-9]+/g)
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => token.length >= 2)
    .filter((token) => !STOPWORDS.has(token));
}

function uniq(values) {
  return [...new Set(values)];
}

function parseNumberLike(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isPositiveLogistics(logistics) {
  return (
    logistics &&
    parseNumberLike(logistics.weightGrams) > 0 &&
    parseNumberLike(logistics.heightCm) > 0 &&
    parseNumberLike(logistics.widthCm) > 0 &&
    parseNumberLike(logistics.depthCm) > 0
  );
}

function logisticsKey(logistics) {
  if (!isPositiveLogistics(logistics)) {
    return "";
  }

  return [
    logistics.weightGrams,
    logistics.heightCm,
    logistics.widthCm,
    logistics.depthCm,
  ].join("|");
}

function summarizeLogistics(rows) {
  const complete = [];
  const incomplete = [];

  for (const row of rows) {
    const hasWeight = parseNumberLike(row.weightKg) > 0;
    const hasHeight = parseNumberLike(row.heightCm) > 0;
    const hasWidth = parseNumberLike(row.widthCm) > 0;
    const hasDepth = parseNumberLike(row.depthCm) > 0;
    const hasDimensions = hasHeight && hasWidth && hasDepth;

    if (hasWeight && hasDimensions) {
      complete.push({
        weightGrams: Math.round(row.weightKg * 1000),
        heightCm: row.heightCm,
        widthCm: row.widthCm,
        depthCm: row.depthCm,
      });
    } else {
      incomplete.push({
        rowNumber: row.rowNumber,
        hasWeight,
        hasDimensions,
        weightKg: row.weightKg ?? null,
        heightCm: row.heightCm ?? null,
        widthCm: row.widthCm ?? null,
        depthCm: row.depthCm ?? null,
      });
    }
  }

  const uniqueCompleteLogistics = uniq(complete.map((item) => logisticsKey(item))).filter(Boolean);

  return {
    complete,
    incomplete,
    uniqueCompleteLogistics,
  };
}

function rowHasAnyLogisticsValue(row) {
  return [row.weightKg, row.heightCm, row.widthCm, row.depthCm].some(
    (value) => parseNumberLike(value) !== null,
  );
}

function groupRowsByProduct(rows) {
  const groups = new Map();

  for (const row of rows) {
    const slug = slugify(row.sourceProductUrlIdentifier);
    if (!groups.has(slug)) {
      groups.set(slug, []);
    }
    groups.get(slug).push(row);
  }

  return groups;
}

function groupRowsByVariant(rows) {
  const groups = new Map();

  for (const row of rows) {
    const signature = buildVariantSignature(row.variantAttributes).signature;
    if (!groups.has(signature)) {
      groups.set(signature, []);
    }
    groups.get(signature).push(row);
  }

  return groups;
}

function normalizeSanityVariantRecords(product) {
  const hasCanonicalVariants = Array.isArray(product.variants) && product.variants.length > 0;
  const sourceVariants = hasCanonicalVariants ? product.variants ?? [] : product.colorVariants ?? [];

  return sourceVariants.map((variant) => {
    const normalizedTitle = normalizeText(variant.title);
    const normalizedValue = normalizeText(variant.value);
    const sku = normalizeText(variant.sku);
    const attributes = hasCanonicalVariants
      ? (variant.attributes ?? []).map((attribute) => ({
          name: normalizeText(attribute.name),
          value: normalizeText(attribute.value),
        }))
      : [
          {
            name: "Color",
            value: normalizedValue || normalizedTitle,
          },
        ];

    return {
      _key: normalizeText(variant._key),
      title: normalizedTitle,
      value: normalizedValue,
      sku,
      logistics: variant.logistics ?? null,
      attributes,
      signature: hasCanonicalVariants
        ? buildVariantSignature(attributes).signature
        : `Color:${normalizeComparableText(normalizedValue || normalizedTitle)}`,
    };
  });
}

function buildSanityIndexes(products) {
  const bySlug = new Map();
  const byTitle = new Map();
  const bySku = new Map();

  for (const product of products) {
    const normalizedSlug = normalizeComparableText(product.slug);
    const normalizedTitle = normalizeComparableText(product.title);

    if (!bySlug.has(normalizedSlug)) {
      bySlug.set(normalizedSlug, []);
    }
    bySlug.get(normalizedSlug).push(product);

    if (!byTitle.has(normalizedTitle)) {
      byTitle.set(normalizedTitle, []);
    }
    byTitle.get(normalizedTitle).push(product);

    for (const variant of normalizeSanityVariantRecords(product)) {
      if (!variant.sku) {
        continue;
      }
      if (!bySku.has(variant.sku)) {
        bySku.set(variant.sku, []);
      }
      bySku.get(variant.sku).push({ product, variant });
    }
  }

  return { bySlug, byTitle, bySku };
}

function exactUnique(matches) {
  return matches.length === 1 ? matches[0] : null;
}

function scoreSimilarity(source, candidate) {
  const sourceTokens = new Set([...tokenize(source.title), ...tokenize(source.slug)]);
  const candidateTokens = new Set([...tokenize(candidate.title), ...tokenize(candidate.slug)]);

  const sharedTokens = [...sourceTokens].filter((token) => candidateTokens.has(token));
  const sourceCoverage = sourceTokens.size > 0 ? sharedTokens.length / sourceTokens.size : 0;
  const candidateCoverage = candidateTokens.size > 0 ? sharedTokens.length / candidateTokens.size : 0;
  const exactTitle = normalizeComparableText(source.title) === normalizeComparableText(candidate.title);
  const exactSlug = normalizeComparableText(source.slug) === normalizeComparableText(candidate.slug);
  const sourceSku = normalizeComparableText(source.sku);
  const candidateSkus = (candidate.skus ?? []).map((value) => normalizeComparableText(value)).filter(Boolean);
  const exactSku = Boolean(sourceSku) && candidateSkus.includes(sourceSku);
  const score = Math.max(sourceCoverage, candidateCoverage) + (exactTitle ? 0.5 : 0) + (exactSlug ? 0.5 : 0) + (exactSku ? 0.75 : 0);

  return {
    score,
    sharedTokens,
    exactTitle,
    exactSlug,
    exactSku,
  };
}

function buildTitleCandidateReason(source, candidate, similarity) {
  const reasons = [];

  if (similarity.exactTitle) {
    reasons.push("título exacto");
  }

  if (similarity.exactSlug) {
    reasons.push("slug exacto");
  }

  if (similarity.exactSku) {
    reasons.push("SKU exacto");
  }

  if (similarity.sharedTokens.length > 0) {
    reasons.push(`tokens compartidos: ${similarity.sharedTokens.join(", ")}`);
  }

  if (candidate.variantCount > 0) {
    reasons.push(`variantes actuales: ${candidate.variantCount}`);
  }

  return reasons.join(" | ") || "sin coincidencias relevantes";
}

function rankSanityCandidates(source, products) {
  const ranked = products
    .map((product) => {
      const variants = normalizeSanityVariantRecords(product);
      const candidate = {
        _id: product._id,
        title: normalizeText(product.title),
        slug: normalizeText(product.slug),
        skus: uniq(variants.map((variant) => variant.sku).filter(Boolean)),
        variantCount: variants.length,
      };
      const similarity = scoreSimilarity(source, candidate);

      return {
        ...candidate,
        similarity,
        reason: buildTitleCandidateReason(source, candidate, similarity),
      };
    })
    .sort((left, right) => right.similarity.score - left.similarity.score);

  return ranked.slice(0, 5);
}

function classifyMatch(candidates) {
  const best = candidates[0] ?? null;

  if (!best) {
    return {
      classification: "NO_MATCH",
      reason: "Sin candidatos relevantes.",
    };
  }

  if (best.similarity.exactSku || best.similarity.exactSlug || best.similarity.exactTitle) {
    return {
      classification: "MATCH_CONFIRMED",
      reason: best.reason,
    };
  }

  if (best.similarity.score >= 0.55) {
    return {
      classification: "LIKELY_MATCH_REVIEW",
      reason: best.reason,
    };
  }

  return {
    classification: "NO_MATCH",
    reason: "La similitud no alcanza un umbral seguro.",
  };
}

function buildRowEvidence(row) {
  const signature = buildVariantSignature(row.variantAttributes);

  return {
    rowNumber: row.rowNumber,
    sourceProductUrlIdentifier: normalizeText(row.sourceProductUrlIdentifier),
    sourceProductName: normalizeText(row.sourceProductName),
    sku: normalizeText(row.sourceSku) || null,
    variantSignature: signature.signature,
    variantLabel: signature.label,
    variantValue: signature.value,
    weightKg: parseNumberLike(row.weightKg),
    heightCm: parseNumberLike(row.heightCm),
    widthCm: parseNumberLike(row.widthCm),
    depthCm: parseNumberLike(row.depthCm),
    stock: parseNumberLike(row.stock),
    barcode: normalizeText(row.barcode) || null,
    tags: normalizeText(row.tags) || null,
    variantAttributes: row.variantAttributes.map((attribute) => ({
      name: normalizeText(attribute.name),
      value: normalizeText(attribute.value),
    })),
  };
}

function analyzeProductRows(rows) {
  const groupedVariants = [...groupRowsByVariant(rows).entries()].map(([signature, variantRows]) => {
    const summary = summarizeLogistics(variantRows);
    return {
      signature,
      rowNumbers: variantRows.map((row) => row.rowNumber),
      rows: variantRows.map(buildRowEvidence),
      summary,
      uniqueLogistics: summary.uniqueCompleteLogistics,
    };
  });

  const summary = summarizeLogistics(rows);
  const distinctCompleteLogistics = summary.uniqueCompleteLogistics;
  const hasAnyComplete = summary.complete.length > 0;
  const hasAnyIncomplete = summary.incomplete.length > 0;
  const hasAnyLogisticsValue = rows.some(rowHasAnyLogisticsValue);
  const allCompleteRowsShareSameLogistics = distinctCompleteLogistics.length === 1;
  const distinctVariantLogistics = uniq(groupedVariants.flatMap((group) => group.uniqueLogistics));

  let classification = "NO_USABLE_DATA";
  let actionRecommended = "Carga manual";
  let confidence = "LOW";
  let reason = "No hay datos logísticos numéricos reutilizables en el CSV.";

  if (!hasAnyComplete && hasAnyIncomplete && hasAnyLogisticsValue) {
    classification = "PARTIAL_DATA";
    actionRecommended = "Revisión manual";
    confidence = "LOW";
    reason = "Hay datos logísticos parciales, pero no una base completa suficiente para backfill.";
  }

  if (hasAnyComplete && allCompleteRowsShareSameLogistics && hasAnyIncomplete) {
    classification = "RECOVERABLE_PRODUCT_LOGISTICS";
    actionRecommended = "Backfill producto";
    confidence = "HIGH";
    reason = "Todas las filas completas coinciden y las incompletas pueden tomar la misma logística base.";
  }

  if (hasAnyComplete && allCompleteRowsShareSameLogistics && !hasAnyIncomplete) {
    classification = "RECOVERABLE_PRODUCT_LOGISTICS";
    actionRecommended = "Backfill producto";
    confidence = "HIGH";
    reason = "Toda la logística histórica del producto es uniforme.";
  }

  if (groupedVariants.length > 1 && distinctVariantLogistics.length > 1) {
    classification = "CONTRADICTORY_DATA";
    actionRecommended = "Revisión manual";
    confidence = "MEDIUM";
    reason = "Existen varias logísticas distintas entre variantes o filas del mismo producto.";
  }

  if (groupedVariants.length > 1 && groupedVariants.every((group) => group.summary.complete.length > 0)) {
    classification = "RECOVERABLE_VARIANT_LOGISTICS";
    actionRecommended = "Backfill variantes";
    confidence = distinctVariantLogistics.length > 1 ? "MEDIUM" : "HIGH";
    reason = "Las variantes tienen logística completa y pueden resolverse como overrides separados.";
  }

  if (!hasAnyComplete && !hasAnyLogisticsValue) {
    classification = "NO_USABLE_DATA";
    actionRecommended = "Carga manual";
    confidence = "LOW";
    reason = "No existe ningún dato logístico numérico en el CSV para este producto.";
  }

  return {
    classification,
    actionRecommended,
    confidence,
    reason,
    summary: {
      rows: rows.length,
      completeRows: summary.complete.length,
      incompleteRows: summary.incomplete.length,
      distinctCompleteLogistics: distinctCompleteLogistics.length,
      groupedVariants: groupedVariants.length,
    },
    rows: rows.map(buildRowEvidence),
    groupedVariants: groupedVariants.map((group) => ({
      signature: group.signature,
      rowNumbers: group.rowNumbers,
      classification:
        group.summary.complete.length > 0 && group.summary.incomplete.length === 0
          ? "complete"
          : group.summary.complete.length > 0
            ? "partial"
            : "empty",
      reason:
        group.summary.complete.length > 0 && group.summary.incomplete.length === 0
          ? "La variante tiene logística completa."
          : group.summary.complete.length > 0
            ? "La variante combina filas completas con filas parciales."
            : "La variante no tiene logística completa.",
      logistics: group.summary.complete[0] ?? null,
      rows: group.rows,
    })),
    distinctCompleteLogistics,
  };
}

function buildText(report) {
  const lines = [];
  lines.push("Blocked logistics review");
  lines.push(`Generated at: ${report.generatedAt}`);
  lines.push(`CSV source: ${report.sourceFile}`);
  lines.push("");
  lines.push(`Resolved with certainty from the 6 NOT_FOUND: ${report.summary.resolvedNotFound}`);
  lines.push(`Still no match: ${report.summary.stillNoMatch}`);
  lines.push(`INVALID_LOGISTICS recoverable: ${report.summary.invalidRecoverable}`);
  lines.push(`Manual intervention required: ${report.summary.manualRequired}`);
  lines.push(`New potentially backfillable total: ${report.summary.newPotentiallyBackfillable}`);
  lines.push(`New percentage over 479 products: ${report.summary.newPotentialPercent}%`);
  lines.push("");
  for (const item of report.items) {
    lines.push(`[${item.previousState}] ${item.slug}`);
    lines.push(`  title: ${item.csv.title || "—"}`);
    lines.push(`  classification: ${item.newClassification}`);
    lines.push(`  action: ${item.actionRecommended}`);
    lines.push(`  confidence: ${item.confidence}`);
    lines.push(`  reason: ${item.reason}`);
    lines.push("");
  }
  return lines.join("\n");
}

async function fetchSanityProducts(client) {
  const query = `
    *[_type == "product"]{
      _id,
      title,
      "slug": slug.current,
      basePrice,
      stock,
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
        stock,
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
      "Missing Sanity configuration. Set NEXT_PUBLIC_SANITY_PROJECT_ID and NEXT_PUBLIC_SANITY_DATASET.",
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

  const dryRunReport = JSON.parse(await readFile(DRY_RUN_REPORT_PATH, "utf8"));
  const blockedItems = dryRunReport.candidates.filter((item) => item.state !== "SAFE_TO_BACKFILL");

  const buffer = await readFile(CSV_PATH);
  const csvText = decodeWindows1252(buffer);
  const parsed = parseCsvRows(csvText);
  const rawRowsBySlug = groupRowsByProduct(parsed.rows);

  const sanityProducts = await fetchSanityProducts(client);
  const indexes = buildSanityIndexes(sanityProducts);

  const items = [];
  let resolvedNotFound = 0;
  let stillNoMatch = 0;
  let invalidRecoverable = 0;
  let manualRequired = 0;
  let potentialBackfillable = dryRunReport.summary.autoRecoverableProducts;

  for (const blocked of blockedItems) {
    const slug = blocked.slug;
    const csvRows = rawRowsBySlug.get(slug) ?? [];
    const csvEvidence = {
      slug,
      title: normalizeText(csvRows.find((row) => normalizeText(row.sourceProductName))?.sourceProductName ?? ""),
      sourceIdentifier: normalizeText(csvRows[0]?.sourceProductUrlIdentifier ?? slug),
      sku: uniq(csvRows.map((row) => normalizeText(row.sourceSku)).filter(Boolean)),
      rowCount: csvRows.length,
      rows: csvRows.map(buildRowEvidence),
    };

    const exactSlugMatches = exactUnique(indexes.bySlug.get(normalizeComparableText(slug)) ?? []);
    const titleCandidates = rankSanityCandidates(
      {
        title: csvEvidence.title || slug,
        slug,
        sku: csvEvidence.sku[0] ?? "",
      },
      sanityProducts,
    );
    const titleClassification = classifyMatch(titleCandidates);

    const sanityExact = exactSlugMatches
      ? {
          _id: exactSlugMatches._id,
          title: normalizeText(exactSlugMatches.title),
          slug: normalizeText(exactSlugMatches.slug),
          sku: uniq(normalizeSanityVariantRecords(exactSlugMatches).map((variant) => variant.sku).filter(Boolean)),
          logistics: exactSlugMatches.logistics ?? null,
          variantCount: normalizeSanityVariantRecords(exactSlugMatches).length,
        }
      : null;

    const sourceRows = csvRows;
    const logisticsAnalysis = analyzeProductRows(sourceRows);

    let newClassification = blocked.state;
    let actionRecommended = blocked.state === "NOT_FOUND" ? "Revisión manual" : "Revisión manual";
    let confidence = "LOW";
    let reason = blocked.reason;
    let candidate = null;

    if (blocked.state === "NOT_FOUND") {
      if (sanityExact) {
        newClassification = "MATCH_CONFIRMED";
        actionRecommended = "Revisar y decidir manualmente";
        confidence = "HIGH";
        reason = "El slug exacto existe en Sanity, pero la revisión histórica detectó el caso como no encontrado por el importador.";
        resolvedNotFound += 1;
        potentialBackfillable += 1;
      } else if (titleClassification.classification === "MATCH_CONFIRMED") {
        newClassification = "MATCH_CONFIRMED";
        actionRecommended = "Revisar y decidir manualmente";
        confidence = "HIGH";
        reason = `Coincidencia fuerte por ${titleClassification.reason}.`;
        resolvedNotFound += 1;
        potentialBackfillable += 1;
      } else if (titleClassification.classification === "LIKELY_MATCH_REVIEW") {
        newClassification = "LIKELY_MATCH_REVIEW";
        actionRecommended = "Revisión manual";
        confidence = "MEDIUM";
        reason = `Candidato probable: ${titleClassification.reason}.`;
        stillNoMatch += 1;
        manualRequired += 1;
      } else {
        newClassification = "NO_MATCH";
        actionRecommended = "Revisión manual";
        confidence = "LOW";
        reason = "No apareció ningún candidato confiable en Sanity.";
        stillNoMatch += 1;
        manualRequired += 1;
      }

      candidate = {
        exactSanitySlugMatch: sanityExact,
        topCandidates: titleCandidates,
      };
    } else {
      const analysisClassification = logisticsAnalysis.classification;
      newClassification = analysisClassification;
      actionRecommended = logisticsAnalysis.actionRecommended;
      confidence = logisticsAnalysis.confidence;
      reason = logisticsAnalysis.reason;

      if (analysisClassification === "RECOVERABLE_PRODUCT_LOGISTICS" || analysisClassification === "RECOVERABLE_VARIANT_LOGISTICS") {
        invalidRecoverable += 1;
        potentialBackfillable += 1;
      } else {
        manualRequired += 1;
      }

      candidate = {
        exactSanitySlugMatch: sanityExact,
        topCandidates: titleCandidates,
      };
    }

    items.push({
      slug,
      previousState: blocked.state,
      originalReason: blocked.reason,
      csv: csvEvidence,
      candidate,
      logisticsAnalysis,
      newClassification,
      actionRecommended,
      confidence,
      reason,
    });
  }

  const summary = {
    blockedCases: blockedItems.length,
    resolvedNotFound,
    stillNoMatch,
    invalidRecoverable,
    manualRequired,
    newPotentiallyBackfillable: potentialBackfillable,
    newPotentialPercent: Number(((potentialBackfillable / 479) * 100).toFixed(2)),
  };

  const report = {
    generatedAt: new Date().toISOString(),
    sourceFile: CSV_PATH,
    dryRunReportPath: DRY_RUN_REPORT_PATH,
    summary,
    items,
  };

  await mkdir(path.dirname(REVIEW_JSON_PATH), { recursive: true });
  await writeFile(REVIEW_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(REVIEW_TEXT_PATH, `${buildText(report)}\n`, "utf8");

  console.log(buildText(report));
  console.log("");
  console.log(`JSON report written to: ${REVIEW_JSON_PATH}`);
  console.log(`Text report written to: ${REVIEW_TEXT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
