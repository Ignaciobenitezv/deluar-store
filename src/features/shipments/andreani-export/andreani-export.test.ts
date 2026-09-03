import assert from "node:assert/strict";
import test from "node:test";
import JSZip from "jszip";
import { getAndreaniTemplateBuffer, getAndreaniTemplateMetadata } from "./template";
import { validateAndreaniExcelExport } from "./validation";
import { buildAndreaniWorkbookBuffer } from "./workbook";
import { sanitizeAndreaniFreeText } from "./normalize";
import { SHIPMENT_CARRIERS, SHIPMENT_STATUSES } from "../types";
import { SHIPPING_METHODS } from "@/features/shipping/shipping";
import { decodeXml } from "./xml";
import { buildAndreaniFileName } from "./filename";
import { summarizeAndreaniIssues } from "./messages";

function makeShipment(overrides: Partial<ReturnType<typeof makeShipmentBase>> = {}) {
  return {
    ...makeShipmentBase(),
    ...overrides,
  };
}

function makeShipmentBase() {
  return {
    shipmentId: "shipment-1",
    orderId: "order-1",
    orderNumber: "ORD-1",
    shippingMethod: SHIPPING_METHODS.HOME_DELIVERY,
    carrier: SHIPMENT_CARRIERS.ANDREANI,
    status: SHIPMENT_STATUSES.READY,
    branchExternalId: null,
    branchCode: null,
    branchName: null,
    branchAddress: null,
    branchCity: null,
    branchProvince: null,
    branchPostalCode: null,
    subtotal: 100000,
    recipient: {
      firstName: "Juan",
      lastName: "Perez",
      dni: "12345678",
      email: "juan@example.com",
      phone: "3624123456",
      phoneAreaCode: "362",
      phoneNumber: "4123456",
      street: "San Martin",
      streetNumber: "123",
      floor: "",
      apartment: "",
      city: "11 DE SEPTIEMBRE",
      province: "BUENOS AIRES",
      postalCode: "1657",
      notes: "Entrega en porteria",
    },
    parcels: [
      {
        id: "parcel-1",
        sequence: 1,
        calculatedWeightGrams: 2000,
        weightGrams: 2000,
        heightCm: 15,
        widthCm: 15,
        depthCm: 10,
      },
    ],
  };
}

function getPrefix(xml: string) {
  const match = xml.match(/<([A-Za-z0-9]+):[A-Za-z]+/);

  if (!match?.[1]) {
    throw new Error("No se pudo detectar el prefijo XML.");
  }

  return match[1];
}

function extractCellValue(sheetXml: string, cellRef: string) {
  const prefix = getPrefix(sheetXml);
  const cellMatch = sheetXml.match(
    new RegExp(`<${prefix}:c[^>]*r="${cellRef}"[^>]*>([\\s\\S]*?)</${prefix}:c>`),
  );

  if (!cellMatch) {
    return null;
  }

  const cellXml = cellMatch[0];

  if (cellXml.includes(`t="inlineStr"`)) {
    const textMatch = cellXml.match(new RegExp(`<${prefix}:t[^>]*>([\\s\\S]*?)</${prefix}:t>`));
    return textMatch ? decodeXml(textMatch[1] ?? "") : "";
  }

  const valueMatch = cellXml.match(new RegExp(`<${prefix}:v>([\\s\\S]*?)</${prefix}:v>`));
  if (!valueMatch) {
    return null;
  }

  const numericValue = Number(valueMatch[1]);
  return Number.isFinite(numericValue) ? numericValue : decodeXml(valueMatch[1] ?? "");
}

async function loadWorkbookXml(buffer: Buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const workbookXml = await zip.file("xl/workbook.xml")?.async("string");
  const sheet1Xml = await zip.file("xl/worksheets/sheet1.xml")?.async("string");
  const sheet2Xml = await zip.file("xl/worksheets/sheet2.xml")?.async("string");
  const sheet3Xml = await zip.file("xl/worksheets/sheet3.xml")?.async("string");

  assert.ok(workbookXml);
  assert.ok(sheet1Xml);
  assert.ok(sheet2Xml);
  assert.ok(sheet3Xml);

  return {
    workbookXml,
    sheet1Xml,
    sheet2Xml,
    sheet3Xml,
  };
}

test("andreani template metadata resolves location and branch catalogs", async () => {
  const metadata = await getAndreaniTemplateMetadata();

  assert.equal(metadata.homeDeliverySheetName, "A domicilio");
  assert.equal(metadata.branchSheetName, "A sucursal");
  assert.ok(metadata.locationCount > 1000);
  assert.ok(metadata.branchCount > 1000);
});

test("valid home delivery shipment exports a row", async () => {
  const metadata = await getAndreaniTemplateMetadata();
  const plan = await validateAndreaniExcelExport([
    makeShipment({
      recipient: {
        ...makeShipmentBase().recipient,
        city: "11 DE SEPTIEMBRE",
        province: "BUENOS AIRES",
        postalCode: "1657",
      },
    }),
  ], metadata);

  assert.equal(plan.issues.length, 0);
  assert.equal(plan.rowsBySheet["A domicilio"].length, 1);
  assert.equal(plan.rowsBySheet["A sucursal"].length, 0);
  assert.equal(plan.rowsBySheet["A domicilio"][0]!.cells.R, "BUENOS AIRES / 11 DE SEPTIEMBRE / 1657");
});

test("valid branch shipment exports branch name from configuration", async () => {
  const metadata = await getAndreaniTemplateMetadata();
  const branchName = [...metadata.branchLookup.values()].find((value) => value.includes("9 DE JULIO")) ?? [...metadata.branchLookup.values()][0] ?? "9 DE JULIO";
  const plan = await validateAndreaniExcelExport([
    makeShipment({
      shipmentId: "shipment-branch",
      orderId: "order-branch",
      orderNumber: "ORD-BRANCH",
      shippingMethod: SHIPPING_METHODS.CITY_BRANCH,
      branchExternalId: "branch-123",
      branchName,
      branchAddress: "Av. Siempre Viva 123",
      branchCity: "Some City",
      branchProvince: "Some Province",
      branchPostalCode: "1000",
    }),
  ], metadata);

  assert.equal(plan.issues.length, 0);
  assert.equal(plan.rowsBySheet["A sucursal"].length, 1);
  assert.equal(plan.rowsBySheet["A sucursal"][0]!.cells.N, branchName);
});

test("pickup shipments are rejected", async () => {
  const metadata = await getAndreaniTemplateMetadata();
  const plan = await validateAndreaniExcelExport([
    makeShipment({
      shippingMethod: SHIPPING_METHODS.RESISTANCE_PICKUP,
    }),
  ], metadata);

  assert.ok(plan.issues.some((issue) => issue.code === "SHIPPING_METHOD_NOT_EXPORTABLE"));
});

test("multiple parcels are rejected", async () => {
  const metadata = await getAndreaniTemplateMetadata();
  const plan = await validateAndreaniExcelExport([
    makeShipment({
      parcels: [
        makeShipmentBase().parcels[0]!,
        {
          id: "parcel-2",
          sequence: 2,
          calculatedWeightGrams: 50,
          weightGrams: 50,
          heightCm: 5,
          widthCm: 5,
          depthCm: 5,
        },
      ],
    }),
  ], metadata);

  assert.ok(plan.issues.some((issue) => issue.code === "MULTIPLE_PARCELS_NOT_SUPPORTED"));
});

test("dimensions sum below 35 are rejected", async () => {
  const metadata = await getAndreaniTemplateMetadata();
  const plan = await validateAndreaniExcelExport([
    makeShipment({
      parcels: [
        {
          id: "parcel-1",
          sequence: 1,
          calculatedWeightGrams: 2000,
          weightGrams: 2000,
          heightCm: 10,
          widthCm: 10,
          depthCm: 10,
        },
      ],
    }),
  ], metadata);

  assert.ok(plan.issues.some((issue) => issue.code === "PARCEL_DIMENSIONS_SUM_TOO_SMALL"));
});

test("dimensions sum equal to 35 are allowed", async () => {
  const metadata = await getAndreaniTemplateMetadata();
  const plan = await validateAndreaniExcelExport([
    makeShipment({
      parcels: [
        {
          id: "parcel-1",
          sequence: 1,
          calculatedWeightGrams: 2000,
          weightGrams: 2000,
          heightCm: 15,
          widthCm: 10,
          depthCm: 10,
        },
      ],
    }),
  ], metadata);

  assert.equal(plan.issues.length, 0);
});

test("andreani file names use the official batch pattern", () => {
  const fileName = buildAndreaniFileName(new Date("2026-09-01T15:42:00Z"));

  assert.match(fileName, /^andreani-envios-2026-09-01-\d{4}\.xlsx$/);
});

test("andreani issue summaries dedupe repeated messages", () => {
  const summary = summarizeAndreaniIssues([
    {
      shipmentId: "shipment-1",
      orderId: "order-1",
      orderNumber: "ORD-1",
      field: "recipient.dni",
      code: "RECIPIENT_DNI_REQUIRED",
      message: "Falta el DNI del destinatario.",
    },
    {
      shipmentId: "shipment-1",
      orderId: "order-1",
      orderNumber: "ORD-1",
      field: "shipment.parcels[0].dimensions",
      code: "PARCEL_DIMENSIONS_SUM_TOO_SMALL",
      message: "Las medidas del bulto deben revisarse.",
    },
    {
      shipmentId: "shipment-1",
      orderId: "order-1",
      orderNumber: "ORD-1",
      field: "shipment.parcels[0].dimensions",
      code: "PARCEL_DIMENSIONS_SUM_TOO_SMALL",
      message: "Las medidas del bulto deben revisarse.",
    },
  ]);

  assert.equal(summary, "Falta el DNI del destinatario. y Las medidas del bulto deben revisarse.");
});

test("andreani free text removes invalid hyphens from observations", () => {
  const sanitized = sanitizeAndreaniFreeText("Factura E2E Santa Fe - no llamar.");

  assert.equal(sanitized, "Factura E2E Santa Fe no llamar.");
});

test("andreani workbook sanitizes observations before writing the sheet", async () => {
  const metadata = await getAndreaniTemplateMetadata();
  const plan = await validateAndreaniExcelExport([
    makeShipment({
      recipient: {
        ...makeShipmentBase().recipient,
        notes: "Factura E2E Santa Fe - no llamar.",
      },
    }),
  ], metadata);

  const buffer = await buildAndreaniWorkbookBuffer(plan.rowsBySheet, metadata);
  const generated = await loadWorkbookXml(buffer);

  assert.equal(extractCellValue(generated.sheet1Xml, "S3"), "Factura E2E Santa Fe no llamar.");
});

test("generated workbook preserves the official sheets and writes cells", async () => {
  const metadata = await getAndreaniTemplateMetadata();
  const plan = await validateAndreaniExcelExport([
    makeShipment(),
    makeShipment({
      shipmentId: "shipment-branch",
      orderId: "order-branch",
      orderNumber: "ORD-BRANCH",
      shippingMethod: SHIPPING_METHODS.CITY_BRANCH,
      branchExternalId: "branch-123",
      branchName: [...metadata.branchLookup.values()].find((value) => value.includes("9 DE JULIO")) ?? [...metadata.branchLookup.values()][0] ?? "9 DE JULIO",
      branchAddress: "Av. Siempre Viva 123",
      branchCity: "Some City",
      branchProvince: "Some Province",
      branchPostalCode: "1000",
    }),
  ], metadata);

  assert.equal(plan.issues.length, 0);
  assert.equal(plan.rowsBySheet["A domicilio"].length, 1);
  assert.equal(plan.rowsBySheet["A sucursal"].length, 1);

  const buffer = await buildAndreaniWorkbookBuffer(plan.rowsBySheet, metadata);
  const generated = await loadWorkbookXml(buffer);
  const original = await loadWorkbookXml(await getAndreaniTemplateBuffer());

  assert.ok(generated.workbookXml.includes('name="A domicilio"'));
  assert.ok(generated.workbookXml.includes('name="A sucursal"'));
  assert.ok(generated.workbookXml.includes('name="Configuracion"'));
  assert.ok(generated.sheet1Xml.includes('ref="A1:S3"'));
  assert.ok(generated.sheet2Xml.includes('ref="A1:N3"'));
  assert.equal(extractCellValue(generated.sheet1Xml, "B3"), 2000);
  assert.equal(extractCellValue(generated.sheet1Xml, "R3"), "BUENOS AIRES / 11 DE SEPTIEMBRE / 1657");
  assert.equal(extractCellValue(generated.sheet1Xml, "S3"), "Entrega en porteria");
  assert.equal(extractCellValue(generated.sheet2Xml, "N3"), [...metadata.branchLookup.values()].find((value) => value.includes("9 DE JULIO")) ?? [...metadata.branchLookup.values()][0] ?? "9 DE JULIO");
  assert.equal(generated.sheet3Xml, original.sheet3Xml);
});
