import type { ShippingMethod } from "@/features/shipping/shipping";
import type { ShipmentCarrier, ShipmentStatus, ShipmentReadinessIssue } from "../types";

export type AndreaniExportSheetName =
  | typeof import("./config").ANDREANI_HOME_DELIVERY_SHEET
  | typeof import("./config").ANDREANI_BRANCH_SHEET;

export type AndreaniExportShipmentSource = {
  shipmentId: string;
  orderId: string;
  orderNumber: string;
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
  subtotal: number;
  recipient: {
    firstName: string | null;
    lastName: string | null;
    dni: string | null;
    email: string | null;
    phone: string | null;
    phoneAreaCode: string | null;
    phoneNumber: string | null;
    street: string | null;
    streetNumber: string | null;
    floor: string | null;
    apartment: string | null;
    city: string | null;
    province: string | null;
    postalCode: string | null;
    notes: string | null;
  };
  parcels: {
    id: string;
    sequence: number;
    calculatedWeightGrams: number | null;
    weightGrams: number | null;
    heightCm: number | null;
    widthCm: number | null;
    depthCm: number | null;
  }[];
};

export type AndreaniExportIssue = ShipmentReadinessIssue & {
  shipmentId: string;
  orderId: string;
  orderNumber: string;
  sheetName?: AndreaniExportSheetName | null;
};

export type AndreaniWorkbookCellValue = string | number | null;

export type AndreaniWorkbookRowCells = Partial<
  Record<"A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J" | "K" | "L" | "M" | "N" | "O" | "P" | "Q" | "R" | "S", AndreaniWorkbookCellValue>
>;

export type AndreaniExportWorkbookRow = {
  shipmentId: string;
  orderId: string;
  orderNumber: string;
  sheetName: AndreaniExportSheetName;
  parcelId: string;
  parcelSequence: number;
  cells: AndreaniWorkbookRowCells;
};

export type AndreaniExportShipmentReport = {
  shipmentId: string;
  orderId: string;
  orderNumber: string;
  shippingMethod: ShippingMethod;
  carrier: ShipmentCarrier | null;
  status: ShipmentStatus;
  sheetName: AndreaniExportSheetName | null;
  parcelCount: number;
  exportable: boolean;
  issues: AndreaniExportIssue[];
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
  issues: AndreaniExportIssue[];
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

export type AndreaniTemplateMetadata = {
  homeDeliverySheetName: AndreaniExportSheetName;
  branchSheetName: AndreaniExportSheetName;
  configSheetName: string;
  locationLookup: Map<string, string>;
  branchLookup: Map<string, string>;
  locationCount: number;
  branchCount: number;
};

export type AndreaniExportPlan = {
  shipments: AndreaniExportShipmentReport[];
  rows: AndreaniExportWorkbookRow[];
  rowsBySheet: Record<AndreaniExportSheetName, AndreaniExportWorkbookRow[]>;
  issues: AndreaniExportIssue[];
};
