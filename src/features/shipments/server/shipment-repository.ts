import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { SHIPMENT_STATUSES, type ShipmentCarrier } from "../types";

const shipmentInclude = {
  parcels: {
    orderBy: {
      sequence: "asc",
    },
  },
} satisfies Prisma.ShipmentInclude;

export type ShipmentRecord = Prisma.ShipmentGetPayload<{
  include: typeof shipmentInclude;
}>;

export async function getShipmentsByOrderId(orderId: string) {
  return prisma.shipment.findMany({
    where: { orderId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    include: shipmentInclude,
  });
}

export async function getShipmentById(shipmentId: string) {
  return prisma.shipment.findUnique({
    where: { id: shipmentId },
    include: shipmentInclude,
  });
}

export async function findDraftShipmentByOrderId(orderId: string) {
  return prisma.shipment.findFirst({
    where: {
      orderId,
      status: SHIPMENT_STATUSES.DRAFT,
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    include: shipmentInclude,
  });
}

export async function createShipmentDraft(input: {
  orderId: string;
  shippingMethod: string;
  carrier?: ShipmentCarrier | null;
  calculatedWeightGrams: number | null;
  weightGrams: number | null;
  heightCm: number | null;
  widthCm: number | null;
  depthCm: number | null;
}) {
  return prisma.shipment.create({
    data: {
      orderId: input.orderId,
      shippingMethod: input.shippingMethod,
      carrier: input.carrier ?? null,
      status: SHIPMENT_STATUSES.DRAFT,
      parcels: {
        create: {
          sequence: 1,
          calculatedWeightGrams: input.calculatedWeightGrams,
          weightGrams: input.weightGrams,
          heightCm: input.heightCm,
          widthCm: input.widthCm,
          depthCm: input.depthCm,
        },
      },
    },
    include: shipmentInclude,
  });
}

export async function updateShipmentCarrier(
  shipmentId: string,
  carrier: ShipmentCarrier | null,
  options?: { clearBranch?: boolean },
) {
  return prisma.shipment.update({
    where: { id: shipmentId },
    data: {
      carrier,
      ...(options?.clearBranch
        ? {
            branchExternalId: null,
            branchCode: null,
            branchName: null,
            branchAddress: null,
            branchCity: null,
            branchProvince: null,
            branchPostalCode: null,
          }
        : {}),
    },
    include: shipmentInclude,
  });
}

export async function updateShipmentBranch(
  shipmentId: string,
  input: {
    branchExternalId: string | null;
    branchCode: string | null;
    branchName: string | null;
    branchAddress: string | null;
    branchCity: string | null;
    branchProvince: string | null;
    branchPostalCode: string | null;
  },
) {
  return prisma.shipment.update({
    where: { id: shipmentId },
    data: input,
    include: shipmentInclude,
  });
}

export async function clearShipmentBranch(shipmentId: string) {
  return prisma.shipment.update({
    where: { id: shipmentId },
    data: {
      branchExternalId: null,
      branchCode: null,
      branchName: null,
      branchAddress: null,
      branchCity: null,
      branchProvince: null,
      branchPostalCode: null,
    },
    include: shipmentInclude,
  });
}

export async function updateShipmentParcel(
  parcelId: string,
  input: {
    calculatedWeightGrams?: number | null;
    weightGrams: number | null;
    heightCm: number | null;
    widthCm: number | null;
    depthCm: number | null;
  },
) {
  return prisma.parcel.update({
    where: { id: parcelId },
    data: input,
  });
}

export async function createShipmentParcel(shipmentId: string) {
  const lastParcel = await prisma.parcel.findFirst({
    where: { shipmentId },
    orderBy: { sequence: "desc" },
    select: { sequence: true },
  });

  return prisma.parcel.create({
    data: {
      shipmentId,
      sequence: (lastParcel?.sequence ?? 0) + 1,
    },
  });
}

export async function deleteShipmentParcel(parcelId: string) {
  return prisma.$transaction(async (tx) => {
    const parcel = await tx.parcel.findUnique({
      where: { id: parcelId },
      select: {
        id: true,
        shipmentId: true,
        sequence: true,
      },
    });

    if (!parcel) {
      return null;
    }

    await tx.parcel.delete({
      where: { id: parcelId },
    });

    await tx.parcel.updateMany({
      where: {
        shipmentId: parcel.shipmentId,
        sequence: {
          gt: parcel.sequence,
        },
      },
      data: {
        sequence: {
          decrement: 1,
        },
      },
    });

    return tx.shipment.findUnique({
      where: { id: parcel.shipmentId },
      include: shipmentInclude,
    });
  });
}

export async function updateShipmentDraftStatusReady(
  shipmentId: string,
  readyAt: Date,
) {
  return prisma.shipment.update({
    where: { id: shipmentId },
    data: {
      status: SHIPMENT_STATUSES.READY,
      readyAt,
      errorMessage: null,
    },
    include: shipmentInclude,
  });
}

export async function updateShipmentDraftErrorMessage(
  shipmentId: string,
  errorMessage: string | null,
) {
  return prisma.shipment.update({
    where: { id: shipmentId },
    data: {
      errorMessage,
    },
    include: shipmentInclude,
  });
}
