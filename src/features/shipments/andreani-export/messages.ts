import type { AndreaniExportIssue } from "./types";

const ISSUE_MESSAGES: Record<string, string> = {
  CARRIER_MUST_BE_ANDREANI: "El transporte debe ser Andreani.",
  SHIPMENT_NOT_READY: "El envío todavía no está listo.",
  SHIPPING_METHOD_NOT_EXPORTABLE: "El retiro local no se exporta a Andreani.",
  PARCEL_REQUIRED: "Falta confirmar un bulto.",
  MULTIPLE_PARCELS_NOT_SUPPORTED: "Este pedido todavía no se exporta con más de un bulto.",
  PARCEL_WEIGHT_REQUIRED: "Falta confirmar el peso del bulto.",
  PARCEL_HEIGHT_REQUIRED: "Falta confirmar el alto del bulto.",
  PARCEL_WIDTH_REQUIRED: "Falta confirmar el ancho del bulto.",
  PARCEL_DEPTH_REQUIRED: "Falta confirmar la profundidad del bulto.",
  PARCEL_DIMENSIONS_SUM_TOO_SMALL: "Las medidas del bulto deben revisarse.",
  RECIPIENT_FIRST_NAME_REQUIRED: "Falta el nombre del destinatario.",
  RECIPIENT_LAST_NAME_REQUIRED: "Falta el apellido del destinatario.",
  RECIPIENT_DNI_REQUIRED: "Falta el DNI del destinatario.",
  RECIPIENT_DNI_INVALID: "El DNI del destinatario debe contener solo números.",
  RECIPIENT_EMAIL_REQUIRED: "Falta el email del destinatario.",
  RECIPIENT_PHONE_REQUIRED: "Falta el teléfono del destinatario.",
  RECIPIENT_PHONE_AREA_CODE_REQUIRED: "Falta el código de área.",
  RECIPIENT_PHONE_NUMBER_REQUIRED: "Falta el número de teléfono.",
  ADDRESS_REQUIRED: "Falta completar la dirección.",
  ADDRESS_STREET_REQUIRED: "Falta la calle.",
  ADDRESS_STREET_NUMBER_REQUIRED: "Falta la altura.",
  ADDRESS_CITY_REQUIRED: "Falta la localidad.",
  ADDRESS_PROVINCE_REQUIRED: "Falta la provincia.",
  ADDRESS_POSTAL_CODE_REQUIRED: "Falta el código postal.",
  ANDREANI_LOCATION_INVALID: "No se pudo resolver una ubicación válida para Andreani.",
  BRANCH_EXTERNAL_ID_REQUIRED: "Falta la sucursal de destino.",
  BRANCH_NAME_REQUIRED: "Falta el nombre de la sucursal.",
  BRANCH_ADDRESS_REQUIRED: "Falta la dirección de la sucursal.",
  BRANCH_CITY_REQUIRED: "Falta la localidad de la sucursal.",
  BRANCH_PROVINCE_REQUIRED: "Falta la provincia de la sucursal.",
  BRANCH_POSTAL_CODE_REQUIRED: "Falta el código postal de la sucursal.",
  ANDREANI_BRANCH_INVALID: "No se pudo resolver una sucursal válida para Andreani.",
  SHIPMENT_IDS_REQUIRED: "Debes seleccionar al menos un envío.",
  SHIPMENT_NOT_FOUND: "El envío seleccionado no existe.",
  SHIPMENT_ALREADY_GENERATED: "El envío ya pertenece a un lote generado.",
};

export function getAndreaniIssueMessage(code: string, fallback = "Falta revisar este envío.") {
  return ISSUE_MESSAGES[code] ?? fallback;
}

export function summarizeAndreaniIssues(issues: AndreaniExportIssue[], maxItems = 2) {
  const messages = [...new Set(issues.map((issue) => getAndreaniIssueMessage(issue.code)).filter(Boolean))];

  if (messages.length === 0) {
    return null;
  }

  if (messages.length <= maxItems) {
    return messages.join(" y ");
  }

  const visible = messages.slice(0, maxItems).join(" y ");
  return `${visible} y ${messages.length - maxItems} más.`;
}

