import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { SHIPPING_METHODS } from "@/features/shipping/shipping";
import { SHIPMENT_CARRIERS, SHIPMENT_STATUSES } from "../types";
import type { AndreaniExportShipmentSource } from "./types";
import { getAndreaniTemplateMetadata } from "./template";
import { validateAndreaniExcelExport } from "./validation";
import { buildAndreaniWorkbookBuffer } from "./workbook";
import { buildAndreaniFileName } from "./filename";

export const shipmentExportInclude = {
  order: {
    select: {
      id: true,
      orderNumber: true,
      subtotal: true,
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
      items: {
        select: {
          quantity: true,
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

type ShipmentExportRecord = Prisma.ShipmentGetPayload<{
  include: typeof shipmentExportInclude;
}>;

function toNumber(value: Prisma.Decimal | number | null | undefined) {
  if (typeof value === "number") {
    return value;
  }

  if (!value) {
    return 0;
  }

  return value.toNumber();
}

function normalizeString(value: string | null | undefined) {
  return typeof value === "string" ? value.trim() : null;
}

export function toAndreaniExportSource(record: ShipmentExportRecord): AndreaniExportShipmentSource {
  const shippingAddress = record.order.shippingAddress;

  return {
    shipmentId: record.id,
    orderId: record.order.id,
    orderNumber: record.order.orderNumber,
    shippingMethod: record.shippingMethod as AndreaniExportShipmentSource["shippingMethod"],
    carrier: record.carrier,
    status: record.status,
    branchExternalId: normalizeString(record.branchExternalId),
    branchCode: normalizeString(record.branchCode),
    branchName: normalizeString(record.branchName),
    branchAddress: normalizeString(record.branchAddress),
    branchCity: normalizeString(record.branchCity),
    branchProvince: normalizeString(record.branchProvince),
    branchPostalCode: normalizeString(record.branchPostalCode),
    subtotal: toNumber(record.order.subtotal),
    recipient: {
      firstName: normalizeString(shippingAddress?.firstName) ?? "",
      lastName: normalizeString(shippingAddress?.lastName) ?? "",
      dni: normalizeString(shippingAddress?.dni) ?? "",
      email: normalizeString(shippingAddress?.email) ?? normalizeString(record.order.customer.email) ?? "",
      phone: normalizeString(shippingAddress?.phone) ?? normalizeString(record.order.customer.phone) ?? "",
      phoneAreaCode: normalizeString(shippingAddress?.phoneAreaCode) ?? "",
      phoneNumber: normalizeString(shippingAddress?.phoneNumber) ?? "",
      street: normalizeString(shippingAddress?.street) ?? "",
      streetNumber: normalizeString(shippingAddress?.streetNumber) ?? "",
      floor: normalizeString(shippingAddress?.floor) ?? "",
      apartment: normalizeString(shippingAddress?.apartment) ?? "",
      city: normalizeString(shippingAddress?.city) ?? "",
      province: normalizeString(shippingAddress?.province) ?? "",
      postalCode: normalizeString(shippingAddress?.postalCode) ?? "",
      notes: normalizeString(shippingAddress?.notes) ?? "",
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

export async function getAndreaniExportCandidates() {
  const records = await prisma.shipment.findMany({
    where: {
      carrier: SHIPMENT_CARRIERS.ANDREANI,
      status: SHIPMENT_STATUSES.READY,
      andreaniExportBatchId: null,
      order: {
        shippingMethod: {
          in: [SHIPPING_METHODS.HOME_DELIVERY, SHIPPING_METHODS.CITY_BRANCH],
        },
      },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: shipmentExportInclude,
  });

  const sources = records.map(toAndreaniExportSource);
  const plan = await validateAndreaniExcelExport(sources);

  return {
    shipments: plan.shipments.map((report, index) => {
      const source = sources[index]!;
      const shippingAddress = records[index]!.order.shippingAddress;
      return {
        shipmentId: report.shipmentId,
        orderId: report.orderId,
        orderNumber: report.orderNumber,
        shippingMethod: report.shippingMethod,
        carrier: report.carrier,
        status: report.status,
        sheetName: report.sheetName,
        parcelCount: report.parcelCount,
        exportable: report.exportable,
        issues: report.issues,
        createdAt: records[index]!.createdAt.toISOString(),
        readyAt: records[index]!.readyAt?.toISOString() ?? null,
        recipientName: [shippingAddress?.firstName, shippingAddress?.lastName].filter(Boolean).join(" ").trim() ||
          `${source.orderNumber}`,
        branchName: source.branchName,
      };
    }),
    summary: {
      total: plan.shipments.length,
      exportable: plan.shipments.filter((shipment) => shipment.exportable).length,
      blocked: plan.shipments.filter((shipment) => !shipment.exportable).length,
    },
  };
}

export async function generateAndreaniExcelFromShipmentIds(shipmentIds: string[]) {
  const uniqueIds = [...new Set(shipmentIds.map((id) => id.trim()).filter(Boolean))];

  if (uniqueIds.length === 0) {
    return {
      ok: false as const,
      status: 400,
      message: "Debes enviar al menos un shipmentId.",
      issues: [
        {
          shipmentId: "selection",
          orderId: "selection",
          orderNumber: "selection",
          field: "shipmentIds",
          code: "SHIPMENT_IDS_REQUIRED",
          message: "Debes enviar al menos un shipmentId.",
        },
      ],
    };
  }

  const records = await prisma.shipment.findMany({
    where: {
      id: { in: uniqueIds },
      andreaniExportBatchId: null,
    },
    include: shipmentExportInclude,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });

  const foundIds = new Set(records.map((record) => record.id));
  const missingIds = uniqueIds.filter((id) => !foundIds.has(id));

  if (missingIds.length > 0) {
    return {
      ok: false as const,
      status: 404,
      message: "Hay shipments seleccionados que no existen.",
      issues: missingIds.map((shipmentId) => ({
        shipmentId,
        orderId: "unknown",
        orderNumber: "unknown",
        field: "shipmentIds",
        code: "SHIPMENT_NOT_FOUND",
        message: "El shipment no existe.",
      })),
    };
  }

  const sources = records.map(toAndreaniExportSource);
  const metadata = await getAndreaniTemplateMetadata();
  const plan = await validateAndreaniExcelExport(sources, metadata);

  if (plan.issues.length > 0) {
    return {
      ok: false as const,
      status: 422,
      message: "La exportacion contiene shipments invalidos.",
      issues: plan.issues,
    };
  }

  const buffer = await buildAndreaniWorkbookBuffer(plan.rowsBySheet, metadata);
  const fileName = buildAndreaniFileName();

  return {
    ok: true as const,
    buffer,
    fileName,
    rows: plan.rows,
    shipments: plan.shipments,
  };
}

export async function getAndreaniExportPreview() {
  return getAndreaniExportCandidates();
}
