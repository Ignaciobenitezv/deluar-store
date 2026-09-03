import type { Order } from "@/features/order/types";
import type { ShippingMethod } from "@/features/shipping/shipping";

export const SHIPMENT_CARRIERS = {
  ANDREANI: "ANDREANI",
  CORREO_ARGENTINO: "CORREO_ARGENTINO",
} as const;

export type ShipmentCarrier =
  (typeof SHIPMENT_CARRIERS)[keyof typeof SHIPMENT_CARRIERS];

export const SHIPMENT_STATUSES = {
  DRAFT: "DRAFT",
  READY: "READY",
  CREATED: "CREATED",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
  ERROR: "ERROR",
} as const;

export type ShipmentStatus =
  (typeof SHIPMENT_STATUSES)[keyof typeof SHIPMENT_STATUSES];

export type ShipmentReadinessIssue = {
  field: string;
  code: string;
  message: string;
};

export type ShipmentParcelAdminView = {
  id: string;
  sequence: number;
  calculatedWeightGrams: number | null;
  weightGrams: number | null;
  heightCm: number | null;
  widthCm: number | null;
  depthCm: number | null;
  createdAt: string;
  updatedAt: string;
};

export type ShipmentAdminView = {
  id: string;
  orderId: string;
  shippingMethod: ShippingMethod;
  carrier: ShipmentCarrier | null;
  status: ShipmentStatus;
  branchExternalId: string | null;
  branchCode: string | null;
  branchName: string | null;
  branchAddress: string | null;
  branchCity: string | null;
  branchProvince: string | null;
  branchPostalCode: string | null;
  trackingNumber: string | null;
  carrierExternalId: string | null;
  readyAt: string | null;
  dispatchedAt: string | null;
  deliveredAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  parcels: ShipmentParcelAdminView[];
  readinessErrors: ShipmentReadinessIssue[];
};

export type ShipmentAdminOrderData = {
  order: Order;
  shipments: ShipmentAdminView[];
};

export type ShipmentActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: ShipmentReadinessIssue[];
};

export type AndreaniPendingShipmentRow = {
  shipmentId: string;
  orderId: string;
  orderNumber: string;
  createdAt: string;
  readyAt: string | null;
  recipientName: string;
  shippingMethod: string;
  shippingMethodLabel: string;
  destinationLabel: string;
  productUnitCount: number;
  carrier: ShipmentCarrier | null;
  status: ShipmentStatus;
  parcelCount: number;
  exportable: boolean;
  simpleStateTone: "success" | "warning" | "neutral" | "muted";
  simpleStateLabel: string;
  issueSummary: string | null;
  issues: ShipmentReadinessIssue[];
  orderHref: string;
};

export type AndreaniExportBatchRow = {
  batchId: string;
  createdAt: string;
  fileName: string;
  carrier: ShipmentCarrier;
  shipmentCount: number;
  orderNumbers: string[];
  visibleOrderNumbers: string[];
  hiddenOrderCount: number;
  shippingMethodLabels: string[];
  parcelCount: number;
  downloadHref: string;
};

export type AndreaniExportsDashboardSummary = {
  pending: number;
  exportable: number;
  generatedBatches: number;
  generatedShipments: number;
  blocked: number;
};

export type AndreaniExportsDashboardData = {
  pendingShipments: AndreaniPendingShipmentRow[];
  generatedBatches: AndreaniExportBatchRow[];
  summary: AndreaniExportsDashboardSummary;
};
