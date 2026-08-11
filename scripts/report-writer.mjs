import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const DEFAULT_DRY_RUN_REPORT_DIR = path.join(process.cwd(), "reports");
export const DEFAULT_DRY_RUN_JSON_REPORT_PATH = path.join(
  DEFAULT_DRY_RUN_REPORT_DIR,
  "tiendanube-import-dry-run.json",
);
export const DEFAULT_DRY_RUN_TEXT_REPORT_PATH = path.join(
  DEFAULT_DRY_RUN_REPORT_DIR,
  "tiendanube-import-dry-run.txt",
);
export const DEFAULT_WRITE_REPORT_DIR = DEFAULT_DRY_RUN_REPORT_DIR;

function pad(value) {
  return String(value).padStart(2, "0");
}

function formatTimestampForFilename(timestamp) {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "-",
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("");
}

export function buildWriteReportPath(timestamp) {
  return path.join(
    DEFAULT_WRITE_REPORT_DIR,
    `tiendanube-import-write-${formatTimestampForFilename(timestamp)}.json`,
  );
}

const CATEGORY_ROUTE_FIELDS = [
  "slug",
  "raw",
  "depth",
  "status",
  "reusableCount",
  "plannedCreateCount",
  "conflictCount",
  "invalidCount",
  "missingNodes",
  "conflictReason",
];

const PRODUCT_FIELDS = [
  "sourceId",
  "slug",
  "title",
  "primaryCategoryPath",
  "secondaryCategoryPaths",
  "basePrice",
  "stock",
  "simpleProduct",
  "variants",
  "shortDescription",
  "seo",
  "action",
  "warnings",
];

const BLOCKED_FIELDS = [
  "sourceId",
  "slug",
  "title",
  "rowNumbers",
  "reason",
  "reasons",
  "warnings",
  "availableData",
];

const MANAGED_DIFF_FIELDS = [
  "title",
  "shortDescription",
  "descriptionText",
  "basePrice",
  "stock",
  "isActive",
  "seoTitle",
  "seoDescription",
  "categorySlug",
  "subcategorySlug",
  "variants",
];

function normalizeMaybePath(value) {
  return value ? String(value) : null;
}

function sortByStableKey(items, getKey) {
  return [...items].sort((left, right) => {
    const leftKey = getKey(left);
    const rightKey = getKey(right);

    if (leftKey < rightKey) {
      return -1;
    }

    if (leftKey > rightKey) {
      return 1;
    }

    return 0;
  });
}

function normalizeCategoryRouteStat(stat) {
  return CATEGORY_ROUTE_FIELDS.reduce((accumulator, field) => {
    if (field === "missingNodes") {
      accumulator.missingNodes = (stat.missingNodes ?? []).map((node) => ({
        depth: node.depth,
        slug: node.slug,
        title: node.title,
      }));
      return accumulator;
    }

    accumulator[field] = stat[field] ?? null;
    return accumulator;
  }, {});
}

function serializeCategoryResolution(resolution) {
  if (!resolution) {
    return null;
  }

  return {
    raw: resolution.raw,
    slug: resolution.slug,
    depth: resolution.depth,
    status: resolution.status,
    categorySlug: resolution.categorySlug ?? null,
    subcategorySlug: resolution.subcategorySlug ?? null,
    resolvedNodeId: resolution.resolvedNodeId ?? null,
    reusableNodes: (resolution.reusableNodes ?? []).map((node) => ({
      id: node.id,
      slug: node.slug,
      title: node.title,
      depth: node.depth ?? null,
    })),
    missingNodes: (resolution.missingNodes ?? []).map((node) => ({
      depth: node.depth,
      slug: node.slug,
      title: node.title,
    })),
    conflictReason: resolution.conflictReason ?? null,
  };
}

function sortPlannedCreateNodes(nodes) {
  return sortByStableKey(nodes, (node) => {
    const parent = normalizeMaybePath(node.parentPath) ?? "";
    return `${String(node.depth).padStart(2, "0")}|${parent}|${node.slug}`;
  });
}

function derivePlannedCreateNodes(products) {
  const nodes = new Map();

  for (const product of products) {
    for (const resolution of product.categoryResolutions ?? []) {
      if (resolution?.status !== "planned-create") {
        continue;
      }

      const slugSegments = resolution.slugSegments ?? [];
      const titleSegments = resolution.segments ?? [];
      const missingNodes = resolution.missingNodes ?? [];

      for (const missingNode of missingNodes) {
        const pathSegments = slugSegments.slice(0, missingNode.depth);
        const nodePath = pathSegments.join("/");
        const parentPath = missingNode.depth > 1 ? pathSegments.slice(0, -1).join("/") : null;

        if (!nodePath || nodes.has(nodePath)) {
          continue;
        }

        nodes.set(nodePath, {
          type: missingNode.depth === 1 ? "category" : "subcategory",
          title: titleSegments[missingNode.depth - 1] ?? missingNode.title ?? missingNode.slug,
          slug: missingNode.slug,
          parentPath,
          depth: missingNode.depth,
        });
      }
    }
  }

  return sortPlannedCreateNodes([...nodes.values()]);
}

function serializeManagedDiff(diff) {
  const output = {};

  for (const field of MANAGED_DIFF_FIELDS) {
    if (!diff || !(field in diff)) {
      continue;
    }

    output[field] = {
      old: diff[field]?.old ?? null,
      new: diff[field]?.new ?? null,
    };
  }

  return output;
}

function serializeProductForReport(product, action) {
  const base = {
    sourceId: product.sourceId,
    slug: product.slug,
    title: product.title || null,
    primaryCategoryPath: serializeCategoryResolution(product.primaryCategoryPath),
    secondaryCategoryPaths: (product.secondaryCategoryPaths ?? []).map((resolution) =>
      serializeCategoryResolution(resolution),
    ),
    basePrice: typeof product.basePrice === "number" ? product.basePrice : null,
    stock: typeof product.stock === "number" ? product.stock : null,
    simpleProduct: Boolean(product.simpleProduct),
    variants: (product.variants ?? []).map((variant) => ({
      value: variant.value,
      label: variant.label,
      attributes: (variant.attributes ?? []).map((attribute) => ({
        name: attribute.name,
        value: attribute.value,
      })),
      stock: typeof variant.stock === "number" ? variant.stock : null,
      basePrice: typeof variant.basePrice === "number" ? variant.basePrice : null,
      sku: normalizeMaybePath(variant.sku),
      isActive: variant.isActive !== false,
      images: Array.isArray(variant.images) ? variant.images : [],
    })),
    shortDescription: normalizeMaybePath(product.shortDescription),
    seo: {
      title: normalizeMaybePath(product.seoTitle),
      description: normalizeMaybePath(product.seoDescription),
    },
    action,
    warnings: [...(product.comparisonWarnings ?? []), ...(product.warnings ?? [])],
  };

  return PRODUCT_FIELDS.reduce((accumulator, field) => {
    accumulator[field] = base[field];
    return accumulator;
  }, {});
}

function serializeBlockedProduct(product) {
  const availableData = {
    title: normalizeMaybePath(product.title),
    basePrice: typeof product.basePrice === "number" ? product.basePrice : null,
    stock: typeof product.stock === "number" ? product.stock : null,
    simpleProduct: Boolean(product.simpleProduct),
    variants: (product.variants ?? []).length,
    categoryPaths: (product.categoryPaths ?? []).map((categoryPath) => ({
      raw: categoryPath.raw,
      slug: categoryPath.slug,
      depth: categoryPath.depth,
    })),
    seo: {
      title: normalizeMaybePath(product.seoTitle),
      description: normalizeMaybePath(product.seoDescription),
    },
  };

  return BLOCKED_FIELDS.reduce((accumulator, field) => {
    if (field === "reason") {
      accumulator.reason = (product.reasons ?? [])[0] ?? null;
      return accumulator;
    }

    if (field === "reasons") {
      accumulator.reasons = [...(product.reasons ?? [])];
      return accumulator;
    }

    if (field === "warnings") {
      accumulator.warnings = [...(product.comparisonWarnings ?? []), ...(product.warnings ?? [])];
      return accumulator;
    }

    if (field === "availableData") {
      accumulator.availableData = availableData;
      return accumulator;
    }

    accumulator[field] = product[field] ?? null;
    return accumulator;
  }, {});
}

function buildTextSection(title, items, itemFormatter) {
  const lines = [`${title}: ${items.length}`];

  for (const item of items) {
    lines.push(`- ${itemFormatter(item)}`);
  }

  return lines;
}

function formatBlockedSummary(product) {
  return `${product.slug} | ${(product.reasons ?? [])[0] ?? "blocked"}`;
}

function formatUpdateSummary(product) {
  const diffFields = Object.keys(product.managedDiff ?? {});
  return `${product.slug} | diff=${diffFields.length ? diffFields.join(", ") : "none"}`;
}

function formatPlannedCreateNode(node) {
  return `${node.depth}. ${node.type} ${node.slug}${node.parentPath ? ` <= ${node.parentPath}` : ""}`;
}

function formatImportReportText(reportArtifact) {
  const lines = [];

  lines.push("Tiendanube import dry-run");
  lines.push(`Generated at: ${reportArtifact.timestamp}`);
  lines.push(`Source file: ${reportArtifact.sourceFile}`);
  lines.push("");
  lines.push("Summary");
  lines.push(`- Rows: ${reportArtifact.summary.totalRows}`);
  lines.push(`- Products: ${reportArtifact.summary.uniqueProducts}`);
  lines.push(`- Create: ${reportArtifact.summary.create}`);
  lines.push(`- Update: ${reportArtifact.summary.update}`);
  lines.push(`- Blocked: ${reportArtifact.summary.blocked}`);
  lines.push(`- Skip: ${reportArtifact.summary.skip}`);
  lines.push(`- Categories reusable: ${reportArtifact.categories.counts.reusable}`);
  lines.push(`- Categories planned-create: ${reportArtifact.categories.counts.plannedCreate}`);
  lines.push(`- Sanity writes: ${reportArtifact.sanityWrites}`);
  lines.push("");

  lines.push(...buildTextSection("Blocked", reportArtifact.products.blocked, formatBlockedSummary));
  lines.push("");
  lines.push(...buildTextSection("Updates", reportArtifact.products.update, formatUpdateSummary));
  lines.push("");
  lines.push(
    ...buildTextSection(
      "Planned create categories",
      reportArtifact.categories.plannedCreateNodes,
      formatPlannedCreateNode,
    ),
  );
  lines.push("");
  lines.push(`Warnings: ${reportArtifact.warnings.length}`);
  lines.push(`Errors: ${reportArtifact.errors.length}`);

  return `${lines.join("\n")}\n`;
}

function normalizeChangedFields(fields) {
  return [...new Set((fields ?? []).map((field) => normalizeMaybePath(field)).filter(Boolean))];
}

function serializeWriteProductResult(product) {
  return {
    slug: product.slug,
    action: product.action,
    plannedAction: product.plannedAction ?? null,
    documentId: normalizeMaybePath(product.documentId),
    changedFields: normalizeChangedFields(product.changedFields),
    managedDiff: product.managedDiff ? serializeManagedDiff(product.managedDiff) : null,
    errors: [...(product.errors ?? [])],
    timestamp: normalizeMaybePath(product.timestamp),
    placeholderImageApplied: Boolean(product.placeholderImageApplied),
  };
}

function serializeWriteCategoryResult(category) {
  return {
    path: normalizeMaybePath(category.path),
    type: normalizeMaybePath(category.type),
    title: normalizeMaybePath(category.title),
    parentPath: normalizeMaybePath(category.parentPath),
    parentId: normalizeMaybePath(category.parentId),
    documentId: normalizeMaybePath(category.documentId),
    status: normalizeMaybePath(category.status),
    error: normalizeMaybePath(category.error),
    timestamp: normalizeMaybePath(category.timestamp),
  };
}

export async function writeImportDryRunReports(report) {
  const reportArtifact = {
    timestamp: new Date().toISOString(),
    sourceFile: report.sourceFile,
    headers: [...(report.headers ?? [])],
    summary: { ...report.summary },
    categories: {
      counts: {
        reusable: report.categories.reusable.length,
        plannedCreate: report.categories.plannedCreate.length,
        conflict: report.categories.conflict.length,
        invalid: report.categories.invalid.length,
      },
      reusable: sortByStableKey(report.categories.reusable, (item) => `${item.depth}|${item.slug}` ).map(
        normalizeCategoryRouteStat,
      ),
      plannedCreate: sortByStableKey(report.categories.plannedCreate, (item) => `${item.depth}|${item.slug}` ).map(
        normalizeCategoryRouteStat,
      ),
      conflict: sortByStableKey(report.categories.conflict, (item) => `${item.depth}|${item.slug}` ).map(
        normalizeCategoryRouteStat,
      ),
      invalid: sortByStableKey(report.categories.invalid, (item) => `${item.depth}|${item.slug}` ).map(
        normalizeCategoryRouteStat,
      ),
      plannedCreateNodes: derivePlannedCreateNodes(report.products),
    },
    products: {
      create: sortByStableKey(
        report.products.filter((product) => product.classification === "create"),
        (item) => `${item.slug}|${item.sourceId}`,
      ).map((product) => serializeProductForReport(product, "create")),
      update: sortByStableKey(
        report.products.filter((product) => product.classification === "update"),
        (item) => `${item.slug}|${item.sourceId}`,
      ).map((product) => ({
        ...serializeProductForReport(product, "update"),
        managedDiff: serializeManagedDiff(product.managedDiff),
      })),
      blocked: sortByStableKey(
        report.products.filter((product) => product.classification === "blocked"),
        (item) => `${item.slug}|${item.sourceId}`,
      ).map((product) => serializeBlockedProduct(product)),
      skip: sortByStableKey(
        report.products.filter((product) => product.classification === "skip"),
        (item) => `${item.slug}|${item.sourceId}`,
      ).map((product) => ({
        ...serializeProductForReport(product, "skip"),
        managedDiff: serializeManagedDiff(product.managedDiff),
      })),
    },
    warnings: [...(report.warnings ?? [])],
    errors: [...(report.errors ?? [])],
    sanityWrites: 0,
  };

  await mkdir(DEFAULT_DRY_RUN_REPORT_DIR, { recursive: true });
  await writeFile(
    DEFAULT_DRY_RUN_JSON_REPORT_PATH,
    `${JSON.stringify(reportArtifact, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    DEFAULT_DRY_RUN_TEXT_REPORT_PATH,
    formatImportReportText(reportArtifact),
    "utf8",
  );

  return reportArtifact;
}

export async function writeImportExecutionReport(report) {
  const timestamp = new Date();
  const reportArtifact = {
    timestamp: timestamp.toISOString(),
    reportType: "write",
    sourceFile: report.sourceFile ?? null,
    selection: {
      mode: report.selection?.mode ?? null,
      limit: report.selection?.limit ?? null,
      requestedSlugs: [...(report.selection?.requestedSlugs ?? [])],
      selectedSlugs: [...(report.selection?.selectedSlugs ?? [])],
      missingSlugs: [...(report.selection?.missingSlugs ?? [])],
      blockedSelected: [...(report.selection?.blockedSelected ?? [])],
      skippedSelected: [...(report.selection?.skippedSelected ?? [])],
    },
    summary: {
      productsProcessed: report.productsProcessed ?? 0,
      productsRemaining: report.productsRemaining ?? 0,
      categoriesCreated: report.categoriesCreated ?? 0,
      productsCreated: report.productsCreated ?? 0,
      productsUpdated: report.productsUpdated ?? 0,
      placeholderImagesPatched: report.placeholderImagesPatched ?? 0,
      writesPerformed: report.writesPerformed ?? 0,
      errors: Array.isArray(report.errors) ? report.errors.length : 0,
    },
    categories: {
      created: sortByStableKey(report.categoriesCreatedItems ?? [], (item) => `${item.path}|${item.documentId}` ).map(
        serializeWriteCategoryResult,
      ),
      errors: [...(report.categoryErrors ?? [])],
    },
    products: sortByStableKey(report.productResults ?? [], (item) => `${item.slug}|${item.documentId ?? ""}`).map(
      serializeWriteProductResult,
    ),
    warnings: [...(report.warnings ?? [])],
    errors: [...(report.errors ?? [])],
    placeholderImageAssetRef: normalizeMaybePath(report.placeholderImageAssetRef),
    sanityWrites: report.writesPerformed ?? 0,
  };

  await mkdir(DEFAULT_WRITE_REPORT_DIR, { recursive: true });
  const reportPath = buildWriteReportPath(timestamp);
  await writeFile(reportPath, `${JSON.stringify(reportArtifact, null, 2)}\n`, "utf8");

  return {
    reportPath,
    reportArtifact,
  };
}
