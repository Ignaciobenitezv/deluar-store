import { readFile } from "node:fs/promises";
import path from "node:path";
import fs from "node:fs/promises";
import { TextDecoder } from "node:util";
import { pathToFileURL } from "node:url";
import dotenv from "dotenv";
import { createClient } from "@sanity/client";
import {
  DEFAULT_DRY_RUN_JSON_REPORT_PATH,
  DEFAULT_DRY_RUN_TEXT_REPORT_PATH,
  writeImportExecutionReport,
  writeImportDryRunReports,
} from "./report-writer.mjs";

const DEFAULT_CSV_PATH = path.join(
  process.cwd(),
  "imports",
  "tiendanube-4147750-17859311121905920727825559417 (1).csv",
);
const PLACEHOLDER_IMAGE_FILENAME = "import-placeholder-product.png";
const PLACEHOLDER_IMAGE_ALT = "Imagen pendiente";
const PLACEHOLDER_IMAGE_PATH = path.join(process.cwd(), "scripts", "assets", PLACEHOLDER_IMAGE_FILENAME);
const PLACEHOLDER_IMAGE_ASSET_QUERY = `
  *[_type == "sanity.imageAsset" && originalFilename == $filename][0]{
    _id
  }
`;

const ALLOWED_VARIANT_ATTRIBUTE_NAMES = ["Color", "Tama\u00f1o", "Modelo", "Talle"];
const ATTRIBUTE_ORDER = new Map(
  ALLOWED_VARIANT_ATTRIBUTE_NAMES.map((name, index) => [name, index]),
);

function decodeWindows1252(buffer) {
  try {
    return new TextDecoder("windows-1252").decode(buffer);
  } catch {
    return new TextDecoder("latin1").decode(buffer);
  }
}

function stripBom(value) {
  return value.replace(/^\uFEFF/, "");
}

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function removeDiacritics(value) {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeHeader(value) {
  return removeDiacritics(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function slugify(value) {
  return removeDiacritics(value)
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseNumber(value) {
  const normalized = normalizeText(value);

  if (!normalized) {
    return null;
  }

  const cleaned = normalized.replace(/[^\d,.-]/g, "");

  if (!cleaned) {
    return null;
  }

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");

  let decimalSeparator = null;

  if (lastComma !== -1 && lastDot !== -1) {
    decimalSeparator = lastComma > lastDot ? "," : ".";
  } else if (lastComma !== -1) {
    const digitsAfter = cleaned.length - lastComma - 1;
    if (digitsAfter > 0 && digitsAfter <= 2) {
      decimalSeparator = ",";
    }
  } else if (lastDot !== -1) {
    const digitsAfter = cleaned.length - lastDot - 1;
    if (digitsAfter > 0 && digitsAfter <= 2) {
      decimalSeparator = ".";
    }
  }

  let normalizedNumber = cleaned;

  if (decimalSeparator === ",") {
    normalizedNumber = cleaned.replace(/\./g, "").replace(/,/g, ".");
  } else if (decimalSeparator === ".") {
    normalizedNumber = cleaned.replace(/,/g, "");
  } else {
    normalizedNumber = cleaned.replace(/[.,]/g, "");
  }

  const parsed = Number(normalizedNumber);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseBoolean(value) {
  const normalized = removeDiacritics(value).toLowerCase();

  if (!normalized) {
    return null;
  }

  if (["si", "s", "yes", "true", "1", "activo", "visible"].includes(normalized)) {
    return true;
  }

  if (["no", "n", "false", "0", "inactivo", "oculto"].includes(normalized)) {
    return false;
  }

  return null;
}

function getImageAssetRef(image) {
  return normalizeText(image?.image?.asset?._ref) || null;
}

function hasRealManagedImages(product, placeholderAssetRef) {
  const images = Array.isArray(product?.images) ? product.images : [];

  return images.some((image) => {
    const assetRef = getImageAssetRef(image);
    return assetRef && assetRef !== placeholderAssetRef;
  });
}

function hasOnlyPlaceholderImages(product, placeholderAssetRef) {
  const images = Array.isArray(product?.images) ? product.images : [];

  if (images.length === 0) {
    return false;
  }

  return images.every((image) => getImageAssetRef(image) === placeholderAssetRef);
}

function buildPlaceholderImageDocument(placeholderAssetRef) {
  return [
    {
      _key: "placeholder",
      _type: "imageWithAlt",
      alt: PLACEHOLDER_IMAGE_ALT,
      image: {
        _type: "image",
        asset: {
          _type: "reference",
          _ref: placeholderAssetRef,
        },
      },
    },
  ];
}

async function resolvePlaceholderImageAssetRef(sanityWriteClient) {
  const existingAsset = await sanityWriteClient.fetch(PLACEHOLDER_IMAGE_ASSET_QUERY, {
    filename: PLACEHOLDER_IMAGE_FILENAME,
  });

  if (existingAsset?._id) {
    return existingAsset._id;
  }

  const placeholderBytes = await fs.readFile(PLACEHOLDER_IMAGE_PATH);
  const uploadedAsset = await sanityWriteClient.assets.upload("image", placeholderBytes, {
    filename: PLACEHOLDER_IMAGE_FILENAME,
    contentType: "image/png",
  });

  return uploadedAsset._id;
}

function parseCsvText(text, delimiter = ";") {
  const rows = [];
  let currentRow = [];
  let currentCell = "";
  let inQuotes = false;
  let rowStartLine = 1;
  let line = 1;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (char === '"') {
      if (inQuotes && text[index + 1] === '"') {
        currentCell += '"';
        index += 1;
        continue;
      }

      inQuotes = !inQuotes;
      continue;
    }

    if (!inQuotes && char === delimiter) {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      currentRow.push(currentCell);
      currentCell = "";

      if (!currentRow.every((cell) => normalizeText(cell) === "")) {
        rows.push({ rowNumber: rowStartLine, values: currentRow });
      }

      currentRow = [];

      if (char === "\r" && text[index + 1] === "\n") {
        index += 1;
      }

      line += 1;
      rowStartLine = line;
      continue;
    }

    currentCell += char;
  }

  currentRow.push(currentCell);

  if (!currentRow.every((cell) => normalizeText(cell) === "")) {
    rows.push({ rowNumber: rowStartLine, values: currentRow });
  }

  return rows;
}

function canonicalizeVariantAttributeName(value) {
  const normalized = removeDiacritics(value).toLowerCase();

  if (normalized === "color") {
    return "Color";
  }

  if (normalized === "tamano") {
    return "Tama\u00f1o";
  }

  if (normalized === "modelo") {
    return "Modelo";
  }

  if (normalized === "talle") {
    return "Talle";
  }

  return null;
}

function parseCategoryPaths(value) {
  const rawValue = normalizeText(value);

  if (!rawValue) {
    return [];
  }

  return rawValue
    .split(",")
    .map((categoryPath) => normalizeText(categoryPath))
    .filter(Boolean)
    .map((categoryPath) => {
      const segments = categoryPath
        .split(">")
        .map((segment) => normalizeText(segment))
        .filter(Boolean);

      const slugSegments = segments.map((segment) => slugify(segment)).filter(Boolean);

      return {
        raw: categoryPath,
        segments,
        slugSegments,
        slug: slugSegments.join("/"),
        depth: slugSegments.length,
      };
    })
    .filter((categoryPath) => categoryPath.slug.length > 0);
}

function buildVariantSignature(attributes) {
  const orderedAttributes = [...attributes].sort(
    (left, right) =>
      (ATTRIBUTE_ORDER.get(left.name) ?? Number.MAX_SAFE_INTEGER) -
      (ATTRIBUTE_ORDER.get(right.name) ?? Number.MAX_SAFE_INTEGER),
  );

  if (orderedAttributes.length === 0) {
    return {
      signature: "__simple__",
      value: "",
      label: "",
    };
  }

  const signature = orderedAttributes
    .map((attribute) => `${slugify(attribute.name)}=${slugify(attribute.value)}`)
    .join("|");

  const value = orderedAttributes
    .map((attribute) => slugify(attribute.value))
    .join("|");

  const label = orderedAttributes
    .map((attribute) => `${attribute.name}: ${attribute.value}`)
    .join(" · ");

  return {
    signature,
    value,
    label,
  };
}

function parseVariantAttributes(row, warnings) {
  const attributes = [];

  for (let index = 1; index <= 3; index += 1) {
    const rawName = normalizeText(row[`propertyName${index}`]);
    const rawValue = normalizeText(row[`propertyValue${index}`]);

    if (!rawName && !rawValue) {
      continue;
    }

    const name = canonicalizeVariantAttributeName(rawName);

    if (!name) {
      if (rawName && rawValue) {
        warnings.push(
          `Fila ${row.rowNumber}: atributo no soportado "${rawName}" encontrado en la propiedad ${index}.`,
        );
      } else if (rawValue && !rawName) {
        warnings.push(
          `Fila ${row.rowNumber}: la propiedad ${index} tiene valor pero no tiene nombre y fue ignorada.`,
        );
      }
      continue;
    }

    if (!rawValue) {
      warnings.push(`Fila ${row.rowNumber}: la propiedad "${name}" no tiene valor y fue ignorada.`);
      continue;
    }

    attributes.push({ name, value: rawValue });
  }

  return attributes;
}

function readHeaderIndexes(headerRow) {
  const indexes = new Map();
  const normalizedHeaders = headerRow.values.map((header) => normalizeHeader(header));

  normalizedHeaders.forEach((header, index) => {
    if (!indexes.has(header)) {
      indexes.set(header, index);
    }
  });

  return { indexes, normalizedHeaders };
}

function getHeaderValue(rowValues, headerIndexes, headerNames) {
  for (const headerName of headerNames) {
    const index = headerIndexes.get(headerName);
    if (typeof index === "number") {
      return rowValues[index] ?? "";
    }
  }

  return "";
}

function parseCsvRows(text) {
  const parsedRows = parseCsvText(stripBom(text));

  if (parsedRows.length === 0) {
    return {
      headers: [],
      rows: [],
      warnings: ["El CSV no contiene filas."],
      errors: ["El archivo esta vacio."],
    };
  }

  const headerRow = parsedRows[0];
  const { indexes: headerIndexes, normalizedHeaders } = readHeaderIndexes(headerRow);

  const warnings = [];
  const errors = [];

  const knownHeaderNames = new Set([
    "identificador de url",
    "nombre",
    "categorias",
    "nombre de propiedad 1",
    "valor de propiedad 1",
    "nombre de propiedad 2",
    "valor de propiedad 2",
    "nombre de propiedad 3",
    "valor de propiedad 3",
    "precio",
    "precio promocional",
    "peso kg",
    "alto cm",
    "ancho cm",
    "profundidad cm",
    "stock",
    "sku",
    "codigo de barras",
    "mostrar en tienda",
    "envio sin cargo",
    "descripcion",
    "tags",
    "titulo para seo",
    "descripcion para seo",
    "marca",
    "producto fisico",
    "mpn numero de pieza del fabricante",
    "sexo",
    "rango de edad",
    "costo",
    "visibilidad",
  ]);

  const unknownHeaders = normalizedHeaders.filter(
    (header) =>
      header &&
      !knownHeaderNames.has(header) &&
      !/^nombre de propiedad \d+$/.test(header) &&
      !/^valor de propiedad \d+$/.test(header),
  );

  if (unknownHeaders.length > 0) {
    warnings.push(`Headers desconocidos detectados: ${unknownHeaders.join(", ")}.`);
  }

  const rows = [];

  for (const parsedRow of parsedRows.slice(1)) {
    const rowValues = parsedRow.values;
    const rowWarnings = [];
    const rowErrors = [];

    if (rowValues.length !== headerRow.values.length) {
      rowWarnings.push(
        `Fila ${parsedRow.rowNumber}: cantidad de columnas inesperada (${rowValues.length} vs ${headerRow.values.length}).`,
      );
    }

    const identifier = normalizeText(
      getHeaderValue(rowValues, headerIndexes, ["identificador de url"]),
    );
    const title = normalizeText(getHeaderValue(rowValues, headerIndexes, ["nombre"]));
    const categoryCell = normalizeText(getHeaderValue(rowValues, headerIndexes, ["categorias"]));
    const price = parseNumber(getHeaderValue(rowValues, headerIndexes, ["precio"]));
    const stock = parseNumber(getHeaderValue(rowValues, headerIndexes, ["stock"]));
    const sku = normalizeText(getHeaderValue(rowValues, headerIndexes, ["sku"]));
    const barcode = normalizeText(getHeaderValue(rowValues, headerIndexes, ["codigo de barras"]));
    const descriptionHtml = getHeaderValue(rowValues, headerIndexes, ["descripcion"]);
    const seoTitle = normalizeText(getHeaderValue(rowValues, headerIndexes, ["titulo para seo"]));
    const seoDescription = normalizeText(
      getHeaderValue(rowValues, headerIndexes, ["descripcion para seo"]),
    );
    const brand = normalizeText(getHeaderValue(rowValues, headerIndexes, ["marca"]));
    const weightKg = parseNumber(getHeaderValue(rowValues, headerIndexes, ["peso kg"]));
    const heightCm = parseNumber(getHeaderValue(rowValues, headerIndexes, ["alto cm"]));
    const widthCm = parseNumber(getHeaderValue(rowValues, headerIndexes, ["ancho cm"]));
    const depthCm = parseNumber(getHeaderValue(rowValues, headerIndexes, ["profundidad cm"]));
    const showInStore = parseBoolean(getHeaderValue(rowValues, headerIndexes, ["mostrar en tienda"]));
    const freeShipping = parseBoolean(getHeaderValue(rowValues, headerIndexes, ["envio sin cargo"]));
    const physicalProduct = parseBoolean(
      getHeaderValue(rowValues, headerIndexes, ["producto fisico"]),
    );
    const cost = parseNumber(getHeaderValue(rowValues, headerIndexes, ["costo"]));
    const visibility = normalizeText(getHeaderValue(rowValues, headerIndexes, ["visibilidad"]));
    const categoryPaths = parseCategoryPaths(categoryCell);
    const variantAttributes = parseVariantAttributes(
      {
        rowNumber: parsedRow.rowNumber,
        propertyName1: getHeaderValue(rowValues, headerIndexes, ["nombre de propiedad 1"]),
        propertyValue1: getHeaderValue(rowValues, headerIndexes, ["valor de propiedad 1"]),
        propertyName2: getHeaderValue(rowValues, headerIndexes, ["nombre de propiedad 2"]),
        propertyValue2: getHeaderValue(rowValues, headerIndexes, ["valor de propiedad 2"]),
        propertyName3: getHeaderValue(rowValues, headerIndexes, ["nombre de propiedad 3"]),
        propertyValue3: getHeaderValue(rowValues, headerIndexes, ["valor de propiedad 3"]),
      },
      rowWarnings,
    );

    if (!identifier) {
      rowErrors.push(`Fila ${parsedRow.rowNumber}: falta el Identificador de URL.`);
    }

    if (stock === null) {
      rowWarnings.push(`Fila ${parsedRow.rowNumber}: no se pudo leer el stock.`);
    }

    rows.push({
      rowNumber: parsedRow.rowNumber,
      sourceProductUrlIdentifier: identifier,
      sourceProductName: title,
      sourceCategoryPath: categoryCell,
      categoryPaths,
      sourceDescriptionHtml: descriptionHtml,
      sourcePrice: price,
      sourceStock: stock,
      sourceSku: sku || null,
      sourceBarcode: barcode || null,
      sourceSeoTitle: seoTitle || null,
      sourceSeoDescription: seoDescription || null,
      sourceBrand: brand || null,
      sourceWeight: weightKg,
      sourceDimensions: {
        heightCm,
        widthCm,
        depthCm,
      },
      sourceShowInStore: showInStore,
      sourceFreeShipping: freeShipping,
      sourcePhysicalProduct: physicalProduct,
      sourceCost: cost,
      sourceVisibility: visibility || null,
      variantAttributes,
      warnings: rowWarnings,
      errors: rowErrors,
    });
  }

  return {
    headers: headerRow.values,
    rows,
    warnings,
    errors,
  };
}

function groupRowsByProduct(rows) {
  const groups = new Map();

  for (const row of rows) {
    if (!row.sourceProductUrlIdentifier) {
      continue;
    }

    const key = slugify(row.sourceProductUrlIdentifier);
    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key).push(row);
  }

  return groups;
}

function normalizeProducts(rows) {
  const groups = groupRowsByProduct(rows);
  const products = [];
  const attributeUsage = {
    Color: 0,
    Tama\u00f1o: 0,
    Modelo: 0,
    Talle: 0,
  };

  const warnings = [];
  const errors = [];

  for (const [sourceId, groupRows] of groups) {
    const productWarnings = [];
    const productErrors = [];
    const categoryPaths = [];
    const seenCategoryPaths = new Set();
    const variantMap = new Map();
    const title = groupRows.find((row) => row.sourceProductName)?.sourceProductName ?? "";
    const descriptionHtml =
      groupRows.find((row) => normalizeText(row.sourceDescriptionHtml))?.sourceDescriptionHtml ?? "";
    const seoTitle =
      groupRows.map((row) => row.sourceSeoTitle).find((value) => normalizeText(value)) ?? null;
    const seoDescription =
      groupRows.map((row) => row.sourceSeoDescription).find((value) => normalizeText(value)) ??
      null;
    const sourceShowInStore = groupRows
      .map((row) => row.sourceShowInStore)
      .find((value) => typeof value === "boolean" || value === null);
    const sourceVisibility =
      groupRows.map((row) => row.sourceVisibility).find((value) => normalizeText(value)) ?? null;

    let firstPrice = null;
    let firstStock = null;
    let hasVariantAttributes = false;

    for (const row of groupRows) {
      productWarnings.push(...row.warnings);
      productErrors.push(...row.errors);

      for (const categoryPath of row.categoryPaths) {
        if (!seenCategoryPaths.has(categoryPath.slug)) {
          seenCategoryPaths.add(categoryPath.slug);
          categoryPaths.push(categoryPath);
        }
      }

      if (typeof row.sourcePrice === "number" && firstPrice === null) {
        firstPrice = row.sourcePrice;
      }

      if (typeof row.sourceStock === "number" && firstStock === null) {
        firstStock = row.sourceStock;
      }

      if (row.variantAttributes.length > 0) {
        hasVariantAttributes = true;
      }

      for (const attribute of row.variantAttributes) {
        attributeUsage[attribute.name] += 1;
      }

      const signatureInfo = buildVariantSignature(row.variantAttributes);
      const variantKey = signatureInfo.signature;
      const existingVariant = variantMap.get(variantKey);

      if (!existingVariant) {
        variantMap.set(variantKey, {
          signature: variantKey,
          value: signatureInfo.value,
          label: signatureInfo.label || title,
          attributes: row.variantAttributes,
          stock: row.sourceStock ?? 0,
          basePrice: row.sourcePrice,
          images: [],
          isActive: true,
          rowNumbers: [row.rowNumber],
        });
      } else {
        existingVariant.rowNumbers.push(row.rowNumber);

        if (
          typeof existingVariant.stock === "number" &&
          typeof row.sourceStock === "number" &&
          existingVariant.stock !== row.sourceStock
        ) {
          productWarnings.push(
            `Producto ${sourceId}: la variante "${existingVariant.label}" tiene stock distinto en filas repetidas.`,
          );
        }

        if (
          typeof existingVariant.basePrice === "number" &&
          typeof row.sourcePrice === "number" &&
          existingVariant.basePrice !== row.sourcePrice
        ) {
          productWarnings.push(
            `Producto ${sourceId}: la variante "${existingVariant.label}" tiene precio distinto en filas repetidas.`,
          );
        }
      }
    }

    const variants = [...variantMap.values()];
    const simpleProduct = !hasVariantAttributes;
    const variantStocks = variants
      .map((variant) => variant.stock)
      .filter((value) => typeof value === "number");
    const hasStockDifferences = new Set(variantStocks).size > 1;

    if (simpleProduct && variants.length > 1) {
      productWarnings.push(
        `Producto ${sourceId}: se detectaron filas repetidas sin atributos y se consolidaron.`,
      );
    }

    if (!title) {
      productErrors.push(`Producto ${sourceId}: falta titulo.`);
    }

    if (firstPrice === null) {
      productErrors.push(`Producto ${sourceId}: no tiene precio valido.`);
    }

    if (categoryPaths.length === 0) {
      productWarnings.push(`Producto ${sourceId}: no tiene categorias detectables.`);
    }

    if (categoryPaths.length > 1) {
      productWarnings.push(
        `Producto ${sourceId}: tiene ${categoryPaths.length} rutas de categoria detectadas.`,
      );
    }

    warnings.push(...productWarnings);
    errors.push(...productErrors);

    products.push({
      sourceId,
      slug: sourceId,
      title,
      descriptionHtml,
      basePrice: firstPrice,
      stock: simpleProduct ? firstStock ?? 0 : variants.reduce((total, variant) => total + (variant.stock ?? 0), 0),
      seoTitle,
      seoDescription,
      sourceShowInStore,
      sourceVisibility,
      simpleProduct,
      variants,
      categoryPaths,
      primaryCategoryPath: undefined,
      hasStockDifferences,
      warnings: productWarnings,
      errors: productErrors,
      rowNumbers: groupRows.map((row) => row.rowNumber),
    });
  }

  const simpleProducts = products.filter((product) => product.simpleProduct).length;
  const productsWithVariantAttributes = products.filter(
    (product) => !product.simpleProduct,
  ).length;
  const productsWithMultipleVariants = products.filter((product) => product.variants.length > 1).length;
  const totalVariants = products.reduce((total, product) => total + product.variants.length, 0);
  const productsWithStockDifferences = products.filter(
    (product) => !product.simpleProduct && product.hasStockDifferences,
  ).length;

  return {
    products,
    summary: {
      totalRows: rows.length,
      validRows: rows.filter((row) => row.errors.length === 0).length,
      invalidRows: rows.filter((row) => row.errors.length > 0).length,
      uniqueProducts: products.length,
      simpleProducts,
      productsWithVariantAttributes,
      productsWithMultipleVariants,
      totalVariants,
      productsWithStockDifferences,
    },
    attributeUsage,
    warnings,
    errors,
  };
}

const SANITY_CATEGORY_TREE_QUERY = `
  *[_type == "category"] | order(coalesce(order, 999) asc, title asc) {
    _id,
    _type,
    title,
    slug,
    description,
    order,
    "subcategories": *[_type == "subcategory" && references(^._id)]
      | order(coalesce(order, 999) asc, title asc) {
        _id,
        _type,
        title,
        slug,
        description,
        order,
        "subcategories": *[_type == "subcategory" && references(^._id)]
          | order(coalesce(order, 999) asc, title asc) {
            _id,
            _type,
            title,
            slug,
            description,
            order
          }
      }
  }
`;

const SANITY_PRODUCTS_BY_SLUGS_QUERY = `
  *[_type == "product" && slug.current in $slugs] {
    _id,
    slug,
    title,
    shortDescription,
    "descriptionText": pt::text(description),
    basePrice,
    stock,
    isActive,
    images,
    seo,
    category->{
      _id,
      title,
      slug
    },
    subcategory->{
      _id,
      title,
      slug,
      parentCategory->{
        _id,
        title,
        slug
      }
    },
    variants[]{
      _key,
      title,
      value,
      attributes[]{
        name,
        value
      },
      basePrice,
      stock,
      isActive
    },
    colorVariants[]{
      _key,
      title,
      value,
      basePrice,
      stock
    }
  }
`;

function loadSanityReadClient() {
  dotenv.config({ path: path.join(process.cwd(), ".env.local") });
  dotenv.config({
    path: path.join(process.cwd(), ".env.production.local"),
    override: false,
  });

  const projectId =
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_PROJECT_ID || "";
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || process.env.SANITY_DATASET || "";
  const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2026-04-01";
  const readToken = process.env.SANITY_READ_TOKEN || "";

  if (!projectId || !dataset) {
    throw new Error(
      "Falta configurar Sanity para el dry-run. Definí NEXT_PUBLIC_SANITY_PROJECT_ID y NEXT_PUBLIC_SANITY_DATASET.",
    );
  }

  return createClient({
    projectId,
    dataset,
    apiVersion,
    useCdn: !readToken,
    token: readToken || undefined,
    perspective: "published",
  });
}

function loadSanityWriteClient() {
  dotenv.config({ path: path.join(process.cwd(), ".env.local") });
  dotenv.config({
    path: path.join(process.cwd(), ".env.production.local"),
    override: false,
  });

  const projectId =
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_PROJECT_ID || "";
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || process.env.SANITY_DATASET || "";
  const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2026-04-01";
  const writeToken = process.env.SANITY_WRITE_TOKEN || "";

  if (!projectId || !dataset) {
    throw new Error(
      "Falta configurar Sanity para la importacion. Defini NEXT_PUBLIC_SANITY_PROJECT_ID y NEXT_PUBLIC_SANITY_DATASET.",
    );
  }

  if (!writeToken) {
    throw new Error("Falta configurar SANITY_WRITE_TOKEN para ejecutar --write.");
  }

  return createClient({
    projectId,
    dataset,
    apiVersion,
    useCdn: false,
    token: writeToken,
    perspective: "published",
  });
}

function parseImportLimit(value) {
  const normalized = normalizeText(value);

  if (!normalized || !/^\d+$/.test(normalized)) {
    throw new Error(`El valor de --limit debe ser un entero no negativo. Recibido: ${value ?? ""}`);
  }

  return Number.parseInt(normalized, 10);
}

function parseImportSlugs(value) {
  return String(value ?? "")
    .split(",")
    .map((slug) => normalizeText(slug))
    .map((slug) => slugify(slug))
    .filter(Boolean);
}

function parseImportCliArgs(args) {
  const options = {
    filePath: DEFAULT_CSV_PATH,
    json: false,
    dryRun: false,
    write: false,
    diagnose: false,
    limit: null,
    slugs: [],
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--file" && args[index + 1]) {
      options.filePath = path.resolve(process.cwd(), args[index + 1]);
      index += 1;
      continue;
    }

    if (arg.startsWith("--file=")) {
      options.filePath = path.resolve(process.cwd(), arg.slice("--file=".length));
      continue;
    }

    if (arg === "--json") {
      options.json = true;
      continue;
    }

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg === "--write") {
      options.write = true;
      continue;
    }

    if (arg === "--diagnose") {
      options.diagnose = true;
      continue;
    }

    if (arg === "--limit" && args[index + 1]) {
      options.limit = parseImportLimit(args[index + 1]);
      index += 1;
      continue;
    }

    if (arg.startsWith("--limit=")) {
      options.limit = parseImportLimit(arg.slice("--limit=".length));
      continue;
    }

    if (arg === "--slugs" && args[index + 1]) {
      options.slugs = parseImportSlugs(args[index + 1]);
      index += 1;
      continue;
    }

    if (arg.startsWith("--slugs=")) {
      options.slugs = parseImportSlugs(arg.slice("--slugs=".length));
    }
  }

  return options;
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

function collectRequiredCategoryNodes(products) {
  const nodes = new Map();

  for (const product of products) {
    for (const resolution of product.categoryResolutions ?? []) {
      if (resolution?.status !== "planned-create") {
        continue;
      }

      const missingNodes = resolution.missingNodes ?? [];
      const slugSegments = resolution.slugSegments ?? [];
      const titleSegments = resolution.segments ?? [];

      for (const missingNode of missingNodes) {
        const pathSegments = slugSegments.slice(0, missingNode.depth);
        const nodePath = pathSegments.join("/");

        if (!nodePath || nodes.has(nodePath)) {
          continue;
        }

        nodes.set(nodePath, {
          type: missingNode.depth === 1 ? "category" : "subcategory",
          path: nodePath,
          title: titleSegments[missingNode.depth - 1] ?? missingNode.title ?? missingNode.slug,
          slug: missingNode.slug,
          parentPath: missingNode.depth > 1 ? pathSegments.slice(0, -1).join("/") : null,
          depth: missingNode.depth,
        });
      }
    }
  }

  return sortByStableKey([...nodes.values()], (node) => {
    const parent = normalizeText(node.parentPath) ?? "";
    return `${String(node.depth).padStart(2, "0")}|${parent}|${node.slug}`;
  });
}

function buildCategoryDocumentId(node) {
  const prefix = node.type === "category" ? "import-category" : "import-subcategory";
  const path = normalizeText(node.path ?? (node.parentPath ? `${node.parentPath}/${node.slug}` : node.slug));
  return `${prefix}-${path.replace(/\//g, "--")}`;
}

function buildProductDocumentId(product) {
  return `import-product-${product.slug}`;
}

function buildCategoryResolutionState(sanityTree) {
  const treeIndex = buildCategoryTreeIndex(sanityTree);
  const categoryByPath = new Map();

  function visit(node, parentId = null, parentPathSegments = []) {
    const pathSegments = [...parentPathSegments, node.slug];
    const path = pathSegments.join("/");

    categoryByPath.set(path, {
      id: node.id,
      type: node.type,
      parentId,
      path,
      status: "reusable",
    });

    for (const child of node.children ?? []) {
      visit(child, node.id, pathSegments);
    }
  }

  for (const root of treeIndex.roots) {
    visit(root);
  }

  return categoryByPath;
}

function resolveCategoryDocumentId(categoryByPath, path) {
  const normalizedPath = normalizeText(path);
  if (!normalizedPath) {
    return null;
  }

  const entry = categoryByPath.get(normalizedPath);
  return entry?.id ?? null;
}

function buildCategoryCreateDocument(node, categoryByPath) {
  const parentPath = node.parentPath ? normalizeText(node.parentPath) : "";
  const document = {
    _id: buildCategoryDocumentId(node),
    _type: node.type,
    title: node.title,
    slug: {
      _type: "slug",
      current: node.slug,
    },
  };

  if (parentPath) {
    const parentId = resolveCategoryDocumentId(categoryByPath, parentPath);

    if (!parentId) {
      throw new Error(
        `No se pudo resolver el padre real para la categoria "${node.path}" (${parentPath}).`,
      );
    }

    document.parentCategory = {
      _type: "reference",
      _ref: parentId,
    };
  }

  return document;
}

function buildManagedProductFields(product) {
  return {
    title: normalizeText(product.title),
    shortDescription: normalizeText(product.shortDescription ?? product.sourceSeoDescription ?? ""),
    description: product.descriptionPortableText ?? [],
    basePrice: typeof product.basePrice === "number" ? product.basePrice : null,
    stock: typeof product.stock === "number" ? product.stock : 0,
    isActive: normalizeActiveState(product),
    seoTitle: normalizeText(product.seoTitle ?? ""),
    seoDescription: normalizeText(product.seoDescription ?? ""),
    variants: normalizeImportedProductVariants(product),
  };
}

function buildProductWritePayload(product, categoryByPath, options = {}) {
  const placeholderAssetRef = normalizeText(options.placeholderAssetRef);
  const primaryPath = product.primaryCategoryPath;
  const categoryId = resolveCategoryDocumentId(categoryByPath, primaryPath?.slugSegments?.[0] ?? "");
  const subcategoryId =
    primaryPath && primaryPath.depth > 1 ? resolveCategoryDocumentId(categoryByPath, primaryPath.slug) : null;

  if (!categoryId) {
    throw new Error(`No se pudo resolver la categoria principal para ${product.slug}.`);
  }

  if (primaryPath && primaryPath.depth > 1 && !subcategoryId) {
    throw new Error(`No se pudo resolver la subcategoria principal para ${product.slug}.`);
  }

  const managed = buildManagedProductFields(product);
  const document = {
    _id: `import-product-${product.slug}`,
    _type: "product",
    title: managed.title,
    slug: {
      _type: "slug",
      current: product.slug,
    },
    shortDescription: managed.shortDescription,
    description: managed.description,
    basePrice: managed.basePrice,
    stock: managed.stock,
    isActive: managed.isActive,
    images: placeholderAssetRef ? buildPlaceholderImageDocument(placeholderAssetRef) : undefined,
    category: {
      _type: "reference",
      _ref: categoryId,
    },
    variants: managed.variants.map((variant) => ({
      _key: variant.id || variant.value || variant.title || "variant",
      title: variant.title || variant.value || product.title,
      value: variant.value,
      attributes: variant.attributes.map((attribute) => ({
        _key: `${slugify(attribute.name)}-${slugify(attribute.value)}`,
        name: attribute.name,
        value: attribute.value,
      })),
      basePrice: variant.basePrice,
      stock: variant.stock,
      isActive: true,
    })),
  };

  if (subcategoryId) {
    document.subcategory = {
      _type: "reference",
      _ref: subcategoryId,
    };
  }

  if (normalizeText(product.seoTitle) || normalizeText(product.seoDescription)) {
    document.seo = {};

    if (normalizeText(product.seoTitle)) {
      document.seo.title = normalizeText(product.seoTitle);
    }

    if (normalizeText(product.seoDescription)) {
      document.seo.description = normalizeText(product.seoDescription);
    }
  }

  if (document.images === undefined) {
    delete document.images;
  }

  return document;
}

function buildProductUpdatePatch(product, categoryByPath, documentId) {
  const payload = buildProductWritePayload(product, categoryByPath);
  const unset = [];

  if (!payload.subcategory) {
    unset.push("subcategory");
  }

  if (!payload.seo?.title) {
    unset.push("seo.title");
  }

  if (!payload.seo?.description) {
    unset.push("seo.description");
  }

  const set = { ...payload };
  delete set._id;
  delete set._type;

  if (!Object.keys(payload.seo ?? {}).length) {
    delete set.seo;
  }

  if (!payload.subcategory) {
    delete set.subcategory;
  }

  return {
    documentId,
    set,
    unset,
  };
}

function isManagedImportProductDocument(product) {
  return normalizeText(product?._id).startsWith("import-product-");
}

function shouldApplyPlaceholderImages(product, placeholderAssetRef) {
  if (!isManagedImportProductDocument(product)) {
    return false;
  }

  const images = Array.isArray(product?.images) ? product.images : [];

  if (images.length === 0) {
    return true;
  }

  if (hasRealManagedImages(product, placeholderAssetRef)) {
    return false;
  }

  if (hasOnlyPlaceholderImages(product, placeholderAssetRef)) {
    return false;
  }

  return true;
}

async function applyPlaceholderImagesToManagedProducts({
  sanityWriteClient,
  requestedProducts,
  existingProductsBySlug,
  placeholderAssetRef,
}) {
  let placeholderImagesPatched = 0;
  const patchedProducts = [];

  for (const product of requestedProducts) {
    if (product.classification === "create" || product.classification === "blocked") {
      continue;
    }

    const existingMatches = existingProductsBySlug.get(product.slug) ?? [];
    const existing = existingMatches[0];

    if (!existing || !shouldApplyPlaceholderImages(existing, placeholderAssetRef)) {
      continue;
    }

    await sanityWriteClient
      .patch(existing._id)
      .set({ images: buildPlaceholderImageDocument(placeholderAssetRef) })
      .commit();

    placeholderImagesPatched += 1;
    patchedProducts.push({
      slug: product.slug,
      documentId: existing._id,
    });
  }

  return {
    placeholderImagesPatched,
    patchedProducts,
  };
}

function buildExistingProductIndex(sanityProducts) {
  const bySlug = new Map();

  for (const product of sanityProducts) {
    const slug = normalizeText(product.slug?.current ?? product.slug ?? "");
    if (!slug) {
      continue;
    }

    if (!bySlug.has(slug)) {
      bySlug.set(slug, []);
    }
    bySlug.get(slug).push(product);
  }

  return bySlug;
}

function hydratePlannedCategoryState(categoryByPath, plannedCreateNodes, { mutateState }) {
  const diagnostics = [];

  for (const node of plannedCreateNodes) {
    const parentPath = node.parentPath ? normalizeText(node.parentPath) : "";
    const parentId = parentPath ? resolveCategoryDocumentId(categoryByPath, parentPath) : null;
    const plannedDocumentId = buildCategoryDocumentId(node);

    if (parentPath && !parentId) {
      diagnostics.push({
        path: node.path,
        status: "dependency-error",
        resolvedParentId: null,
        plannedDocumentId,
        parentPath,
      });
      continue;
    }

    diagnostics.push({
      path: node.path,
      status: "planned-create",
      resolvedParentId: parentId,
      plannedDocumentId,
      parentPath,
    });

    if (mutateState) {
      categoryByPath.set(node.path, {
        id: plannedDocumentId,
        type: node.type,
        parentId,
        path: node.path,
        status: "planned-create",
      });
    }
  }

  return diagnostics;
}

function sortImportableProducts(products) {
  return sortByStableKey(products, (product) => {
    const firstRow = product.rowNumbers?.[0] ?? Number.MAX_SAFE_INTEGER;
    return `${String(firstRow).padStart(8, "0")}|${product.slug}`;
  });
}

function selectWriteProducts(products, { limit, slugs }) {
  const importableProducts = products.filter(
    (product) => product.classification === "create" || product.classification === "update",
  );
  const importableBySlug = new Map(importableProducts.map((product) => [product.slug, product]));

  if (slugs.length > 0) {
    const requestedProducts = [];
    const seen = new Set();

    for (const slug of slugs) {
      if (seen.has(slug)) {
        continue;
      }

      seen.add(slug);
      const product = importableBySlug.get(slug) ?? products.find((item) => item.slug === slug) ?? null;

      if (product) {
        requestedProducts.push(product);
      }
    }

    const missingSlugs = slugs.filter(
      (slug) => !requestedProducts.some((product) => product.slug === slug),
    );
    const blockedSelected = requestedProducts.filter((product) => product.classification === "blocked");
    const skippedSelected = requestedProducts.filter((product) => product.classification === "skip");
    const importableSelected = requestedProducts.filter(
      (product) => product.classification === "create" || product.classification === "update",
    );

    return {
      requestedProducts,
      selectedProducts: importableSelected,
      blockedSelected,
      skippedSelected,
      missingSlugs,
      effectiveLimit: null,
      mode: "slugs",
    };
  }

  const sortedImportable = sortImportableProducts(importableProducts);
  const selectedProducts =
    typeof limit === "number" ? sortedImportable.slice(0, limit) : sortedImportable;

  return {
    requestedProducts: selectedProducts,
    selectedProducts,
    blockedSelected: [],
    skippedSelected: [],
    missingSlugs: [],
    effectiveLimit: typeof limit === "number" ? limit : null,
    mode: "limit",
  };
}

function printWritePlan(result) {
  console.log("Tiendanube import");
  console.log(`Selected products: ${formatNumber(result.selectedProducts.length)}`);
  console.log(`Categories required: ${formatNumber(result.categoriesRequired)}`);
  console.log(`Products to create: ${formatNumber(result.productsToCreate)}`);
  console.log(`Products to update: ${formatNumber(result.productsToUpdate)}`);
  console.log(`Blocked selected: ${formatNumber(result.blockedSelected.length)}`);
  if (result.skippedSelected.length > 0) {
    console.log(`Skipped selected: ${formatNumber(result.skippedSelected.length)}`);
  }
  console.log("");
}

function buildCategoryDiagnostics(categoryByPath, plannedCategoryDiagnostics) {
  const diagnostics = [];

  for (const [path, entry] of categoryByPath.entries()) {
    diagnostics.push({
      path,
      raw: path,
      status: entry.status,
      resolvedParentId: entry.parentId ?? null,
      resolvedDocumentId: entry.id ?? null,
    });
  }

  for (const planned of plannedCategoryDiagnostics) {
    diagnostics.push({
      path: planned.path,
      raw: planned.path,
      status: planned.status,
      resolvedParentId: planned.resolvedParentId,
      resolvedDocumentId: planned.plannedDocumentId,
      parentPath: planned.parentPath,
    });
  }

  return sortByStableKey(diagnostics, (item) => item.path);
}

function buildProductDiagnostics(selectedProducts, categoryByPath) {
  return sortByStableKey(selectedProducts, (product) => product.slug).map((product) => ({
    slug: product.slug,
    primaryCategoryPath: product.primaryCategoryPath?.slug ?? null,
    resolvedCategoryId: resolveCategoryDocumentId(categoryByPath, product.primaryCategoryPath?.slugSegments?.[0] ?? ""),
    resolvedSubcategoryId:
      product.primaryCategoryPath && product.primaryCategoryPath.depth > 1
        ? resolveCategoryDocumentId(categoryByPath, product.primaryCategoryPath.slug)
        : null,
  }));
}

function printWriteDiagnostics(result) {
  const selectedProducts = result.selectedProducts ?? [];
  const blockedSelected = result.blockedSelected ?? [];
  const categoryDiagnostics = result.categoryDiagnostics ?? [];
  const productDiagnostics = result.productDiagnostics ?? [];

  console.log("Tiendanube import diagnostics");
  console.log(`Selected products: ${formatNumber(selectedProducts.length)}`);
  console.log(`Categories required: ${formatNumber(result.categoriesRequired ?? 0)}`);
  console.log(`Products to create: ${formatNumber(result.productsToCreate ?? 0)}`);
  console.log(`Products to update: ${formatNumber(result.productsToUpdate ?? 0)}`);
  console.log(`Blocked selected: ${formatNumber(blockedSelected.length)}`);
  console.log(`Skipped selected: ${formatNumber((result.skippedSelected ?? []).length)}`);
  console.log("");

  console.log("Categories");
  for (const category of categoryDiagnostics) {
    console.log(
      `- Category path: ${category.path} | Status: ${category.status} | Resolved parent ID: ${category.resolvedParentId ?? "none"} | Resolved document ID: ${category.resolvedDocumentId ?? "none"}`,
    );
  }

  console.log("");
  console.log("Products");
  for (const product of productDiagnostics) {
    console.log(
      `- ${product.slug} | primaryCategoryPath: ${product.primaryCategoryPath ?? "none"} | resolved categoryId: ${product.resolvedCategoryId ?? "none"} | resolved subcategoryId: ${product.resolvedSubcategoryId ?? "none"}`,
    );
  }
}

function printWriteSummary(result) {
  console.log("Tiendanube import");
  console.log(`Productos procesados: ${formatNumber(result.productsProcessed)}`);
  console.log(`Productos restantes: ${formatNumber(result.productsRemaining)}`);
  console.log(`Categorias creadas: ${formatNumber(result.categoriesCreated)}`);
  console.log(`Productos creados: ${formatNumber(result.productsCreated)}`);
  console.log(`Productos actualizados: ${formatNumber(result.productsUpdated)}`);
  console.log(`Placeholder images patched: ${formatNumber(result.placeholderImagesPatched ?? 0)}`);
  console.log(`Placeholder asset ref: ${result.placeholderImageAssetRef ?? "none"}`);
  console.log(`Errores: ${formatNumber(result.errors.length)}`);
  console.log(`Escrituras realizadas: ${formatNumber(result.writesPerformed)}`);

  if (result.errors.length > 0) {
    console.log("");
    console.log("Primeros errores:");
    for (const error of result.errors.slice(0, 10)) {
      console.log(`- ${error}`);
    }
  }
}

async function fetchSanityCategoryTree(client) {
  return client.fetch(SANITY_CATEGORY_TREE_QUERY);
}

async function fetchSanityProductsBySlugs(client, slugs) {
  const uniqueSlugs = [...new Set(slugs)].filter(Boolean);
  const batchSize = 100;
  const results = [];

  for (let index = 0; index < uniqueSlugs.length; index += batchSize) {
    const batch = uniqueSlugs.slice(index, index + batchSize);
    const items = await client.fetch(SANITY_PRODUCTS_BY_SLUGS_QUERY, { slugs: batch });
    results.push(...items);
  }

  return results;
}

function slugPathKey(pathSegments) {
  return pathSegments.join("/");
}

function buildCategoryTreeIndex(categories) {
  const roots = categories.map((category) => normalizeSanityCategoryNode(category));
  const rootBySlug = new Map();
  const pathIndex = new Map();

  function registerNode(node, pathSegments) {
    const key = slugPathKey(pathSegments);
    if (!pathIndex.has(key)) {
      pathIndex.set(key, []);
    }
    pathIndex.get(key).push(node);
  }

  function visit(node, parentPathSegments = []) {
    const pathSegments = [...parentPathSegments, node.slug];
    registerNode(node, pathSegments);

    for (const child of node.children) {
      visit(child, pathSegments);
    }
  }

  for (const root of roots) {
    if (!rootBySlug.has(root.slug)) {
      rootBySlug.set(root.slug, []);
    }
    rootBySlug.get(root.slug).push(root);
    visit(root);
  }

  return {
    roots,
    rootBySlug,
    pathIndex,
  };
}

function normalizeSanityCategoryNode(node) {
  return {
    id: node._id,
    type: node._type,
    title: node.title,
    slug: normalizeText(node.slug?.current ?? ""),
    description: node.description,
    order: typeof node.order === "number" ? node.order : null,
    children: (node.subcategories ?? []).map((child) => normalizeSanityCategoryNode(child)),
  };
}

function getSanityCategoryChildren(node) {
  return node?.children ?? [];
}

function resolveCategoryPathAgainstTree(path, treeIndex) {
  const result = {
    ...path,
    status: "invalid",
    reusableNodes: [],
    missingNodes: [],
    conflictReason: null,
    resolvedNodeId: null,
    categorySlug: path.slugSegments[0] ?? null,
    subcategorySlug: path.slugSegments.length > 1 ? path.slugSegments[path.slugSegments.length - 1] : null,
    fullPath: slugPathKey(path.slugSegments),
  };

  if (path.depth < 1 || path.depth > 3) {
    result.conflictReason = "La ruta debe tener entre 1 y 3 niveles.";
    return result;
  }

  if (path.slugSegments.some((segment) => !segment)) {
    result.conflictReason = "La ruta contiene segmentos vacios o invalidos.";
    return result;
  }

  let currentCandidates = treeIndex.roots;
  let currentNode = null;

  for (let index = 0; index < path.slugSegments.length; index += 1) {
    const segment = path.slugSegments[index];
    const matches = currentCandidates.filter((candidate) => candidate.slug === segment);

    if (matches.length > 1) {
      result.status = "conflict";
      result.conflictReason = `El segmento "${segment}" es ambiguo dentro de la jerarquia existente de Sanity.`;
      return result;
    }

    if (matches.length === 0) {
      result.status = "planned-create";
      for (let missingIndex = index; missingIndex < path.slugSegments.length; missingIndex += 1) {
        result.missingNodes.push({
          depth: missingIndex + 1,
          slug: path.slugSegments[missingIndex],
          title: path.segments[missingIndex],
        });
      }
      result.resolvedNodeId = currentNode ? currentNode.id : null;
      return result;
    }

    currentNode = matches[0];
    result.reusableNodes.push(currentNode);
    currentCandidates = getSanityCategoryChildren(currentNode);
  }

  result.status = "reusable";
  result.resolvedNodeId = currentNode ? currentNode.id : null;
  return result;
}

function choosePrimaryCategoryResolution(resolutions) {
  const validResolutions = resolutions.filter(
    (resolution) => resolution.status === "reusable" || resolution.status === "planned-create",
  );

  if (validResolutions.length === 0) {
    return null;
  }

  return validResolutions
    .map((resolution, index) => ({ resolution, index }))
    .sort((left, right) => {
      if (right.resolution.depth !== left.resolution.depth) {
        return right.resolution.depth - left.resolution.depth;
      }

      return left.index - right.index;
    })[0].resolution;
}

function normalizeHtmlEntities(value) {
  const entityMap = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
    iexcl: "¡",
    cent: "¢",
    pound: "£",
    curren: "¤",
    yen: "¥",
    brvbar: "¦",
    sect: "§",
    uml: "¨",
    copy: "©",
    ordf: "ª",
    laquo: "«",
    not: "¬",
    shy: "\u00ad",
    reg: "®",
    macr: "¯",
    deg: "°",
    plusmn: "±",
    sup2: "²",
    sup3: "³",
    acute: "´",
    micro: "µ",
    para: "¶",
    middot: "·",
    cedil: "¸",
    sup1: "¹",
    ordm: "º",
    raquo: "»",
    frac14: "¼",
    frac12: "½",
    frac34: "¾",
    iquest: "¿",
    agrave: "à",
    aacute: "á",
    acirc: "â",
    atilde: "ã",
    auml: "ä",
    aring: "å",
    aelig: "æ",
    ccedil: "ç",
    egrave: "è",
    eacute: "é",
    ecirc: "ê",
    euml: "ë",
    igrave: "ì",
    iacute: "í",
    icirc: "î",
    iuml: "ï",
    eth: "ð",
    ntilde: "ñ",
    ograve: "ò",
    oacute: "ó",
    ocirc: "ô",
    otilde: "õ",
    ouml: "ö",
    divide: "÷",
    oslash: "ø",
    ugrave: "ù",
    uacute: "ú",
    ucirc: "û",
    uuml: "ü",
    yacute: "ý",
    thorn: "þ",
    yuml: "ÿ",
    Aacute: "Á",
    Eacute: "É",
    Iacute: "Í",
    Oacute: "Ó",
    Uacute: "Ú",
    Ntilde: "Ñ",
  };

  return String(value ?? "").replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity) => {
    if (entity.startsWith("#x")) {
      const codePoint = Number.parseInt(entity.slice(2), 16);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }

    if (entity.startsWith("#")) {
      const codePoint = Number.parseInt(entity.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }

    return entityMap[entity] ?? match;
  });
}

function decodeHtmlToText(value) {
  return normalizeHtmlEntities(value)
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
}

function tokenizeHtml(value) {
  return String(value ?? "").match(/<!--[\s\S]*?-->|<[^>]+>|[^<]+/g) ?? [];
}

function parseHtmlTag(token) {
  const closing = /^<\s*\//.test(token);
  const selfClosing = /\/\s*>$/.test(token);
  const match = token.match(/^<\s*\/?\s*([a-zA-Z0-9]+)([\s\S]*?)\/?\s*>$/);

  if (!match) {
    return null;
  }

  const [, rawName, rawAttributes] = match;
  const name = rawName.toLowerCase();
  const attributes = {};

  rawAttributes.replace(
    /([a-zA-Z0-9:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g,
    (_full, key, doubleQuoted, singleQuoted, bareValue) => {
      attributes[key.toLowerCase()] = doubleQuoted ?? singleQuoted ?? bareValue ?? "";
      return "";
    },
  );

  return {
    name,
    closing,
    selfClosing,
    attributes,
  };
}

function htmlToPortableText(html, fallbackText = "") {
  const tokens = tokenizeHtml(html);
  const blocks = [];
  const warnings = [];
  const unsupportedTags = new Set();
  let currentBlock = null;
  let inlineMarks = [];
  let listStack = [];
  let linkCounter = 0;
  let blockCounter = 0;

  function nextKey(prefix) {
    blockCounter += 1;
    return `${prefix}-${blockCounter}`;
  }

  function ensureBlock(options = {}) {
    if (currentBlock) {
      return currentBlock;
    }

    currentBlock = {
      _type: "block",
      _key: nextKey("block"),
      style: options.style ?? "normal",
      listItem: options.listItem,
      level: options.level,
      markDefs: [],
      children: [],
    };

    return currentBlock;
  }

  function flushBlock() {
    if (!currentBlock) {
      return;
    }

    const hasContent = currentBlock.children.some(
      (child) => child._type === "span" && normalizeText(child.text) !== "",
    );

    if (hasContent) {
      blocks.push(currentBlock);
    }

    currentBlock = null;
    inlineMarks = [];
  }

  function addText(text) {
    const decodedText = normalizeHtmlEntities(text);
    const normalizedText = decodedText.replace(/\s+/g, " ");

    if (!normalizedText.trim()) {
      if (currentBlock && currentBlock.children.length > 0) {
        const lastChild = currentBlock.children[currentBlock.children.length - 1];
        if (lastChild?._type === "span") {
          lastChild.text += " ";
        }
      }
      return;
    }

    ensureBlock();

    const marks = [...inlineMarks];
    const lastChild = currentBlock.children[currentBlock.children.length - 1];

    if (lastChild?._type === "span" && JSON.stringify(lastChild.marks) === JSON.stringify(marks)) {
      lastChild.text += normalizedText;
      return;
    }

    currentBlock.children.push({
      _type: "span",
      _key: nextKey("span"),
      text: normalizedText,
      marks,
    });
  }

  function pushMark(mark) {
    inlineMarks.push(mark);
  }

  function popMark(mark) {
    for (let index = inlineMarks.length - 1; index >= 0; index -= 1) {
      if (inlineMarks[index] === mark) {
        inlineMarks.splice(index, 1);
        return;
      }
    }
  }

  function addLinkMark(href) {
    if (!currentBlock) {
      ensureBlock();
    }

    const key = `link-${++linkCounter}`;
    currentBlock.markDefs.push({
      _key: key,
      _type: "link",
      href,
    });
    return key;
  }

  for (const token of tokens) {
    if (token.startsWith("<!--")) {
      continue;
    }

    if (token.startsWith("<")) {
      const tag = parseHtmlTag(token);

      if (!tag) {
        continue;
      }

      const { name, closing, attributes } = tag;

      if (name === "strong" || name === "b") {
        if (closing) {
          popMark("strong");
        } else {
          pushMark("strong");
        }
        continue;
      }

      if (name === "em" || name === "i") {
        if (closing) {
          popMark("em");
        } else {
          pushMark("em");
        }
        continue;
      }

      if (name === "a") {
        if (closing) {
          const mark = inlineMarks.find((value) => typeof value === "string" && value.startsWith("link-"));
          if (mark) {
            popMark(mark);
          }
        } else {
          const href = attributes.href ?? "";
          if (href) {
            const mark = addLinkMark(href);
            pushMark(mark);
          }
        }
        continue;
      }

      if (name === "br") {
        addText("\n");
        continue;
      }

      if (name === "p" || name === "div" || name === "section" || name === "article") {
        if (!closing) {
          flushBlock();
          ensureBlock();
        } else {
          flushBlock();
        }
        continue;
      }

      if (name === "ul" || name === "ol") {
        if (!closing) {
          listStack.push(name);
        } else {
          listStack.pop();
          flushBlock();
        }
        continue;
      }

      if (name === "li") {
        if (closing) {
          flushBlock();
        } else {
          flushBlock();
          ensureBlock({
            listItem: listStack[listStack.length - 1] === "ol" ? "number" : "bullet",
            level: listStack.length || 1,
          });
        }
        continue;
      }

      if (name === "h1" || name === "h2" || name === "h3" || name === "h4" || name === "h5" || name === "h6") {
        if (!closing) {
          flushBlock();
          ensureBlock({ style: "h2" });
        } else {
          flushBlock();
        }
        continue;
      }

      unsupportedTags.add(name);
      if (closing && (name === "table" || name === "tr" || name === "td" || name === "th")) {
        flushBlock();
      }
      continue;
    }

    addText(token);
  }

  flushBlock();

  const plainText = blocks
    .map((block) =>
      block.children
        .map((child) => (child._type === "span" ? child.text : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean)
    .join("\n");

  const paragraphs = plainText
    .split(/\n+/)
    .map((value) => value.trim())
    .filter(Boolean);
  const firstParagraph = paragraphs[0] ?? "";
  const shortDescription =
    firstParagraph || normalizeText(decodeHtmlToText(fallbackText)) || "";

  if (unsupportedTags.size > 0) {
    warnings.push(`HTML con etiquetas no soportadas: ${[...unsupportedTags].join(", ")}.`);
  }

  return {
    blocks,
    plainText,
    shortDescription,
    warnings,
  };
}

function normalizeActiveState(product) {
  if (typeof product.sourceShowInStore === "boolean") {
    return product.sourceShowInStore;
  }

  const visibility = normalizeText(product.sourceVisibility).toLowerCase();

  if (visibility === "si" || visibility === "visible" || visibility === "true" || visibility === "1") {
    return true;
  }

  if (visibility === "no" || visibility === "oculto" || visibility === "false" || visibility === "0") {
    return false;
  }

  return true;
}

function normalizeVariantAttributesForComparison(attributes, fallbackAttributeName) {
  const normalizedAttributes = (attributes ?? [])
    .map((attribute) => ({
      name: normalizeText(attribute?.name),
      value: normalizeText(attribute?.value),
    }))
    .filter((attribute) => attribute.name && attribute.value)
    .sort((left, right) => {
      const leftOrder = ALLOWED_VARIANT_ATTRIBUTE_NAMES.indexOf(left.name);
      const rightOrder = ALLOWED_VARIANT_ATTRIBUTE_NAMES.indexOf(right.name);

      if (leftOrder !== rightOrder) {
        return (leftOrder === -1 ? Number.MAX_SAFE_INTEGER : leftOrder) -
          (rightOrder === -1 ? Number.MAX_SAFE_INTEGER : rightOrder);
      }

      return left.name.localeCompare(right.name) || left.value.localeCompare(right.value);
    });

  if (normalizedAttributes.length > 0) {
    return normalizedAttributes;
  }

  if (fallbackAttributeName) {
    return [
      {
        name: fallbackAttributeName,
        value: "",
      },
    ].filter((attribute) => attribute.value);
  }

  return [];
}

function normalizeProductVariantRecord(variant, fallbackProduct, options = {}) {
  const isLegacy = options.legacy === true;
  const title = normalizeText(variant.title);
  const value = normalizeText(variant.value) || (isLegacy ? title : "");
  const attributes = isLegacy
    ? normalizeVariantAttributesForComparison([{ name: "Color", value }])
    : normalizeVariantAttributesForComparison(variant.attributes);
  const basePrice =
    typeof variant.basePrice === "number" ? variant.basePrice : fallbackProduct.basePrice ?? null;
  const stock =
    typeof variant.stock === "number" ? variant.stock : fallbackProduct.stock ?? 0;

  return {
    id: normalizeText(variant._key) || value || title,
    title,
    value,
    attributes,
    basePrice,
    stock,
  };
}

function normalizeSanityProductVariants(product) {
  const hasGenericVariants = (product.variants ?? []).length > 0;

  if (hasGenericVariants) {
    return (product.variants ?? [])
      .filter((variant) => normalizeText(variant.value) && variant.isActive !== false)
      .map((variant) =>
        normalizeProductVariantRecord(
          variant,
          {
            basePrice: product.basePrice,
            stock: product.stock,
          },
          { legacy: false },
        ),
      )
      .sort((left, right) => left.value.localeCompare(right.value));
  }

  return (product.colorVariants ?? [])
    .map((variant) =>
      normalizeProductVariantRecord(
        variant,
        {
          basePrice: product.basePrice,
          stock: product.stock,
        },
        { legacy: true },
      ),
    )
    .sort((left, right) => left.value.localeCompare(right.value));
}

function normalizeImportedProductVariants(product) {
  if (product.simpleProduct) {
    return [];
  }

  return [...product.variants]
    .map((variant) => ({
      id: normalizeText(variant.signature) || normalizeText(variant.value),
      title: normalizeText(variant.label) || normalizeText(variant.value),
      value: normalizeText(variant.value),
      attributes: normalizeVariantAttributesForComparison(variant.attributes),
      basePrice: typeof variant.basePrice === "number" ? variant.basePrice : product.basePrice ?? null,
      stock: typeof variant.stock === "number" ? variant.stock : product.stock ?? 0,
    }))
    .sort((left, right) => left.value.localeCompare(right.value));
}

function normalizeProductSnapshot(product, categoryResolution) {
  return {
    title: normalizeText(product.title),
    shortDescription: normalizeText(product.shortDescription ?? product.sourceSeoDescription ?? ""),
    descriptionText: normalizeText(product.descriptionText ?? ""),
    basePrice: typeof product.basePrice === "number" ? product.basePrice : null,
    stock: typeof product.stock === "number" ? product.stock : 0,
    isActive: normalizeActiveState(product),
    seoTitle: normalizeText(product.seoTitle ?? ""),
    seoDescription: normalizeText(product.seoDescription ?? ""),
    categorySlug: categoryResolution?.categorySlug ?? "",
    subcategorySlug: categoryResolution?.subcategorySlug ?? null,
    variants: normalizeImportedProductVariants(product),
  };
}

function normalizeExistingProductSnapshot(product) {
  return {
    title: normalizeText(product.title),
    shortDescription: normalizeText(product.shortDescription ?? ""),
    descriptionText: normalizeText(product.descriptionText ?? ""),
    basePrice: typeof product.basePrice === "number" ? product.basePrice : null,
    stock: typeof product.stock === "number" ? product.stock : 0,
    isActive: product.isActive !== false,
    seoTitle: normalizeText(product.seo?.title ?? ""),
    seoDescription: normalizeText(product.seo?.description ?? ""),
    categorySlug: normalizeText(product.category?.slug?.current ?? ""),
    subcategorySlug: normalizeText(product.subcategory?.slug?.current ?? "") || null,
    variants: normalizeSanityProductVariants(product),
  };
}

function areSnapshotsEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

const MANAGED_PRODUCT_SNAPSHOT_FIELDS = [
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

function buildManagedSnapshotDiff(importedSnapshot, existingSnapshot) {
  const diff = {};

  for (const field of MANAGED_PRODUCT_SNAPSHOT_FIELDS) {
    const importedValue = importedSnapshot?.[field];
    const existingValue = existingSnapshot?.[field];

    if (JSON.stringify(importedValue) === JSON.stringify(existingValue)) {
      continue;
    }

    diff[field] = {
      old: existingValue ?? null,
      new: importedValue ?? null,
    };
  }

  return diff;
}

function classifyProduct(product, categoryResolution, existingMatches) {
  const reasons = [];
  const warnings = [...product.warnings];

  if (!normalizeText(product.title)) {
    reasons.push("Falta el título.");
  }

  if (categoryResolution.status === "invalid") {
    reasons.push("La categoría es inválida.");
  }

  if (categoryResolution.status === "conflict") {
    reasons.push(categoryResolution.conflictReason || "La categoría es ambigua.");
  }

  if (!categoryResolution || (!categoryResolution.resolvedNodeId && categoryResolution.status === "planned-create" && !categoryResolution.slugSegments.length)) {
    reasons.push("No se pudo resolver la categoría.");
  }

  if (existingMatches.length > 1) {
    reasons.push(`Existe más de un producto en Sanity con el slug "${product.slug}".`);
  }

  if (reasons.length > 0) {
    return {
      classification: "blocked",
      reasons,
      warnings,
    };
  }

  if (existingMatches.length === 0) {
    return {
      classification: "create",
      reasons: ["No existe un producto publicado con este slug en Sanity."],
      warnings,
    };
  }

  const current = existingMatches[0];
  const importedSnapshot = normalizeProductSnapshot(product, categoryResolution);
  const existingSnapshot = normalizeExistingProductSnapshot(current);
  const managedDiff = buildManagedSnapshotDiff(importedSnapshot, existingSnapshot);

  if (areSnapshotsEqual(importedSnapshot, existingSnapshot)) {
    return {
      classification: "skip",
      reasons: ["El contenido gestionado coincide con el contenido actual de Sanity."],
      warnings,
      importedSnapshot,
      existingSnapshot,
      managedDiff,
    };
  }

  return {
    classification: "update",
    reasons: ["El contenido gestionado difiere del contenido actual de Sanity."],
    warnings,
    importedSnapshot,
    existingSnapshot,
    managedDiff,
  };
}

function enrichProductsWithSanity(normalizedProducts, sanityTree, sanityProducts) {
  const treeIndex = buildCategoryTreeIndex(sanityTree);
  const existingBySlug = new Map();

  for (const product of sanityProducts) {
    const slug = normalizeText(product.slug?.current ?? product.slug ?? "");
    if (!slug) {
      continue;
    }

    if (!existingBySlug.has(slug)) {
      existingBySlug.set(slug, []);
    }
    existingBySlug.get(slug).push(product);
  }

  const categoryRouteStats = new Map();
  const classificationCounts = {
    create: 0,
    update: 0,
    blocked: 0,
    skip: 0,
  };
  const products = [];
  const warnings = [];
  const errors = [];

  for (const product of normalizedProducts) {
    const categoryResolutions = product.categoryPaths.map((categoryPath) =>
      resolveCategoryPathAgainstTree(categoryPath, treeIndex),
    );
    const primaryCategoryResolution = choosePrimaryCategoryResolution(categoryResolutions);
    const secondaryCategoryPaths = categoryResolutions.filter(
      (resolution) => resolution !== primaryCategoryResolution,
    );
    const existingMatches = existingBySlug.get(product.slug) ?? [];
    const description = htmlToPortableText(product.descriptionHtml, product.descriptionHtml);
    const shortDescription =
      normalizeText(description.shortDescription) ||
      normalizeText(product.seoDescription ?? "") ||
      normalizeText(product.title);
    const enrichedProduct = {
      ...product,
      descriptionPortableText: description.blocks,
      descriptionText: description.plainText,
      shortDescription,
    };
    const classification = classifyProduct(enrichedProduct, primaryCategoryResolution ?? categoryResolutions[0] ?? {
      status: "invalid",
      slugSegments: [],
      depth: 0,
      conflictReason: "No se pudo resolver ninguna ruta de categoria.",
      reusableNodes: [],
      missingNodes: [],
      resolvedNodeId: null,
    }, existingMatches);
    const categoryStatus = primaryCategoryResolution?.status ?? "invalid";

    classificationCounts[classification.classification] += 1;

    for (const resolution of categoryResolutions) {
      const key = resolution.slug;
      if (!categoryRouteStats.has(key)) {
        categoryRouteStats.set(key, {
          slug: key,
          raw: resolution.raw,
          depth: resolution.depth,
          status: resolution.status,
          reusableCount: 0,
          plannedCreateCount: 0,
          conflictCount: 0,
          invalidCount: 0,
          missingNodes: resolution.missingNodes,
          conflictReason: resolution.conflictReason,
        });
      }

      const stats = categoryRouteStats.get(key);
      stats.status = resolution.status;
      stats.missingNodes = resolution.missingNodes;
      stats.conflictReason = resolution.conflictReason;

      if (resolution.status === "reusable") {
        stats.reusableCount += 1;
      } else if (resolution.status === "planned-create") {
        stats.plannedCreateCount += 1;
      } else if (resolution.status === "conflict") {
        stats.conflictCount += 1;
      } else {
        stats.invalidCount += 1;
      }
    }

    if (product.categoryPaths.length > 1) {
      warnings.push(
        `Producto ${product.slug}: se detectaron ${product.categoryPaths.length} rutas de categoría; se eligió "${primaryCategoryResolution?.slug ?? "sin ruta"}" como principal.`,
      );
    }

    for (const resolution of categoryResolutions) {
      if (resolution.status === "conflict" || resolution.status === "invalid") {
        warnings.push(
          `Producto ${product.slug}: ruta "${resolution.raw}" => ${resolution.status}${resolution.conflictReason ? ` (${resolution.conflictReason})` : ""}.`,
        );
      }
    }

    if (description.warnings.length > 0) {
      warnings.push(...description.warnings.map((warning) => `Producto ${product.slug}: ${warning}`));
    }

    if (classification.classification === "blocked" && classification.reasons.length > 0) {
      errors.push(...classification.reasons.map((reason) => `Producto ${product.slug}: ${reason}`));
    }

    products.push({
      ...enrichedProduct,
      categoryResolutions,
      primaryCategoryPath: primaryCategoryResolution ?? null,
      secondaryCategoryPaths,
      categoryStatus,
      existingMatchesCount: existingMatches.length,
      classification: classification.classification,
      reasons: classification.reasons,
      comparisonWarnings: classification.warnings,
      importedSnapshot: classification.importedSnapshot ?? null,
      existingSnapshot: classification.existingSnapshot ?? null,
      managedDiff: classification.managedDiff ?? null,
    });
  }

  const productsWithMultipleRoutes = products.filter(
    (product) => product.categoryPaths.length > 1,
  ).length;
  const productsWithValidCategory = products.filter(
    (product) =>
      product.categoryStatus === "reusable" || product.categoryStatus === "planned-create",
  ).length;
  const reusableCategories = [...categoryRouteStats.values()].filter(
    (item) => item.status === "reusable",
  );
  const plannedCreateCategories = [...categoryRouteStats.values()].filter(
    (item) => item.status === "planned-create",
  );
  const conflictCategories = [...categoryRouteStats.values()].filter(
    (item) => item.status === "conflict",
  );
  const invalidCategories = [...categoryRouteStats.values()].filter(
    (item) => item.status === "invalid",
  );

  return {
    products,
    categoryStats: {
      reusableCategories,
      plannedCreateCategories,
      conflictCategories,
      invalidCategories,
    },
    classificationCounts,
    productsWithMultipleRoutes,
    productsWithValidCategory,
    warnings,
    errors,
  };
}

function formatNumber(value) {
  return new Intl.NumberFormat("es-AR").format(value);
}

function printReport(report, options = {}) {
  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log("Tiendanube dry-run de parseo");
  console.log(`Archivo: ${report.sourceFile}`);
  console.log(`Filas totales: ${formatNumber(report.summary.totalRows)}`);
  console.log(`Filas validas: ${formatNumber(report.summary.validRows)}`);
  console.log(`Filas invalidas: ${formatNumber(report.summary.invalidRows)}`);
  console.log(`Productos unicos: ${formatNumber(report.summary.uniqueProducts)}`);
  console.log(`Productos simples: ${formatNumber(report.summary.simpleProducts)}`);
  console.log(
    `Productos con variantes: ${formatNumber(report.summary.productsWithVariantAttributes)}`,
  );
  console.log(
    `Productos con multiples variantes: ${formatNumber(report.summary.productsWithMultipleVariants)}`,
  );
  console.log(
    `Productos con multiples rutas: ${formatNumber(report.summary.productsWithMultipleRoutes)}`,
  );
  console.log(`Variantes totales: ${formatNumber(report.summary.totalVariants)}`);
  console.log(
    `Productos con diferencias de stock entre variantes: ${formatNumber(
      report.summary.productsWithStockDifferences,
    )}`,
  );
  console.log(`Productos create: ${formatNumber(report.summary.create)}`);
  console.log(`Productos update: ${formatNumber(report.summary.update)}`);
  console.log(`Productos blocked: ${formatNumber(report.summary.blocked)}`);
  console.log(`Productos skip: ${formatNumber(report.summary.skip)}`);

  console.log("Categorias:");
  console.log(`- reusable: ${formatNumber(report.categories.reusable.length)}`);
  console.log(`- planned-create: ${formatNumber(report.categories.plannedCreate.length)}`);
  console.log(`- conflict: ${formatNumber(report.categories.conflict.length)}`);
  console.log(`- invalid: ${formatNumber(report.categories.invalid.length)}`);

  console.log("Uso de atributos:");
  for (const name of ALLOWED_VARIANT_ATTRIBUTE_NAMES) {
    console.log(`- ${name}: ${formatNumber(report.attributeUsage[name] ?? 0)}`);
  }

  console.log(`Warnings: ${formatNumber(report.warnings.length)}`);
  console.log(`Errores: ${formatNumber(report.errors.length)}`);

  if (report.warnings.length > 0) {
    console.log("");
    console.log("Primeros warnings:");
    for (const warning of report.warnings.slice(0, 10)) {
      console.log(`- ${warning}`);
    }
  }

  if (report.errors.length > 0) {
    console.log("");
    console.log("Primeros errores:");
    for (const error of report.errors.slice(0, 10)) {
      console.log(`- ${error}`);
    }
  }
}

async function executeImportWrite({
  enriched,
  sanityTree,
  sanityProducts,
  limit,
  slugs,
  diagnose,
  sourceFile,
}) {
  const selection = selectWriteProducts(enriched.products, { limit, slugs });
  const selectedProducts = selection.selectedProducts;
  const plannedCreateNodes = collectRequiredCategoryNodes(selectedProducts);
  const categoryByPath = buildCategoryResolutionState(sanityTree);
  const plannedCategoryDiagnostics = hydratePlannedCategoryState(categoryByPath, plannedCreateNodes, {
    mutateState: diagnose,
  });
  const existingProductsBySlug = buildExistingProductIndex(sanityProducts);
  const errors = [];
  const categoryErrors = [];
  const categoryWriteResults = [];
  const productWriteResults = new Map();
  const categoryDiagnostics = buildCategoryDiagnostics(categoryByPath, plannedCategoryDiagnostics);
  const productDiagnostics = buildProductDiagnostics(selectedProducts, categoryByPath);
  const executionTimestamp = new Date().toISOString();

  if (selection.mode === "slugs") {
    if (selection.missingSlugs.length > 0) {
      errors.push(`No se encontraron productos para los slugs: ${selection.missingSlugs.join(", ")}.`);
    }

    if (selection.blockedSelected.length > 0) {
      errors.push(
        `Los siguientes slugs seleccionados no se pueden importar: ${selection.blockedSelected
          .map((product) => product.slug)
          .join(", ")}.`,
      );
    }

  }

  printWritePlan({
    selectedProducts,
    categoriesRequired: plannedCreateNodes.length,
    productsToCreate: selectedProducts.filter((product) => product.classification === "create").length,
    productsToUpdate: selectedProducts.filter((product) => product.classification === "update").length,
    blockedSelected: selection.blockedSelected,
    skippedSelected: selection.skippedSelected,
  });

  if (diagnose) {
    printWriteDiagnostics({
      selectedProducts,
      categoriesRequired: plannedCreateNodes.length,
      productsToCreate: selectedProducts.filter((product) => product.classification === "create").length,
      productsToUpdate: selectedProducts.filter((product) => product.classification === "update").length,
      blockedSelected: selection.blockedSelected,
      skippedSelected: selection.skippedSelected,
      categoryDiagnostics,
      productDiagnostics,
    });

    return {
      sourceFile,
      selection,
      productsProcessed: 0,
      productsRemaining: 0,
      categoriesCreated: 0,
      productsCreated: 0,
      productsUpdated: 0,
      errors,
      writesPerformed: 0,
      categoryDiagnostics,
      productDiagnostics,
    };
  }

  if (errors.length > 0) {
    const reportWriteResult = {
      sourceFile: sourceFile ?? null,
      selection: {
        mode: selection.mode,
        limit: selection.effectiveLimit,
        requestedSlugs: (selection.requestedProducts ?? []).map((product) => product.slug),
        selectedSlugs: selectedProducts.map((product) => product.slug),
        missingSlugs: [...selection.missingSlugs],
        blockedSelected: (selection.blockedSelected ?? []).map((product) => product.slug),
        skippedSelected: (selection.skippedSelected ?? []).map((product) => product.slug),
      },
      productsProcessed: 0,
      productsRemaining: 0,
      categoriesCreated: 0,
      productsCreated: 0,
      productsUpdated: 0,
      placeholderImagesPatched: 0,
      errors,
      writesPerformed: 0,
      placeholderImageAssetRef: null,
      categoriesCreatedItems: [],
      categoryErrors,
      productResults: [...productWriteResults.values()],
    };
    const executionReport = await writeImportExecutionReport(reportWriteResult);

    return {
      ...reportWriteResult,
      reportPath: executionReport.reportPath,
    };
  }

  const sanityWriteClient = loadSanityWriteClient();
  const placeholderImageAssetRef = await resolvePlaceholderImageAssetRef(sanityWriteClient);

  let categoriesCreated = 0;
  for (const node of plannedCreateNodes) {
    const parentPath = node.parentPath ? normalizeText(node.parentPath) : "";
    const parentId = parentPath ? resolveCategoryDocumentId(categoryByPath, parentPath) : null;
    const plannedDocumentId = buildCategoryDocumentId(node);

    if (parentPath && !parentId) {
      const message = `Categoria ${node.path}: no se pudo resolver el padre real (${parentPath}). Se omite la creacion de este nodo.`;
      errors.push(message);
      categoryErrors.push(message);
      categoryWriteResults.push({
        path: node.path,
        type: node.type,
        title: node.title,
        parentPath: node.parentPath ?? null,
        parentId: parentId ?? null,
        documentId: plannedDocumentId,
        status: "error",
        error: message,
        timestamp: executionTimestamp,
      });
      continue;
    }

    try {
      const created = await sanityWriteClient.createIfNotExists(
        buildCategoryCreateDocument(node, categoryByPath),
      );
      const resolvedDocumentId = created?._id ?? plannedDocumentId;
      categoryByPath.set(node.path, {
        id: resolvedDocumentId,
        type: node.type,
        parentId,
        path: node.path,
        status: "planned-create",
      });
      categoriesCreated += 1;
      categoryWriteResults.push({
        path: node.path,
        type: node.type,
        title: node.title,
        parentPath: node.parentPath ?? null,
        parentId: parentId ?? null,
        documentId: resolvedDocumentId,
        status: "created",
        error: null,
        timestamp: executionTimestamp,
      });
    } catch (error) {
      const message = `Categoria ${node.path}: ${error?.message ?? String(error)}`;
      errors.push(message);
      categoryErrors.push(message);
      categoryWriteResults.push({
        path: node.path,
        type: node.type,
        title: node.title,
        parentPath: node.parentPath ?? null,
        parentId: parentId ?? null,
        documentId: plannedDocumentId,
        status: "error",
        error: message,
        timestamp: executionTimestamp,
      });
    }
  }

  let productsCreated = 0;
  let productsUpdated = 0;

  for (const product of selectedProducts) {
    const productDocumentId = buildProductDocumentId(product);
    const writeResult = {
      slug: product.slug,
      action: product.classification,
      plannedAction: product.classification,
      documentId: product.classification === "update" ? null : productDocumentId,
      changedFields: [],
      managedDiff: product.managedDiff ?? null,
      errors: [],
      timestamp: executionTimestamp,
      placeholderImageApplied: false,
    };
    productWriteResults.set(product.slug, writeResult);

    try {
      if (product.classification === "create") {
        const payload = buildProductWritePayload(product, categoryByPath, {
          placeholderAssetRef: placeholderImageAssetRef,
        });
        writeResult.documentId = payload._id ?? productDocumentId;
        writeResult.changedFields = Object.keys(payload).filter((field) => field !== "_id" && field !== "_type");
        await sanityWriteClient.createIfNotExists(payload);
        productsCreated += 1;
        writeResult.action = "create";
        continue;
      }

      if (product.classification === "update") {
        const existingMatches = existingProductsBySlug.get(product.slug) ?? [];
        const existing = existingMatches[0];

        if (!existing?._id) {
          throw new Error("No se encontro el documento existente para actualizar.");
        }

        const patch = buildProductUpdatePatch(product, categoryByPath, existing._id);
        writeResult.documentId = patch.documentId;
        writeResult.changedFields = [
          ...new Set([
            ...Object.keys(product.managedDiff ?? {}),
            ...(patch.unset.length > 0 ? patch.unset : []),
          ]),
        ];
        let mutation = sanityWriteClient.patch(patch.documentId).set(patch.set);

        if (patch.unset.length > 0) {
          mutation = mutation.unset(patch.unset);
        }

        await mutation.commit();
        productsUpdated += 1;
        writeResult.action = "update";
      }
    } catch (error) {
      const message = `Producto ${product.slug}: ${error?.message ?? String(error)}`;
      errors.push(message);
      writeResult.action = "error";
      writeResult.errors.push(message);
    }
  }

  const placeholderPatchResult = await applyPlaceholderImagesToManagedProducts({
    sanityWriteClient,
    requestedProducts: selection.requestedProducts,
    existingProductsBySlug,
    placeholderAssetRef: placeholderImageAssetRef,
  });

  const placeholderImagesPatched = placeholderPatchResult.placeholderImagesPatched;

  for (const patchedProduct of placeholderPatchResult.patchedProducts) {
    const entry = productWriteResults.get(patchedProduct.slug);

    if (!entry) {
      continue;
    }

    entry.changedFields = [...new Set([...(entry.changedFields ?? []), "images"])];
    entry.placeholderImageApplied = true;
    if (!entry.documentId && patchedProduct.documentId) {
      entry.documentId = patchedProduct.documentId;
    }
  }

  for (const product of selection.skippedSelected ?? []) {
    const existingMatches = existingProductsBySlug.get(product.slug) ?? [];
    const existing = existingMatches[0];
    productWriteResults.set(product.slug, {
      slug: product.slug,
      action: "skip",
      plannedAction: "skip",
      documentId: existing?._id ?? null,
      changedFields: [...new Set([...(Object.keys(product.managedDiff ?? {}))])],
      managedDiff: product.managedDiff ?? null,
      errors: [],
      timestamp: executionTimestamp,
      placeholderImageApplied: false,
    });
  }

  for (const product of selection.blockedSelected ?? []) {
    productWriteResults.set(product.slug, {
      slug: product.slug,
      action: "error",
      plannedAction: "blocked",
      documentId: null,
      changedFields: [],
      managedDiff: null,
      errors: [...(product.reasons ?? []).map((reason) => `Producto ${product.slug}: ${reason}`)],
      timestamp: executionTimestamp,
      placeholderImageApplied: false,
    });
  }

  const selectedSlugs = selectedProducts.map((product) => product.slug);
  const reportWriteResult = {
    sourceFile: sourceFile ?? null,
    selection: {
      mode: selection.mode,
      limit: selection.effectiveLimit,
      requestedSlugs: (selection.requestedProducts ?? []).map((product) => product.slug),
      selectedSlugs,
      missingSlugs: [...selection.missingSlugs],
      blockedSelected: (selection.blockedSelected ?? []).map((product) => product.slug),
      skippedSelected: (selection.skippedSelected ?? []).map((product) => product.slug),
    },
    productsProcessed: selectedProducts.length,
    productsRemaining: Math.max(
      selectedProducts.length - (productsCreated + productsUpdated + placeholderImagesPatched),
      0,
    ),
    categoriesCreated,
    productsCreated,
    productsUpdated,
    placeholderImagesPatched,
    errors,
    writesPerformed: categoriesCreated + productsCreated + productsUpdated + placeholderImagesPatched,
    placeholderImageAssetRef,
    categoriesCreatedItems: categoryWriteResults,
    categoryErrors,
    productResults: [...productWriteResults.values()],
  };

  const executionReport = await writeImportExecutionReport(reportWriteResult);

  return {
    ...reportWriteResult,
    reportPath: executionReport.reportPath,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const { filePath, json, write, diagnose, limit, slugs } = parseImportCliArgs(args);

  const buffer = await readFile(filePath);
  const text = decodeWindows1252(buffer);
  const parsed = parseCsvRows(text);
  const normalized = normalizeProducts(parsed.rows);
  const sanityClient = loadSanityReadClient();
  const [sanityTree, sanityProducts] = await Promise.all([
    fetchSanityCategoryTree(sanityClient),
    fetchSanityProductsBySlugs(
      sanityClient,
      normalized.products.map((product) => product.slug),
    ),
  ]);
  const enriched = enrichProductsWithSanity(normalized.products, sanityTree, sanityProducts);

  const report = {
    sourceFile: filePath,
    headers: parsed.headers,
    warnings: [...parsed.warnings, ...normalized.warnings, ...enriched.warnings],
    errors: [...parsed.errors, ...normalized.errors, ...enriched.errors],
    summary: {
      ...normalized.summary,
      productsWithMultipleRoutes: enriched.productsWithMultipleRoutes,
      create: enriched.classificationCounts.create,
      update: enriched.classificationCounts.update,
      blocked: enriched.classificationCounts.blocked,
      skip: enriched.classificationCounts.skip,
    },
    categories: {
      reusable: enriched.categoryStats.reusableCategories,
      plannedCreate: enriched.categoryStats.plannedCreateCategories,
      conflict: enriched.categoryStats.conflictCategories,
      invalid: enriched.categoryStats.invalidCategories,
    },
    attributeUsage: normalized.attributeUsage,
    products: enriched.products,
  };

  if (diagnose) {
    await executeImportWrite({
      enriched,
      sanityTree,
      sanityProducts,
      limit,
      slugs,
      diagnose: true,
    });
    return;
  }

  if (write) {
    const writeResult = await executeImportWrite({
      enriched,
      sanityTree,
      sanityProducts,
      limit,
      slugs,
      diagnose: false,
      sourceFile: filePath,
    });

    printWriteSummary(writeResult);
    console.log(`Reporte write: ${writeResult.reportPath ?? "none"}`);
    return;
  }

  await writeImportDryRunReports(report);
  printReport(report, { json });

  if (!json) {
    console.log("");
    console.log("El dry-run termino sin escribir nada en Sanity.");
    console.log("Sanity writes: 0");
    console.log(`Reporte JSON: ${DEFAULT_DRY_RUN_JSON_REPORT_PATH}`);
    console.log(`Reporte TXT: ${DEFAULT_DRY_RUN_TEXT_REPORT_PATH}`);
  }
}

const isMainModule =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

export {
  ALLOWED_VARIANT_ATTRIBUTE_NAMES,
  buildVariantSignature,
  canonicalizeVariantAttributeName,
  decodeWindows1252,
  normalizeHeader,
  normalizeProducts,
  parseBoolean,
  parseCategoryPaths,
  parseCsvRows,
  parseCsvText,
  parseNumber,
  parseVariantAttributes,
  printReport,
  slugify,
};

export { loadSanityReadClient, fetchSanityCategoryTree, fetchSanityProductsBySlugs, enrichProductsWithSanity, selectWriteProducts };
