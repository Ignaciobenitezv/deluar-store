import {
  ANDREANI_BRANCH_SHEET,
  ANDREANI_HOME_DELIVERY_SHEET,
  ANDREANI_MAX_DATA_ROWS,
} from "./config";
import {
  sanitizeAndreaniText,
  sanitizeAndreaniFreeText,
  normalizeAndreaniLookupKey,
  normalizeAndreaniLocationKey,
} from "./normalize";
import type {
  AndreaniExportIssue,
  AndreaniExportPlan,
  AndreaniExportShipmentReport,
  AndreaniExportShipmentSource,
  AndreaniExportWorkbookRow,
  AndreaniTemplateMetadata,
} from "./types";
import { getAndreaniTemplateMetadata } from "./template";
import { SHIPMENT_CARRIERS, SHIPMENT_STATUSES } from "../types";
import { SHIPPING_METHODS, isPickupShippingMethod } from "@/features/shipping/shipping";

function hasPositiveNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function hasText(value: string | null | undefined) {
  return Boolean(sanitizeAndreaniText(value ?? ""));
}

function normalizeDigits(value: string | null | undefined) {
  return sanitizeAndreaniText(value ?? "").replace(/\D+/g, "");
}

function hasDigitsOnlyLike(value: string | null | undefined) {
  const sanitized = sanitizeAndreaniText(value ?? "");

  if (!sanitized) {
    return false;
  }

  if (!/^[\d\s()+-]+$/.test(sanitized)) {
    return false;
  }

  return normalizeDigits(sanitized).length > 0;
}

function makeIssue(
  shipment: AndreaniExportShipmentSource,
  field: string,
  code: string,
  message: string,
  sheetName?: AndreaniExportShipmentReport["sheetName"] | null,
): AndreaniExportIssue {
  return {
    shipmentId: shipment.shipmentId,
    orderId: shipment.orderId,
    orderNumber: shipment.orderNumber,
    field,
    code,
    message,
    sheetName: sheetName ?? null,
  };
}

function requireText(
  shipment: AndreaniExportShipmentSource,
  issues: AndreaniExportIssue[],
  value: string | null | undefined,
  field: string,
  code: string,
  message: string,
  sheetName?: AndreaniExportShipmentReport["sheetName"] | null,
) {
  if (!hasText(value)) {
    issues.push(makeIssue(shipment, field, code, message, sheetName));
  }
}

function requireDigits(
  shipment: AndreaniExportShipmentSource,
  issues: AndreaniExportIssue[],
  value: string | null | undefined,
  field: string,
  code: string,
  message: string,
  sheetName?: AndreaniExportShipmentReport["sheetName"] | null,
) {
  if (!hasDigitsOnlyLike(value)) {
    issues.push(makeIssue(shipment, field, code, message, sheetName));
  }
}

function validateParcel(
  shipment: AndreaniExportShipmentSource,
  issues: AndreaniExportIssue[],
  sheetName: AndreaniExportShipmentReport["sheetName"],
) {
  if (shipment.parcels.length === 0) {
    issues.push(
      makeIssue(
        shipment,
        "shipment.parcels",
        "PARCEL_REQUIRED",
        "El shipment debe tener al menos un bulto confirmado.",
        sheetName,
      ),
    );
    return;
  }

  if (shipment.parcels.length > 1) {
    issues.push(
      makeIssue(
        shipment,
        "shipment.parcels",
        "MULTIPLE_PARCELS_NOT_SUPPORTED",
        "La plantilla oficial se exporta en una fila por bulto y esta version bloquea shipments con mas de un bulto.",
        sheetName,
      ),
    );
    return;
  }

  const parcel = shipment.parcels[0];

  if (!hasPositiveNumber(parcel.weightGrams)) {
    issues.push(
      makeIssue(
        shipment,
        "shipment.parcels[0].weightGrams",
        "PARCEL_WEIGHT_REQUIRED",
        "El bulto debe tener peso final confirmado mayor a cero.",
        sheetName,
      ),
    );
  }

  if (!hasPositiveNumber(parcel.heightCm)) {
    issues.push(
      makeIssue(
        shipment,
        "shipment.parcels[0].heightCm",
        "PARCEL_HEIGHT_REQUIRED",
        "El bulto debe tener alto confirmado mayor a cero.",
        sheetName,
      ),
    );
  }

  if (!hasPositiveNumber(parcel.widthCm)) {
    issues.push(
      makeIssue(
        shipment,
        "shipment.parcels[0].widthCm",
        "PARCEL_WIDTH_REQUIRED",
        "El bulto debe tener ancho confirmado mayor a cero.",
        sheetName,
      ),
    );
  }

  if (!hasPositiveNumber(parcel.depthCm)) {
    issues.push(
      makeIssue(
        shipment,
        "shipment.parcels[0].depthCm",
        "PARCEL_DEPTH_REQUIRED",
        "El bulto debe tener profundidad confirmada mayor a cero.",
        sheetName,
      ),
    );
  }

  if (
    hasPositiveNumber(parcel.heightCm) &&
    hasPositiveNumber(parcel.widthCm) &&
    hasPositiveNumber(parcel.depthCm)
  ) {
    const heightCm = parcel.heightCm as number;
    const widthCm = parcel.widthCm as number;
    const depthCm = parcel.depthCm as number;

    if ((heightCm + widthCm + depthCm) < 35) {
      issues.push(
        makeIssue(
          shipment,
          "shipment.parcels[0].dimensions",
          "PARCEL_DIMENSIONS_SUM_TOO_SMALL",
          "La suma de alto, ancho y profundidad no puede ser menor a 35 cm.",
          sheetName,
        ),
      );
    }
  }
}

function validateRecipient(
  shipment: AndreaniExportShipmentSource,
  issues: AndreaniExportIssue[],
) {
  const recipient = shipment.recipient;

  requireText(shipment, issues, recipient.firstName, "recipient.firstName", "RECIPIENT_FIRST_NAME_REQUIRED", "El nombre del destinatario es obligatorio.");
  requireText(shipment, issues, recipient.lastName, "recipient.lastName", "RECIPIENT_LAST_NAME_REQUIRED", "El apellido del destinatario es obligatorio.");
  requireText(shipment, issues, recipient.dni, "recipient.dni", "RECIPIENT_DNI_REQUIRED", "El DNI del destinatario es obligatorio.");
  requireDigits(shipment, issues, recipient.dni, "recipient.dni", "RECIPIENT_DNI_INVALID", "El DNI del destinatario debe contener solo numeros.");
  requireText(shipment, issues, recipient.email, "recipient.email", "RECIPIENT_EMAIL_REQUIRED", "El email del destinatario es obligatorio.");
  requireText(shipment, issues, recipient.phone, "recipient.phone", "RECIPIENT_PHONE_REQUIRED", "El telefono del destinatario es obligatorio.");
  requireDigits(shipment, issues, recipient.phoneAreaCode, "recipient.phoneAreaCode", "RECIPIENT_PHONE_AREA_CODE_REQUIRED", "El codigo de area del destinatario es obligatorio.");
  requireDigits(shipment, issues, recipient.phoneNumber, "recipient.phoneNumber", "RECIPIENT_PHONE_NUMBER_REQUIRED", "El numero de telefono del destinatario es obligatorio.");
}

function resolveLocationValue(
  shipment: AndreaniExportShipmentSource,
  metadata: AndreaniTemplateMetadata,
) {
  const recipient = shipment.recipient;
  const normalizedKey = normalizeAndreaniLocationKey(
    recipient.province ?? "",
    recipient.city ?? "",
    recipient.postalCode ?? "",
  );

  return metadata.locationLookup.get(normalizedKey) ?? null;
}

function resolveBranchValue(
  shipment: AndreaniExportShipmentSource,
  metadata: AndreaniTemplateMetadata,
) {
  if (!shipment.branchName) {
    return null;
  }

  return metadata.branchLookup.get(normalizeAndreaniLookupKey(shipment.branchName)) ?? null;
}

function buildHomeDeliveryRow(
  shipment: AndreaniExportShipmentSource,
  metadata: AndreaniTemplateMetadata,
): AndreaniExportWorkbookRow | null {
  const parcel = shipment.parcels[0];

  if (!parcel) {
    return null;
  }

  const locationValue = resolveLocationValue(shipment, metadata);

  if (!locationValue) {
    return null;
  }

  const recipient = shipment.recipient;

  return {
    shipmentId: shipment.shipmentId,
    orderId: shipment.orderId,
    orderNumber: shipment.orderNumber,
    sheetName: ANDREANI_HOME_DELIVERY_SHEET,
    parcelId: parcel.id,
    parcelSequence: parcel.sequence,
    cells: {
      A: null,
      B: parcel.weightGrams,
      C: parcel.heightCm,
      D: parcel.widthCm,
      E: parcel.depthCm,
      F: shipment.subtotal,
      G: shipment.orderNumber,
      H: sanitizeAndreaniText(recipient.firstName),
      I: sanitizeAndreaniText(recipient.lastName),
      J: sanitizeAndreaniText(recipient.dni),
      K: sanitizeAndreaniText(recipient.email),
      L: sanitizeAndreaniText(recipient.phoneAreaCode),
      M: sanitizeAndreaniText(recipient.phoneNumber),
      N: sanitizeAndreaniText(recipient.street),
      O: sanitizeAndreaniText(recipient.streetNumber),
      P: sanitizeAndreaniText(recipient.floor ?? ""),
      Q: sanitizeAndreaniText(recipient.apartment ?? ""),
      R: locationValue,
      S: sanitizeAndreaniFreeText(recipient.notes ?? ""),
    },
  };
}

function buildBranchRow(
  shipment: AndreaniExportShipmentSource,
  metadata: AndreaniTemplateMetadata,
): AndreaniExportWorkbookRow | null {
  const parcel = shipment.parcels[0];

  if (!parcel) {
    return null;
  }

  const branchValue = resolveBranchValue(shipment, metadata);

  if (!branchValue) {
    return null;
  }

  const recipient = shipment.recipient;

  return {
    shipmentId: shipment.shipmentId,
    orderId: shipment.orderId,
    orderNumber: shipment.orderNumber,
    sheetName: ANDREANI_BRANCH_SHEET,
    parcelId: parcel.id,
    parcelSequence: parcel.sequence,
    cells: {
      A: null,
      B: parcel.weightGrams,
      C: parcel.heightCm,
      D: parcel.widthCm,
      E: parcel.depthCm,
      F: shipment.subtotal,
      G: shipment.orderNumber,
      H: sanitizeAndreaniText(recipient.firstName),
      I: sanitizeAndreaniText(recipient.lastName),
      J: sanitizeAndreaniText(recipient.dni),
      K: sanitizeAndreaniText(recipient.email),
      L: sanitizeAndreaniText(recipient.phoneAreaCode),
      M: sanitizeAndreaniText(recipient.phoneNumber),
      N: branchValue,
    },
  };
}

function validateShipmentBase(shipment: AndreaniExportShipmentSource, issues: AndreaniExportIssue[]) {
  if (shipment.carrier !== SHIPMENT_CARRIERS.ANDREANI) {
    issues.push(
      makeIssue(
        shipment,
        "shipment.carrier",
        "CARRIER_MUST_BE_ANDREANI",
        "El shipment debe tener carrier ANDREANI para exportar a esta plantilla.",
      ),
    );
  }

  if (shipment.status !== SHIPMENT_STATUSES.READY) {
    issues.push(
      makeIssue(
        shipment,
        "shipment.status",
        "SHIPMENT_NOT_READY",
        "El shipment debe estar en estado READY para exportar a Andreani.",
      ),
    );
  }

  if (isPickupShippingMethod(shipment.shippingMethod)) {
    issues.push(
      makeIssue(
        shipment,
        "shipment.shippingMethod",
        "SHIPPING_METHOD_NOT_EXPORTABLE",
        "El retiro local no se exporta a Andreani.",
      ),
    );
  }
}

function validateShipmentForPlan(
  shipment: AndreaniExportShipmentSource,
  metadata: AndreaniTemplateMetadata,
): AndreaniExportShipmentReport & { row?: AndreaniExportWorkbookRow | null } {
  const issues: AndreaniExportIssue[] = [];
  validateShipmentBase(shipment, issues);

  const sheetName =
    shipment.shippingMethod === SHIPPING_METHODS.CITY_BRANCH ? ANDREANI_BRANCH_SHEET : ANDREANI_HOME_DELIVERY_SHEET;

  validateRecipient(shipment, issues);
  validateParcel(shipment, issues, sheetName);

  if (shipment.shippingMethod === SHIPPING_METHODS.HOME_DELIVERY) {
    requireText(
      shipment,
      issues,
      shipment.recipient.street,
      "recipient.street",
      "ADDRESS_STREET_REQUIRED",
      "La calle es obligatoria para envio a domicilio.",
      ANDREANI_HOME_DELIVERY_SHEET,
    );
    requireText(
      shipment,
      issues,
      shipment.recipient.streetNumber,
      "recipient.streetNumber",
      "ADDRESS_STREET_NUMBER_REQUIRED",
      "La altura es obligatoria para envio a domicilio.",
      ANDREANI_HOME_DELIVERY_SHEET,
    );
    requireText(
      shipment,
      issues,
      shipment.recipient.city,
      "recipient.city",
      "ADDRESS_CITY_REQUIRED",
      "La localidad es obligatoria para envio a domicilio.",
      ANDREANI_HOME_DELIVERY_SHEET,
    );
    requireText(
      shipment,
      issues,
      shipment.recipient.province,
      "recipient.province",
      "ADDRESS_PROVINCE_REQUIRED",
      "La provincia es obligatoria para envio a domicilio.",
      ANDREANI_HOME_DELIVERY_SHEET,
    );
    requireText(
      shipment,
      issues,
      shipment.recipient.postalCode,
      "recipient.postalCode",
      "ADDRESS_POSTAL_CODE_REQUIRED",
      "El codigo postal es obligatorio para envio a domicilio.",
      ANDREANI_HOME_DELIVERY_SHEET,
    );

    const row = buildHomeDeliveryRow(shipment, metadata);

    if (!row) {
      issues.push(
        makeIssue(
          shipment,
          "shipment.shippingAddress",
          "ANDREANI_LOCATION_INVALID",
          "No se pudo resolver una combinacion valida de Provincia / Localidad / CP en la hoja Configuracion.",
          ANDREANI_HOME_DELIVERY_SHEET,
        ),
      );
    }

    return {
      shipmentId: shipment.shipmentId,
      orderId: shipment.orderId,
      orderNumber: shipment.orderNumber,
      shippingMethod: shipment.shippingMethod,
      carrier: shipment.carrier,
      status: shipment.status,
      sheetName: issues.length > 0 ? null : ANDREANI_HOME_DELIVERY_SHEET,
      parcelCount: shipment.parcels.length,
      exportable: issues.length === 0,
      issues,
      row: issues.length === 0 ? row : null,
    };
  }

  if (shipment.shippingMethod === SHIPPING_METHODS.CITY_BRANCH) {
    if (!hasText(shipment.branchExternalId)) {
      issues.push(
        makeIssue(
          shipment,
          "shipment.branchExternalId",
          "BRANCH_EXTERNAL_ID_REQUIRED",
          "La sucursal debe tener external ID para exportar a Andreani.",
          ANDREANI_BRANCH_SHEET,
        ),
      );
    }

    requireText(
      shipment,
      issues,
      shipment.branchName,
      "shipment.branchName",
      "BRANCH_NAME_REQUIRED",
      "La sucursal debe tener nombre para exportar a Andreani.",
      ANDREANI_BRANCH_SHEET,
    );
    requireText(
      shipment,
      issues,
      shipment.branchAddress,
      "shipment.branchAddress",
      "BRANCH_ADDRESS_REQUIRED",
      "La sucursal debe tener direccion para exportar a Andreani.",
      ANDREANI_BRANCH_SHEET,
    );
    requireText(
      shipment,
      issues,
      shipment.branchCity,
      "shipment.branchCity",
      "BRANCH_CITY_REQUIRED",
      "La sucursal debe tener localidad para exportar a Andreani.",
      ANDREANI_BRANCH_SHEET,
    );
    requireText(
      shipment,
      issues,
      shipment.branchProvince,
      "shipment.branchProvince",
      "BRANCH_PROVINCE_REQUIRED",
      "La sucursal debe tener provincia para exportar a Andreani.",
      ANDREANI_BRANCH_SHEET,
    );
    requireText(
      shipment,
      issues,
      shipment.branchPostalCode,
      "shipment.branchPostalCode",
      "BRANCH_POSTAL_CODE_REQUIRED",
      "La sucursal debe tener codigo postal para exportar a Andreani.",
      ANDREANI_BRANCH_SHEET,
    );

    const row = buildBranchRow(shipment, metadata);

    if (!row) {
      issues.push(
        makeIssue(
          shipment,
          "shipment.branchName",
          "ANDREANI_BRANCH_INVALID",
          "No se pudo resolver una sucursal valida desde la hoja Configuracion.",
          ANDREANI_BRANCH_SHEET,
        ),
      );
    }

    return {
      shipmentId: shipment.shipmentId,
      orderId: shipment.orderId,
      orderNumber: shipment.orderNumber,
      shippingMethod: shipment.shippingMethod,
      carrier: shipment.carrier,
      status: shipment.status,
      sheetName: issues.length > 0 ? null : ANDREANI_BRANCH_SHEET,
      parcelCount: shipment.parcels.length,
      exportable: issues.length === 0,
      issues,
      row: issues.length === 0 ? row : null,
    };
  }

  return {
    shipmentId: shipment.shipmentId,
    orderId: shipment.orderId,
    orderNumber: shipment.orderNumber,
    shippingMethod: shipment.shippingMethod,
    carrier: shipment.carrier,
    status: shipment.status,
    sheetName: null,
    parcelCount: shipment.parcels.length,
    exportable: false,
    issues,
    row: null,
  };
}

export async function validateAndreaniExcelExport(
  shipments: AndreaniExportShipmentSource[],
  metadata?: AndreaniTemplateMetadata,
): Promise<AndreaniExportPlan> {
  const resolvedMetadata = metadata ?? (await getAndreaniTemplateMetadata());

  const reports: Array<AndreaniExportShipmentReport & { row?: AndreaniExportWorkbookRow | null }> = shipments.map(
    (shipment) => validateShipmentForPlan(shipment, resolvedMetadata),
  );

  const rows = reports.flatMap((report) => (report.row ? [report.row] : []));
  const rowsBySheet: AndreaniExportPlan["rowsBySheet"] = {
    [ANDREANI_HOME_DELIVERY_SHEET]: rows.filter((row) => row.sheetName === ANDREANI_HOME_DELIVERY_SHEET),
    [ANDREANI_BRANCH_SHEET]: rows.filter((row) => row.sheetName === ANDREANI_BRANCH_SHEET),
  };

  const issues = reports.flatMap((report) => report.issues);
  const capacityIssues: AndreaniExportIssue[] = [];

  for (const [sheetName, sheetRows] of Object.entries(rowsBySheet) as Array<
    [keyof AndreaniExportPlan["rowsBySheet"], AndreaniExportWorkbookRow[]]
  >) {
    if (sheetRows.length > ANDREANI_MAX_DATA_ROWS) {
      capacityIssues.push({
        shipmentId: "selection",
        orderId: "selection",
        orderNumber: "selection",
        field: `selection.${sheetName}`,
        code: "ANDREANI_TEMPLATE_CAPACITY_EXCEEDED",
        message: `La plantilla solo admite ${ANDREANI_MAX_DATA_ROWS} filas por hoja y se supero el limite en ${sheetName}.`,
        sheetName,
      });
    }
  }

  const allIssues = [...issues, ...capacityIssues];

  return {
    shipments: reports.map((report) => {
      void report.row;
      const { row: _row, ...rest } = report;
      void _row;
      return rest;
    }),
    rows,
    rowsBySheet,
    issues: allIssues,
  };
}
