import { SHIPMENT_CARRIERS, SHIPMENT_STATUSES, type ShipmentCarrier, type ShipmentStatus } from "./types";

const SHIPMENT_CARRIER_LABELS: Record<ShipmentCarrier, string> = {
  [SHIPMENT_CARRIERS.ANDREANI]: "Andreani",
  [SHIPMENT_CARRIERS.CORREO_ARGENTINO]: "Correo Argentino",
};

const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
  [SHIPMENT_STATUSES.DRAFT]: "Borrador",
  [SHIPMENT_STATUSES.READY]: "Listo",
  [SHIPMENT_STATUSES.CREATED]: "Creado",
  [SHIPMENT_STATUSES.DELIVERED]: "Entregado",
  [SHIPMENT_STATUSES.CANCELLED]: "Cancelado",
  [SHIPMENT_STATUSES.ERROR]: "Error",
};

export function getShipmentCarrierLabel(carrier: ShipmentCarrier | null | undefined) {
  if (!carrier) {
    return "Sin carrier";
  }

  return SHIPMENT_CARRIER_LABELS[carrier] ?? carrier;
}

export function getShipmentStatusLabel(status: ShipmentStatus) {
  return SHIPMENT_STATUS_LABELS[status] ?? status;
}
