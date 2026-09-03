import JSZip from "jszip";
import {
  ANDREANI_BRANCH_SHEET,
  ANDREANI_HOME_DELIVERY_SHEET,
} from "./config";
import type {
  AndreaniExportWorkbookRow,
  AndreaniTemplateMetadata,
} from "./types";
import { escapeXml } from "./xml";
import { getAndreaniTemplateInfo } from "./template";

const HOME_DELIVERY_COLUMNS = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
] as const;

const BRANCH_COLUMNS = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
] as const;

function getWorksheetPrefix(xml: string) {
  const match = xml.match(/<([A-Za-z0-9]+):worksheet/);

  if (!match?.[1]) {
    throw new Error("No se pudo detectar el prefijo XML de la hoja de Andreani.");
  }

  return match[1];
}

function replaceNamespacedTag(xml: string, tagName: string, replacement: string) {
  const match = xml.match(new RegExp(`<([A-Za-z0-9]+):${tagName}>[\\s\\S]*?<\\/\\1:${tagName}>`));

  if (!match) {
    throw new Error(`La hoja de Andreani no contiene el tag ${tagName}.`);
  }

  return xml.replace(match[0], replacement);
}

function replaceDimension(xml: string, ref: string) {
  const match = xml.match(new RegExp(`<([A-Za-z0-9]+):dimension ref="[^"]*"\\s*\\/?>`));

  if (!match?.[1]) {
    throw new Error("La hoja de Andreani no contiene la dimension esperada.");
  }

  return xml.replace(match[0], `<${match[1]}:dimension ref="${ref}" />`);
}

function buildCellXml(
  prefix: string,
  column: string,
  rowNumber: number,
  value: string | number | null | undefined,
) {
  if (value === null || value === undefined) {
    return "";
  }

  const ref = `${column}${rowNumber}`;

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return "";
    }

    return `<${prefix}:c r="${ref}"><${prefix}:v>${value}</${prefix}:v></${prefix}:c>`;
  }

  const text = escapeXml(String(value));

  if (!text) {
    return "";
  }

  return `<${prefix}:c r="${ref}" t="inlineStr"><${prefix}:is><${prefix}:t>${text}</${prefix}:t></${prefix}:is></${prefix}:c>`;
}

function buildRowXml(
  prefix: string,
  rowNumber: number,
  columns: readonly string[],
  cells: AndreaniExportWorkbookRow["cells"],
) {
  const cellXml = columns
    .map((column) => buildCellXml(prefix, column, rowNumber, cells[column as keyof typeof cells]))
    .filter(Boolean)
    .join("");

  return `<${prefix}:row r="${rowNumber}" spans="1:${columns.length}">${cellXml}</${prefix}:row>`;
}

function buildSheetDataXml(
  prefix: string,
  rows: AndreaniExportWorkbookRow[],
  columns: readonly string[],
) {
  const rowXml = rows
    .map((row, index) => buildRowXml(prefix, 3 + index, columns, row.cells))
    .join("");

  return `<${prefix}:sheetData>${rowXml}</${prefix}:sheetData>`;
}

function updateWorksheetXml(
  xml: string,
  rows: AndreaniExportWorkbookRow[],
  columns: readonly string[],
) {
  const prefix = getWorksheetPrefix(xml);
  const lastRow = rows.length > 0 ? rows.length + 2 : 2;
  const dimension = `A1:${columns[columns.length - 1]}${lastRow}`;
  const sheetDataXml = buildSheetDataXml(prefix, rows, columns);

  return replaceDimension(replaceNamespacedTag(xml, "sheetData", sheetDataXml), dimension);
}

export async function buildAndreaniWorkbookBuffer(
  rowsBySheet: Record<typeof ANDREANI_HOME_DELIVERY_SHEET | typeof ANDREANI_BRANCH_SHEET, AndreaniExportWorkbookRow[]>,
  _metadata: AndreaniTemplateMetadata,
) {
  void _metadata;
  const template = await getAndreaniTemplateInfo();
  const zip = await JSZip.loadAsync(template.buffer);

  const homeSheetXml = await zip.file(template.sheetPaths.homeDeliverySheetPath)?.async("string");
  const branchSheetXml = await zip.file(template.sheetPaths.branchSheetPath)?.async("string");

  if (!homeSheetXml) {
    throw new Error("La plantilla de Andreani no contiene la hoja A domicilio.");
  }

  if (!branchSheetXml) {
    throw new Error("La plantilla de Andreani no contiene la hoja A sucursal.");
  }

  zip.file(
    template.sheetPaths.homeDeliverySheetPath,
    updateWorksheetXml(homeSheetXml, rowsBySheet[ANDREANI_HOME_DELIVERY_SHEET], HOME_DELIVERY_COLUMNS),
  );
  zip.file(
    template.sheetPaths.branchSheetPath,
    updateWorksheetXml(branchSheetXml, rowsBySheet[ANDREANI_BRANCH_SHEET], BRANCH_COLUMNS),
  );

  return zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
  });
}
