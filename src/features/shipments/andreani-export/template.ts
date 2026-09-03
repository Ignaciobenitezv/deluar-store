import { readFile } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import {
  ANDREANI_BRANCH_SHEET,
  ANDREANI_CONFIG_SHEET,
  ANDREANI_HOME_DELIVERY_SHEET,
  ANDREANI_TEMPLATE_PATH,
} from "./config";
import { decodeXml } from "./xml";
import { normalizeAndreaniLookupKey } from "./normalize";
import type { AndreaniTemplateMetadata } from "./types";

type AndreaniTemplateSheetPaths = {
  homeDeliverySheetPath: string;
  branchSheetPath: string;
  configSheetPath: string;
};

type AndreaniTemplateInfo = {
  buffer: Buffer;
  sheetPaths: AndreaniTemplateSheetPaths;
  metadata: AndreaniTemplateMetadata;
};

let templateInfoPromise: Promise<AndreaniTemplateInfo> | null = null;

function normalizeZipPath(target: string) {
  return target.startsWith("/") ? target.slice(1) : target;
}

function getNamespacePrefix(xml: string, rootTag: string) {
  const match = xml.match(new RegExp(`<([A-Za-z0-9]+):${rootTag}`));

  if (!match?.[1]) {
    throw new Error(`No se pudo detectar el prefijo XML para ${rootTag}.`);
  }

  return match[1];
}

function parseSharedStrings(sharedStringsXml: string) {
  const sharedStrings: string[] = [];
  const siRegex = /<(?:\w+:)?si>([\s\S]*?)<\/(?:\w+:)?si>/g;

  for (const match of sharedStringsXml.matchAll(siRegex)) {
    const fragment = match[1] ?? "";
    const text = [...fragment.matchAll(/<(?:\w+:)?t[^>]*>([\s\S]*?)<\/(?:\w+:)?t>/g)]
      .map((textMatch) => decodeXml(textMatch[1] ?? ""))
      .join("");

    sharedStrings.push(text);
  }

  return sharedStrings;
}

function getCellText(cellXml: string, sharedStrings: string[]) {
  const typeMatch = cellXml.match(/ t="([^"]+)"/);
  const valueMatch = cellXml.match(/<(?:\w+:)?v>([\s\S]*?)<\/(?:\w+:)?v>/);

  if (typeMatch?.[1] === "s") {
    const index = Number.parseInt(valueMatch?.[1] ?? "", 10);
    return Number.isFinite(index) ? sharedStrings[index] ?? "" : "";
  }

  if (typeMatch?.[1] === "inlineStr") {
    return [...cellXml.matchAll(/<(?:\w+:)?t[^>]*>([\s\S]*?)<\/(?:\w+:)?t>/g)]
      .map((textMatch) => decodeXml(textMatch[1] ?? ""))
      .join("");
  }

  return decodeXml(valueMatch?.[1] ?? "");
}

function parseWorkbookSheetPaths(workbookXml: string, relsXml: string) {
  const sheetPrefix = getNamespacePrefix(workbookXml, "workbook");
  const sheetRegex = new RegExp(
    `<${sheetPrefix}:sheet[^>]*name="([^"]+)"[^>]*r:id="([^"]+)"[^>]*/>`,
    "g",
  );
  const relationshipRegex = /<Relationship\b[^>]*\/>/g;

  const relationships = new Map<string, string>();

  for (const match of relsXml.matchAll(relationshipRegex)) {
    const relationshipXml = match[0] ?? "";
    const attributes = new Map<string, string>();

    for (const attrMatch of relationshipXml.matchAll(/([A-Za-z0-9:]+)="([^"]*)"/g)) {
      attributes.set(attrMatch[1] ?? "", attrMatch[2] ?? "");
    }

    const id = attributes.get("Id");
    const target = attributes.get("Target");
    const type = attributes.get("Type") ?? "";

    if (!id || !target || !type.includes("worksheet")) {
      continue;
    }

    relationships.set(id, normalizeZipPath(target));
  }

  const sheets = new Map<string, string>();

  for (const match of workbookXml.matchAll(sheetRegex)) {
    const name = match[1];
    const relId = match[2];
    const target = relationships.get(relId);

    if (!name || !target) {
      continue;
    }

    sheets.set(name, target);
  }

  const homeDeliverySheetPath = sheets.get(ANDREANI_HOME_DELIVERY_SHEET);
  const branchSheetPath = sheets.get(ANDREANI_BRANCH_SHEET);
  const configSheetPath = sheets.get(ANDREANI_CONFIG_SHEET);

  if (!homeDeliverySheetPath) {
    throw new Error("La plantilla de Andreani no contiene la hoja A domicilio.");
  }

  if (!branchSheetPath) {
    throw new Error("La plantilla de Andreani no contiene la hoja A sucursal.");
  }

  if (!configSheetPath) {
    throw new Error("La plantilla de Andreani no contiene la hoja Configuracion.");
  }

  return {
    homeDeliverySheetPath,
    branchSheetPath,
    configSheetPath,
  } satisfies AndreaniTemplateSheetPaths;
}

function parseConfigLookups(configSheetXml: string, sharedStrings: string[]) {
  const prefix = getNamespacePrefix(configSheetXml, "worksheet");
  const rowRegex = new RegExp(`<${prefix}:row[^>]*r="(\\d+)"[^>]*>([\\s\\S]*?)</${prefix}:row>`, "g");
  const cellRegex = new RegExp(`<${prefix}:c[^>]*r="([A-Z]+)(\\d+)"[^>]*>([\\s\\S]*?)</${prefix}:c>`, "g");

  const locationLookup = new Map<string, string>();
  const branchLookup = new Map<string, string>();

  for (const rowMatch of configSheetXml.matchAll(rowRegex)) {
    const rowXml = rowMatch[2] ?? "";
    const cells = new Map<string, string>();

    for (const cellMatch of rowXml.matchAll(cellRegex)) {
      const column = cellMatch[1];
      const cellXml = cellMatch[0];

      if (!column) {
        continue;
      }

      cells.set(column, getCellText(cellXml, sharedStrings));
    }

    const branchName = cells.get("A");
    const location = cells.get("E");

    if (branchName) {
      branchLookup.set(normalizeAndreaniLookupKey(branchName), branchName);
    }

    if (location) {
      locationLookup.set(normalizeAndreaniLookupKey(location), location);
    }
  }

  return {
    branchLookup,
    locationLookup,
    branchCount: branchLookup.size,
    locationCount: locationLookup.size,
  };
}

async function loadAndreaniTemplateInfo(): Promise<AndreaniTemplateInfo> {
  const buffer = await readFile(path.resolve(ANDREANI_TEMPLATE_PATH));
  const zip = await JSZip.loadAsync(buffer);

  const workbookXml = await zip.file("xl/workbook.xml")?.async("string");
  const relsXml = await zip.file("xl/_rels/workbook.xml.rels")?.async("string");
  const sharedStringsXml = await zip.file("xl/sharedStrings.xml")?.async("string");

  if (!workbookXml || !relsXml || !sharedStringsXml) {
    throw new Error("La plantilla oficial de Andreani no tiene la estructura XML esperada.");
  }

  const sheetPaths = parseWorkbookSheetPaths(workbookXml, relsXml);
  const configSheetXml = await zip.file(sheetPaths.configSheetPath)?.async("string");

  if (!configSheetXml) {
    throw new Error("La plantilla de Andreani no contiene la hoja Configuracion legible.");
  }

  const sharedStrings = parseSharedStrings(sharedStringsXml);
  const lookups = parseConfigLookups(configSheetXml, sharedStrings);

  return {
    buffer,
    sheetPaths,
    metadata: {
      homeDeliverySheetName: ANDREANI_HOME_DELIVERY_SHEET,
      branchSheetName: ANDREANI_BRANCH_SHEET,
      configSheetName: ANDREANI_CONFIG_SHEET,
      locationLookup: lookups.locationLookup,
      branchLookup: lookups.branchLookup,
      locationCount: lookups.locationCount,
      branchCount: lookups.branchCount,
    },
  };
}

export async function getAndreaniTemplateInfo() {
  if (!templateInfoPromise) {
    templateInfoPromise = loadAndreaniTemplateInfo();
  }

  return templateInfoPromise;
}

export async function getAndreaniTemplateMetadata() {
  const info = await getAndreaniTemplateInfo();

  return info.metadata;
}

export async function getAndreaniTemplateBuffer() {
  const info = await getAndreaniTemplateInfo();

  return info.buffer;
}

export async function getAndreaniTemplateSheetPaths() {
  const info = await getAndreaniTemplateInfo();

  return info.sheetPaths;
}
