import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  isPickupShippingMethod,
  SHIPPING_METHODS,
  type ShippingMethod,
} from "@/features/shipping/shipping";
import { SHIPMENT_CARRIERS, SHIPMENT_STATUSES, type ShipmentReadinessIssue } from "../types";
import type { AndreaniExportShipmentSource } from "@/features/shipments/andreani-export/types";
import { getAndreaniTemplateMetadata } from "@/features/shipments/andreani-export/template";
import { validateAndreaniExcelExport } from "@/features/shipments/andreani-export/validation";

export type ShipmentOperationsViewFilter = "all" | "pending" | "ready" | "andreani" | "home_delivery" | "city_branch" | "pickup";

export type ShipmentOperationsPageFilters = {
  q: string;
  view: ShipmentOperationsViewFilter;
};

export type ShipmentOperationsRow = {
  shipmentId: string;
  orderId: string;
  orderNumber: string;
  createdAt: string;
  readyAt: string | null;
  recipientName: string;
  shippingMethod: ShippingMethod;
  shippingMethodLabel: string;
  carrier: string | null;
  shipmentStatus: string;
  branchName: string | null;
  parcelCount: number;
  exportable: boolean;
  visualState: "EXPORTABLE" | "REVIEW" | "DRAFT" | "PICKUP";
  visualStateLabel: string;
  visualStateTone: "success" | "warning" | "neutral" | "muted";
  issues: ShipmentReadinessIssue[];
  orderHref: string;
};

export type ShipmentOperationsPageData = {
  filters: ShipmentOperationsPageFilters;
  shipments: ShipmentOperationsRow[];
  exportableShipments: ShipmentOperationsRow[];
  summary: {
    total: number;
    exportable: number;
    blocked: number;
    ready: number;
    draft: number;
    pickup: number;
    andreani: number;
    homeDelivery: number;
    cityBranch: number;
  };
};

const shipmentOperationsInclude = {
  order: {
    select: {
      id: true,
      orderNumber: true,
      shippingMethod: true,
      customer: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
      shippingAddress: {
        select: {
          firstName: true,
          lastName: true,
          dni: true,
          email: true,
          phone: true,
          phoneAreaCode: true,
          phoneNumber: true,
          street: true,
          streetNumber: true,
          floor: true,
          apartment: true,
          city: true,
          province: true,
          postalCode: true,
          notes: true,
        },
      },
    },
  },
  parcels: {
    orderBy: {
      sequence: "asc",
    },
    select: {
      id: true,
      sequence: true,
      calculatedWeightGrams: true,
      weightGrams: true,
      heightCm: true,
      widthCm: true,
      depthCm: true,
    },
  },
} satisfies Prisma.ShipmentInclude;

type ShipmentOperationsRecord = Prisma.ShipmentGetPayload<{
  include: typeof shipmentOperationsInclude;
}>;

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function normalizeString(value: string | null | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeMaybeText(value: string | null | undefined) {
  const text = normalizeString(value);
  return text.length > 0 ? text : null;
}

function shippingMethodLabel(method: ShippingMethod) {
  if (method === SHIPPING_METHODS.HOME_DELIVERY) {
    return "A domicilio";
  }

  if (method === SHIPPING_METHODS.CITY_BRANCH) {
    return "A sucursal";
  }

  return "Retiro local";
}

function toSource(record: ShipmentOperationsRecord): AndreaniExportShipmentSource {
  const shippingAddress = record.order.shippingAddress;

  return {
    shipmentId: record.id,
    orderId: record.order.id,
    orderNumber: record.order.orderNumber,
    shippingMethod: record.order.shippingMethod as AndreaniExportShipmentSource["shippingMethod"],
    carrier: record.carrier,
    status: record.status,
    branchExternalId: normalizeMaybeText(record.branchExternalId),
    branchCode: normalizeMaybeText(record.branchCode),
    branchName: normalizeMaybeText(record.branchName),
    branchAddress: normalizeMaybeText(record.branchAddress),
    branchCity: normalizeMaybeText(record.branchCity),
    branchProvince: normalizeMaybeText(record.branchProvince),
    branchPostalCode: normalizeMaybeText(record.branchPostalCode),
    subtotal: 0,
    recipient: {
      firstName: normalizeMaybeText(shippingAddress?.firstName) ?? normalizeMaybeText(record.order.customer.firstName) ?? "",
      lastName: normalizeMaybeText(shippingAddress?.lastName) ?? normalizeMaybeText(record.order.customer.lastName) ?? "",
      dni: normalizeMaybeText(shippingAddress?.dni) ?? "",
      email: normalizeMaybeText(shippingAddress?.email) ?? normalizeMaybeText(record.order.customer.email) ?? "",
      phone: normalizeMaybeText(shippingAddress?.phone) ?? normalizeMaybeText(record.order.customer.phone) ?? "",
      phoneAreaCode: normalizeMaybeText(shippingAddress?.phoneAreaCode) ?? "",
      phoneNumber: normalizeMaybeText(shippingAddress?.phoneNumber) ?? "",
      street: normalizeMaybeText(shippingAddress?.street) ?? "",
      streetNumber: normalizeMaybeText(shippingAddress?.streetNumber) ?? "",
      floor: normalizeMaybeText(shippingAddress?.floor) ?? "",
      apartment: normalizeMaybeText(shippingAddress?.apartment) ?? "",
      city: normalizeMaybeText(shippingAddress?.city) ?? "",
      province: normalizeMaybeText(shippingAddress?.province) ?? "",
      postalCode: normalizeMaybeText(shippingAddress?.postalCode) ?? "",
      notes: normalizeMaybeText(shippingAddress?.notes) ?? "",
    },
    parcels: record.parcels.map((parcel) => ({
      id: parcel.id,
      sequence: parcel.sequence,
      calculatedWeightGrams: parcel.calculatedWeightGrams,
      weightGrams: parcel.weightGrams,
      heightCm: parcel.heightCm,
      widthCm: parcel.widthCm,
      depthCm: parcel.depthCm,
    })),
  };
}

function normalizeQuery(value: string) {
  return value.trim().toLowerCase();
}

function matchesSearch(row: ShipmentOperationsRow, query: string) {
  if (!query) {
    return true;
  }

  const haystack = [
    row.orderNumber,
    row.recipientName,
    row.branchName ?? "",
    row.shipmentId,
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

function matchesView(row: ShipmentOperationsRow, view: ShipmentOperationsViewFilter) {
  switch (view) {
    case "pending":
      return row.visualState === "DRAFT" || row.visualState === "REVIEW";
    case "ready":
      return row.visualState === "EXPORTABLE";
    case "andreani":
      return row.carrier === SHIPMENT_CARRIERS.ANDREANI;
    case "home_delivery":
      return row.shippingMethod === SHIPPING_METHODS.HOME_DELIVERY;
    case "city_branch":
      return row.shippingMethod === SHIPPING_METHODS.CITY_BRANCH;
    case "pickup":
      return row.shippingMethod === SHIPPING_METHODS.RESISTANCE_PICKUP;
    case "all":
    default:
      return true;
  }
}

function getVisualState(row: {
  shippingMethod: ShippingMethod;
  shipmentStatus: string;
  carrier: string | null;
  exportable: boolean;
}) {
  if (isPickupShippingMethod(row.shippingMethod)) {
    return {
      visualState: "PICKUP" as const,
      visualStateLabel: "Retiro local",
      visualStateTone: "muted" as const,
    };
  }

  if (row.shipmentStatus === SHIPMENT_STATUSES.DRAFT) {
    return {
      visualState: "DRAFT" as const,
      visualStateLabel: "Borrador",
      visualStateTone: "neutral" as const,
    };
  }

  if (row.exportable && row.carrier === SHIPMENT_CARRIERS.ANDREANI) {
    return {
      visualState: "EXPORTABLE" as const,
      visualStateLabel: "Listo para exportar",
      visualStateTone: "success" as const,
    };
  }

  return {
    visualState: "REVIEW" as const,
    visualStateLabel: "Requiere revision",
    visualStateTone: "warning" as const,
  };
}

function getRecipientName(record: ShipmentOperationsRecord) {
  const shippingAddress = record.order.shippingAddress;

  return [
    shippingAddress?.firstName ?? record.order.customer.firstName,
    shippingAddress?.lastName ?? record.order.customer.lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
}

export async function getShipmentOperationsPageData(filters: ShipmentOperationsPageFilters): Promise<ShipmentOperationsPageData> {
  const records = await prisma.shipment.findMany({
    include: shipmentOperationsInclude,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });

  const sources = records.map(toSource);
  const metadata = await getAndreaniTemplateMetadata();
  const plan = await validateAndreaniExcelExport(sources, metadata);
  const planByShipmentId = new Map(plan.shipments.map((shipment) => [shipment.shipmentId, shipment]));

  const rows = records.map((record, index) => {
    const report = planByShipmentId.get(record.id);
    const source = sources[index]!;
    const exportable = Boolean(report?.exportable);
    const visual = getVisualState({
      shippingMethod: record.order.shippingMethod as ShippingMethod,
      shipmentStatus: record.status,
      carrier: record.carrier,
      exportable,
    });

    return {
      shipmentId: record.id,
      orderId: record.order.id,
      orderNumber: record.order.orderNumber,
      createdAt: record.createdAt.toISOString(),
      readyAt: toIso(record.readyAt),
      recipientName: getRecipientName(record) || record.order.orderNumber,
      shippingMethod: record.order.shippingMethod as ShippingMethod,
      shippingMethodLabel: shippingMethodLabel(record.order.shippingMethod as ShippingMethod),
      carrier: record.carrier,
      shipmentStatus: record.status,
      branchName: source.branchName,
      parcelCount: record.parcels.length,
      exportable,
      visualState: visual.visualState,
      visualStateLabel: visual.visualStateLabel,
      visualStateTone: visual.visualStateTone,
      issues: report?.issues ?? [],
      orderHref: `/admin/orders/${record.order.id}`,
    } satisfies ShipmentOperationsRow;
  });

  const normalizedQuery = normalizeQuery(filters.q);
  const filteredRows = rows.filter((row) => matchesView(row, filters.view) && matchesSearch(row, normalizedQuery));

  const exportableShipments = filteredRows.filter((row) => row.exportable);

  return {
    filters,
    shipments: filteredRows,
    exportableShipments,
    summary: {
      total: filteredRows.length,
      exportable: filteredRows.filter((row) => row.exportable).length,
      blocked: filteredRows.filter((row) => !row.exportable).length,
      ready: filteredRows.filter((row) => row.visualState === "EXPORTABLE").length,
      draft: filteredRows.filter((row) => row.visualState === "DRAFT").length,
      pickup: filteredRows.filter((row) => row.visualState === "PICKUP").length,
      andreani: filteredRows.filter((row) => row.carrier === SHIPMENT_CARRIERS.ANDREANI).length,
      homeDelivery: filteredRows.filter((row) => row.shippingMethod === SHIPPING_METHODS.HOME_DELIVERY).length,
      cityBranch: filteredRows.filter((row) => row.shippingMethod === SHIPPING_METHODS.CITY_BRANCH).length,
    },
  };
}
