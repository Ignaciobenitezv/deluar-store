import dotenv from "dotenv";
import { createClient } from "@sanity/client";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT_DIR = process.cwd();
const DRY_RUN_REPORT_PATH = path.join(ROOT_DIR, "reports", "logistics-backfill-dry-run.json");
const REPORT_DIR = path.join(ROOT_DIR, "reports", "logistics-backfill-runs");

const PRODUCT_FIELDS = `
  _id,
  title,
  "slug": slug.current,
  logistics{
    weightGrams,
    heightCm,
    widthCm,
    depthCm
  }
`;

function loadEnvFiles() {
  dotenv.config({ path: path.join(ROOT_DIR, ".env.example"), override: false });
  dotenv.config({ path: path.join(ROOT_DIR, ".env.local"), override: false });
  dotenv.config({ path: path.join(ROOT_DIR, ".env.production.local"), override: false });
}

function parseArgs(argv) {
  const options = {
    dryRun: true,
    write: false,
    limit: null,
    productId: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === "--write") {
      options.write = true;
      options.dryRun = false;
      continue;
    }

    if (value === "--dry-run") {
      options.dryRun = true;
      options.write = false;
      continue;
    }

    if (value.startsWith("--limit=")) {
      const limitValue = Number(value.slice("--limit=".length));
      if (Number.isFinite(limitValue) && limitValue > 0) {
        options.limit = Math.floor(limitValue);
      }
      continue;
    }

    if (value === "--limit") {
      const nextValue = Number(argv[index + 1]);
      if (Number.isFinite(nextValue) && nextValue > 0) {
        options.limit = Math.floor(nextValue);
        index += 1;
      }
      continue;
    }

    if (value.startsWith("--product-id=")) {
      options.productId = value.slice("--product-id=".length).trim() || null;
      continue;
    }

    if (value === "--product-id") {
      const nextValue = String(argv[index + 1] ?? "").trim();
      if (nextValue) {
        options.productId = nextValue;
        index += 1;
      }
    }
  }

  return options;
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

function isPositiveNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isCompleteLogistics(logistics) {
  return (
    Boolean(logistics) &&
    isPositiveNumber(logistics.weightGrams) &&
    isPositiveNumber(logistics.heightCm) &&
    isPositiveNumber(logistics.widthCm) &&
    isPositiveNumber(logistics.depthCm)
  );
}

function hasAnyLogisticsValue(logistics) {
  if (!logistics || typeof logistics !== "object") {
    return false;
  }

  return ["weightGrams", "heightCm", "widthCm", "depthCm"].some((field) =>
    isPositiveNumber(logistics[field]),
  );
}

function cloneLogistics(logistics) {
  if (!logistics) {
    return null;
  }

  return {
    weightGrams: logistics.weightGrams ?? null,
    heightCm: logistics.heightCm ?? null,
    widthCm: logistics.widthCm ?? null,
    depthCm: logistics.depthCm ?? null,
  };
}

function buildRunId(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function buildReportPaths(runId) {
  return {
    json: path.join(REPORT_DIR, `logistics-backfill-run-${runId}.json`),
    text: path.join(REPORT_DIR, `logistics-backfill-run-${runId}.txt`),
  };
}

async function readDryRunReport() {
  const raw = await readFile(DRY_RUN_REPORT_PATH, "utf8");
  return JSON.parse(raw);
}

function buildSanityClient() {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_PROJECT_ID || "";
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || process.env.SANITY_DATASET || "";
  const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2026-04-01";
  const readToken = process.env.SANITY_READ_TOKEN || "";
  const writeToken = process.env.SANITY_WRITE_TOKEN || "";

  if (!projectId || !dataset) {
    throw new Error(
      "Missing Sanity config. Set NEXT_PUBLIC_SANITY_PROJECT_ID and NEXT_PUBLIC_SANITY_DATASET.",
    );
  }

  return createClient({
    projectId,
    dataset,
    apiVersion,
    useCdn: !readToken,
    token: writeToken || readToken || undefined,
    perspective: "published",
  });
}

async function fetchProductsByIds(client, ids) {
  if (ids.length === 0) {
    return [];
  }

  const query = `
    *[_type == "product" && _id in $ids]{
      ${PRODUCT_FIELDS}
    }
  `;

  return client.fetch(query, { ids });
}

async function fetchProductsBySlugs(client, slugs) {
  if (slugs.length === 0) {
    return [];
  }

  const query = `
    *[_type == "product" && slug.current in $slugs]{
      ${PRODUCT_FIELDS}
    }
  `;

  return client.fetch(query, { slugs });
}

async function fetchProductById(client, id) {
  const query = `
    *[_type == "product" && _id == $id][0]{
      ${PRODUCT_FIELDS}
    }
  `;

  return client.fetch(query, { id });
}

async function fetchProductsByExactSlug(client, slug) {
  const query = `
    *[_type == "product" && slug.current == $slug]{
      ${PRODUCT_FIELDS}
    }
  `;

  return client.fetch(query, { slug });
}

function indexProductsById(products) {
  const map = new Map();

  for (const product of products) {
    map.set(product._id, product);
  }

  return map;
}

function indexProductsBySlug(products) {
  const map = new Map();

  for (const product of products) {
    const normalizedSlug = normalizeComparableText(product.slug);

    if (!map.has(normalizedSlug)) {
      map.set(normalizedSlug, []);
    }

    map.get(normalizedSlug).push(product);
  }

  return map;
}

function selectCandidates(dryRunReport, options) {
  const allCandidates = Array.isArray(dryRunReport.candidates) ? dryRunReport.candidates : [];
  const blockedCandidates = allCandidates.filter(
    (candidate) => candidate.state !== "SAFE_TO_BACKFILL" || candidate.destination !== "product.logistics",
  );
  const safeCandidates = allCandidates.filter(
    (candidate) => candidate.state === "SAFE_TO_BACKFILL" && candidate.destination === "product.logistics",
  );

  let selectedSafeCandidates = safeCandidates;

  if (options.productId) {
    selectedSafeCandidates = selectedSafeCandidates.filter(
      (candidate) => candidate.productId === options.productId || candidate.slug === options.productId,
    );
  }

  if (options.limit != null) {
    selectedSafeCandidates = selectedSafeCandidates.slice(0, options.limit);
  }

  return {
    allCandidates,
    blockedCandidates,
    safeCandidates,
    selectedSafeCandidates,
  };
}

function createBaseRecord({ mode, candidate, currentLogistics, proposedLogistics }) {
  return {
    timestamp: new Date().toISOString(),
    mode,
    product: normalizeText(candidate.title),
    title: normalizeText(candidate.title),
    slug: candidate.slug,
    productId: candidate.productId,
    previousLogistics: cloneLogistics(currentLogistics),
    proposedLogistics: cloneLogistics(proposedLogistics),
    result: null,
    reason: null,
    mutationId: null,
    revision: null,
  };
}

function buildTextReport(report) {
  const lines = [];

  lines.push("Logistics backfill execution");
  lines.push(`Generated at: ${report.generatedAt}`);
  lines.push(`Mode: ${report.mode}`);
  lines.push(`Dry-run source: ${report.sourceReportPath}`);
  lines.push("");
  lines.push("Summary");
  lines.push(`- Total source candidates: ${report.summary.totalSourceCandidates}`);
  lines.push(`- Safe candidates available: ${report.summary.safeCandidatesAvailable}`);
  lines.push(`- Blocked candidates excluded: ${report.summary.blockedCandidatesExcluded}`);
  lines.push(`- Evaluated candidates: ${report.summary.evaluatedCandidates}`);
  lines.push(`- WOULD_WRITE: ${report.summary.wouldWrite}`);
  lines.push(`- WRITTEN: ${report.summary.written}`);
  lines.push(`- SKIP_ALREADY_HAS_LOGISTICS: ${report.summary.skipAlreadyHasLogistics}`);
  lines.push(`- SKIP_NOT_SAFE: ${report.summary.skipNotSafe}`);
  lines.push(`- SKIP_BLOCKED: ${report.summary.skipBlocked}`);
  lines.push(`- ERROR: ${report.summary.error}`);
  lines.push("");
  lines.push(`Candidatos listos para backfill: ${report.summary.wouldWrite}`);
  lines.push(`Sanity mutations realizadas en esta tarea: ${report.summary.written}`);
  lines.push(`Es seguro hacer una prueba controlada de 1 producto: ${report.summary.wouldWrite > 0 ? "SI" : "NO"}`);
  lines.push("");
  lines.push("Sample would-write");
  for (const item of report.items.filter((entry) => entry.result === "WOULD_WRITE").slice(0, 3)) {
    lines.push(
      `- ${item.slug} | ${item.productId} | before=${JSON.stringify(item.previousLogistics)} | proposed=${JSON.stringify(item.proposedLogistics)}`,
    );
  }
  lines.push("");
  lines.push("Sample blocked exclusions");
  for (const item of report.excludedBlocked.slice(0, 3)) {
    lines.push(`- ${item.slug} | ${item.productId} | ${item.result} | ${item.reason}`);
  }

  return lines.join("\n");
}

async function writeCandidate(client, candidate, mode) {
  const freshById = await fetchProductById(client, candidate.productId);
  const freshBySlugMatches = await fetchProductsByExactSlug(client, candidate.slug);
  const proposedLogistics = cloneLogistics(candidate.sourceLogistics);
  const baseRecord = createBaseRecord({
    mode,
    candidate,
    currentLogistics: freshById?.logistics ?? null,
    proposedLogistics,
  });

  if (!freshById) {
    return {
      ...baseRecord,
      result: "ERROR",
      reason: "No se pudo revalidar el producto antes de escribir.",
    };
  }

  if (freshById._id !== candidate.productId) {
    return {
      ...baseRecord,
      result: "SKIP_NOT_SAFE",
      reason: "El _id revalidado no coincide con el candidato.",
    };
  }

  if (freshBySlugMatches.length !== 1 || freshBySlugMatches[0]._id !== candidate.productId) {
    return {
      ...baseRecord,
      result: "SKIP_NOT_SAFE",
      reason: "El match exacto ya no sigue siendo unico para este producto.",
    };
  }

  if (!isCompleteLogistics(proposedLogistics)) {
    return {
      ...baseRecord,
      result: "SKIP_NOT_SAFE",
      reason: "La logistica propuesta dejo de ser valida antes de la escritura.",
    };
  }

  const freshLogistics = freshById.logistics ?? null;
  if (isCompleteLogistics(freshLogistics)) {
    return {
      ...baseRecord,
      result: "SKIP_ALREADY_HAS_LOGISTICS",
      reason: "El producto ya tenia product.logistics completo al momento de escribir.",
    };
  }

  if (hasAnyLogisticsValue(freshLogistics)) {
    return {
      ...baseRecord,
      result: "SKIP_NOT_SAFE",
      reason: "El producto ya tenia product.logistics parcial al momento de escribir.",
    };
  }

  try {
    const mutation = await client
      .patch(candidate.productId)
      .set({
        logistics: proposedLogistics,
      })
      .commit();

    return {
      ...baseRecord,
      result: "WRITTEN",
      reason: "La logistica fue escrita correctamente en product.logistics.",
      mutationId: mutation?.transactionId ?? mutation?._id ?? null,
      revision: mutation?._rev ?? null,
    };
  } catch (error) {
    return {
      ...baseRecord,
      result: "ERROR",
      reason: error instanceof Error ? error.message : "Error desconocido escribiendo en Sanity.",
    };
  }
}

async function main() {
  loadEnvFiles();

  const options = parseArgs(process.argv.slice(2));
  const mode = options.write ? "WRITE" : "DRY_RUN";
  const runId = buildRunId();
  const reportPaths = buildReportPaths(runId);
  const dryRunReport = await readDryRunReport();
  const client = buildSanityClient();

  const { allCandidates, blockedCandidates, safeCandidates, selectedSafeCandidates } = selectCandidates(
    dryRunReport,
    options,
  );

  const selectedIds = selectedSafeCandidates.map((candidate) => candidate.productId);
  const selectedSlugs = selectedSafeCandidates.map((candidate) => candidate.slug);
  const sanityProductsById = indexProductsById(await fetchProductsByIds(client, selectedIds));
  const sanityProductsBySlug = indexProductsBySlug(await fetchProductsBySlugs(client, selectedSlugs));

  const items = [];
  const excludedBlocked = [];

  let wouldWrite = 0;
  let written = 0;
  let skipAlreadyHasLogistics = 0;
  let skipNotSafe = 0;
  let skipBlocked = 0;
  let error = 0;

  for (const blockedCandidate of blockedCandidates) {
    excludedBlocked.push({
      timestamp: new Date().toISOString(),
      mode,
      product: normalizeText(blockedCandidate.title),
      title: normalizeText(blockedCandidate.title),
      slug: blockedCandidate.slug,
      productId: blockedCandidate.productId ?? null,
      previousLogistics: cloneLogistics(blockedCandidate.currentLogistics ?? null),
      proposedLogistics: cloneLogistics(blockedCandidate.sourceLogistics ?? null),
      result: "SKIP_BLOCKED",
      reason: blockedCandidate.reason || "El producto quedo excluido del backfill seguro.",
      mutationId: null,
      revision: null,
    });
    skipBlocked += 1;
  }

  for (const candidate of selectedSafeCandidates) {
    const currentById = sanityProductsById.get(candidate.productId) ?? null;
    const currentBySlugMatches = sanityProductsBySlug.get(normalizeComparableText(candidate.slug)) ?? [];
    const proposedLogistics = cloneLogistics(candidate.sourceLogistics);

    const initialRecord = createBaseRecord({
      mode,
      candidate,
      currentLogistics: currentById?.logistics ?? null,
      proposedLogistics,
    });

    if (!currentById) {
      items.push({
        ...initialRecord,
        result: "SKIP_NOT_SAFE",
        reason: "El producto ya no existe en la revalidacion inicial de Sanity.",
      });
      skipNotSafe += 1;
      continue;
    }

    if (currentById._id !== candidate.productId) {
      items.push({
        ...initialRecord,
        result: "SKIP_NOT_SAFE",
        reason: "El _id revalidado no coincide con el candidato validado en el dry-run.",
      });
      skipNotSafe += 1;
      continue;
    }

    if (currentBySlugMatches.length !== 1 || currentBySlugMatches[0]._id !== candidate.productId) {
      items.push({
        ...initialRecord,
        result: "SKIP_NOT_SAFE",
        reason: "El match exacto por slug ya no es unico o ya no apunta al mismo _id.",
      });
      skipNotSafe += 1;
      continue;
    }

    if (!isCompleteLogistics(proposedLogistics)) {
      items.push({
        ...initialRecord,
        result: "SKIP_NOT_SAFE",
        reason: "La logistica propuesta no es completa o valida.",
      });
      skipNotSafe += 1;
      continue;
    }

    const currentLogistics = currentById.logistics ?? null;
    if (isCompleteLogistics(currentLogistics)) {
      items.push({
        ...initialRecord,
        result: "SKIP_ALREADY_HAS_LOGISTICS",
        reason: "El producto ya tiene product.logistics completo y no se sobrescribe.",
      });
      skipAlreadyHasLogistics += 1;
      continue;
    }

    if (hasAnyLogisticsValue(currentLogistics)) {
      items.push({
        ...initialRecord,
        result: "SKIP_NOT_SAFE",
        reason: "El producto tiene product.logistics parcial o invalido y se excluye.",
      });
      skipNotSafe += 1;
      continue;
    }

    if (!options.write) {
      items.push({
        ...initialRecord,
        result: "WOULD_WRITE",
        reason: "Pasa las validaciones estrictas y quedaria listo para escritura.",
      });
      wouldWrite += 1;
      continue;
    }

    const writeResult = await writeCandidate(client, candidate, mode);
    items.push(writeResult);

    if (writeResult.result === "WRITTEN") {
      written += 1;
      continue;
    }

    if (writeResult.result === "SKIP_ALREADY_HAS_LOGISTICS") {
      skipAlreadyHasLogistics += 1;
      continue;
    }

    if (writeResult.result === "SKIP_NOT_SAFE") {
      skipNotSafe += 1;
      continue;
    }

    error += 1;
  }

  const summary = {
    totalSourceCandidates: allCandidates.length,
    safeCandidatesAvailable: safeCandidates.length,
    blockedCandidatesExcluded: excludedBlocked.length,
    evaluatedCandidates: selectedSafeCandidates.length,
    wouldWrite,
    written,
    skipAlreadyHasLogistics,
    skipNotSafe,
    skipBlocked,
    error,
  };

  const dryRunSourceProducts = Number(dryRunReport?.summary?.currentSanityProducts ?? 0);
  const report = {
    generatedAt: new Date().toISOString(),
    mode,
    options: {
      dryRun: options.dryRun,
      write: options.write,
      limit: options.limit,
      productId: options.productId,
    },
    sourceReportPath: DRY_RUN_REPORT_PATH,
    sanity: {
      projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_PROJECT_ID || "",
      dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || process.env.SANITY_DATASET || "",
      currentProducts: dryRunSourceProducts,
      selectedProductsRead: selectedSafeCandidates.length,
    },
    summary,
    items,
    excludedBlocked,
  };

  await mkdir(REPORT_DIR, { recursive: true });
  await writeFile(reportPaths.json, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(reportPaths.text, `${buildTextReport(report)}\n`, "utf8");

  console.log(buildTextReport(report));
  console.log("");
  console.log(`JSON report written to: ${reportPaths.json}`);
  console.log(`Text report written to: ${reportPaths.text}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
