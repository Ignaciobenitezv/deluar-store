import type { Order } from "@/features/order/types";
import { getOrderById } from "@/features/orders/server/order-repository";
import { prisma } from "@/lib/prisma";
import { traceAsync } from "@/lib/perf-trace";
import {
  isPickupShippingMethod,
  SHIPPING_METHODS,
  type ShippingMethod,
} from "@/features/shipping/shipping";
import { logger } from "@/lib/logger";
import {
  normalizeDni,
  normalizePhoneAreaCode,
  normalizePhoneNumber,
} from "@/features/order/validation";
import type { ShipmentAdminOrderData, ShipmentAdminView, ShipmentCarrier } from "../types";
import { SHIPMENT_CARRIERS, SHIPMENT_STATUSES } from "../types";
import { buildInitialShipmentParcel, validateShipmentReadiness } from "./shipment-readiness";
import {
  clearShipmentBranch,
  createShipmentDraft,
  createShipmentParcel,
  deleteShipmentParcel,
  findDraftShipmentByOrderId,
  getShipmentById,
  getShipmentsByOrderId,
  updateShipmentBranch as updateShipmentBranchRecord,
  updateShipmentCarrier,
  updateShipmentDraftErrorMessage,
  updateShipmentDraftStatusReady,
  updateShipmentParcel,
} from "./shipment-repository";

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptionalString(value: unknown) {
  const text = normalizeString(value);

  return text.length > 0 ? text : null;
}

function buildLegacyAddressFromRecipient(input: {
  street: string;
  streetNumber: string;
  floor: string;
  apartment: string;
  city: string;
  province: string;
  postalCode: string;
}) {
  const streetLine = [input.street, input.streetNumber].filter(Boolean).join(" ").trim();
  const floorLine = [
    input.floor ? `Piso ${input.floor}` : "",
    input.apartment ? `Depto ${input.apartment}` : "",
  ]
    .filter(Boolean)
    .join(", ")
    .trim();
  const locationLine = [input.city, input.province, input.postalCode].filter(Boolean).join(", ").trim();

  return [streetLine, floorLine, locationLine].filter(Boolean).join(" | ");
}

function mapParcel(parcel: {
  id: string;
  sequence: number;
  calculatedWeightGrams: number | null;
  weightGrams: number | null;
  heightCm: number | null;
  widthCm: number | null;
  depthCm: number | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: parcel.id,
    sequence: parcel.sequence,
    calculatedWeightGrams: parcel.calculatedWeightGrams,
    weightGrams: parcel.weightGrams,
    heightCm: parcel.heightCm,
    widthCm: parcel.widthCm,
    depthCm: parcel.depthCm,
    createdAt: parcel.createdAt.toISOString(),
    updatedAt: parcel.updatedAt.toISOString(),
  };
}

function mapShipment(order: Order, shipment: NonNullable<Awaited<ReturnType<typeof getShipmentById>>>) {
  return {
    id: shipment.id,
    orderId: shipment.orderId,
    shippingMethod: shipment.shippingMethod as ShippingMethod,
    carrier: shipment.carrier,
    status: shipment.status,
    branchExternalId: shipment.branchExternalId,
    branchCode: shipment.branchCode,
    branchName: shipment.branchName,
    branchAddress: shipment.branchAddress,
    branchCity: shipment.branchCity,
    branchProvince: shipment.branchProvince,
    branchPostalCode: shipment.branchPostalCode,
    trackingNumber: shipment.trackingNumber,
    carrierExternalId: shipment.carrierExternalId,
    readyAt: toIso(shipment.readyAt),
    dispatchedAt: toIso(shipment.dispatchedAt),
    deliveredAt: toIso(shipment.deliveredAt),
    errorMessage: shipment.errorMessage,
    createdAt: shipment.createdAt.toISOString(),
    updatedAt: shipment.updatedAt.toISOString(),
    parcels: shipment.parcels.map(mapParcel),
    readinessErrors: validateShipmentReadiness(order, {
      carrier: shipment.carrier,
      status: shipment.status,
      shippingMethod: shipment.shippingMethod as ShippingMethod,
      branchExternalId: shipment.branchExternalId,
      branchCode: shipment.branchCode,
      branchName: shipment.branchName,
      branchAddress: shipment.branchAddress,
      branchCity: shipment.branchCity,
      branchProvince: shipment.branchProvince,
      branchPostalCode: shipment.branchPostalCode,
      parcels: shipment.parcels,
    }),
  } satisfies ShipmentAdminView;
}

function buildInitialParcelFromOrder(order: Order) {
  return buildInitialShipmentParcel(order.items);
}

async function syncShipmentDraftParcelAutofill(shipmentId: string, order: Order) {
  const shipment = await getShipmentById(shipmentId);

  if (!shipment || shipment.parcels.length !== 1) {
    return;
  }

  const suggestion = await traceAsync("admin.shipments", "build_initial_parcel_autofill", async () => {
    return buildInitialParcelFromOrder(order);
  }, { orderId: order.id, shipmentId });
  const parcel = shipment.parcels[0];

  if (
    suggestion.calculatedWeightGrams === null &&
    suggestion.weightGrams === null &&
    suggestion.heightCm === null &&
    suggestion.widthCm === null &&
    suggestion.depthCm === null
  ) {
    return;
  }

  const nextValues = {
    calculatedWeightGrams:
      parcel.calculatedWeightGrams ?? suggestion.calculatedWeightGrams ?? null,
    weightGrams: parcel.weightGrams ?? suggestion.weightGrams ?? null,
    heightCm: parcel.heightCm ?? suggestion.heightCm ?? null,
    widthCm: parcel.widthCm ?? suggestion.widthCm ?? null,
    depthCm: parcel.depthCm ?? suggestion.depthCm ?? null,
  };

  if (
    nextValues.calculatedWeightGrams === parcel.calculatedWeightGrams &&
    nextValues.weightGrams === parcel.weightGrams &&
    nextValues.heightCm === parcel.heightCm &&
    nextValues.widthCm === parcel.widthCm &&
    nextValues.depthCm === parcel.depthCm
  ) {
    return;
  }

  await updateShipmentParcel(parcel.id, nextValues);
}

function isCarrierBasedShipment(order: Order) {
  return !isPickupShippingMethod(order.shippingMethod);
}

function canMutateShipment(status: string) {
  return status === "DRAFT";
}

export async function getOrderShipmentAdminData(orderId: string): Promise<ShipmentAdminOrderData | null> {
  const order = await getOrderById(orderId);

  if (!order) {
    return null;
  }

  const shipments = await getShipmentsByOrderId(orderId);

  return {
    order,
    shipments: shipments.map((shipment) => mapShipment(order, shipment)),
  };
}

export async function prepareShipment(orderId: string) {
  const order = await traceAsync("admin.shipments", "query_order", async () => {
    return getOrderById(orderId);
  }, { orderId });

  if (!order) {
    return {
      ok: false as const,
      status: 404,
      message: "La orden no existe.",
      errors: [{ field: "orderId", code: "ORDER_NOT_FOUND", message: "La orden no existe." }],
    };
  }

  if (!isCarrierBasedShipment(order)) {
    return {
      ok: false as const,
      status: 409,
      message: "El retiro local no requiere preparacion de shipment.",
      errors: [
        {
          field: "shippingMethod",
          code: "PICKUP_DOES_NOT_REQUIRE_SHIPMENT",
          message: "El retiro local no requiere preparacion de shipment.",
        },
      ],
    };
  }

  const existingDraft = await traceAsync("admin.shipments", "query_existing_draft", async () => {
    return findDraftShipmentByOrderId(orderId);
  }, { orderId });

  if (existingDraft) {
    const initialParcel = await traceAsync("admin.shipments", "build_initial_parcel", async () => {
      return buildInitialParcelFromOrder(order);
    }, { orderId, shipmentId: existingDraft.id });

    if (existingDraft.parcels.length === 0) {
      const createdParcel = await traceAsync("admin.shipments", "create_parcel", async () => {
        return createShipmentParcel(existingDraft.id);
      }, { orderId, shipmentId: existingDraft.id });

      await traceAsync("admin.shipments", "hydrate_parcel", async () => {
        await updateShipmentParcel(createdParcel.id, {
          calculatedWeightGrams: initialParcel.calculatedWeightGrams ?? null,
          weightGrams: initialParcel.weightGrams ?? null,
          heightCm: initialParcel.heightCm ?? null,
          widthCm: initialParcel.widthCm ?? null,
          depthCm: initialParcel.depthCm ?? null,
        });
      }, { orderId, shipmentId: existingDraft.id, parcelId: createdParcel.id });
    } else if (existingDraft.parcels.length === 1) {
      await traceAsync("admin.shipments", "sync_parcel_autofill", async () => {
        await syncShipmentDraftParcelAutofill(existingDraft.id, order);
      }, { orderId, shipmentId: existingDraft.id });
    }

    const refreshedDraft = await traceAsync("admin.shipments", "refresh_draft", async () => {
      return getShipmentById(existingDraft.id);
    }, { orderId, shipmentId: existingDraft.id });

    if (!refreshedDraft) {
      return {
        ok: false as const,
        status: 500,
        message: "No se pudo recuperar el shipment borrador.",
        errors: [
          {
            field: "shipmentId",
            code: "SHIPMENT_REFRESH_FAILED",
            message: "No se pudo recuperar el shipment borrador.",
          },
        ],
      };
    }

    return {
      ok: true as const,
      shipment: mapShipment(order, refreshedDraft),
      reused: true,
    };
  }

  const initialParcel = await traceAsync("admin.shipments", "build_initial_parcel", async () => {
    return buildInitialParcelFromOrder(order);
  }, { orderId });

  const shipment = await traceAsync("admin.shipments", "create_draft", async () => {
    return createShipmentDraft({
      orderId,
      shippingMethod: order.shippingMethod,
      calculatedWeightGrams: initialParcel.calculatedWeightGrams ?? null,
      weightGrams: initialParcel.weightGrams ?? null,
      heightCm: initialParcel.heightCm ?? null,
      widthCm: initialParcel.widthCm ?? null,
      depthCm: initialParcel.depthCm ?? null,
    });
  }, { orderId });

  logger.info("admin.shipments.prepare.created", {
    orderId,
    shipmentId: shipment.id,
    hasWeightSuggestion: initialParcel.calculatedWeightGrams !== null,
  });

  return {
    ok: true as const,
    shipment: mapShipment(order, shipment),
    reused: false,
  };
}

export async function ensureAndreaniShipmentReadyForOrder(orderId: string) {
  const order = await traceAsync("admin.shipments", "query_order_for_ready", async () => {
    return getOrderById(orderId);
  }, { orderId });

  if (!order || isPickupShippingMethod(order.shippingMethod)) {
    return false;
  }

  const candidateShipments = await traceAsync("admin.shipments", "query_candidate_shipments", async () => {
    return prisma.shipment.findMany({
      where: {
        orderId,
        andreaniExportBatchId: null,
      },
      include: {
        parcels: {
          orderBy: {
            sequence: "asc",
          },
        },
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
  }, { orderId });

  const exportableReadyShipment = candidateShipments.find(
    (shipment) =>
      shipment.status === SHIPMENT_STATUSES.READY &&
      shipment.carrier === SHIPMENT_CARRIERS.ANDREANI,
  );

  if (exportableReadyShipment) {
    return true;
  }

  let candidateShipment =
    candidateShipments.find((shipment) => shipment.status === SHIPMENT_STATUSES.DRAFT) ?? null;

  if (!candidateShipment) {
    const prepared = await traceAsync("admin.shipments", "prepare_missing_draft", async () => {
      return prepareShipment(orderId);
    }, { orderId });

    if (!prepared.ok) {
      return false;
    }

    candidateShipment = await getShipmentById(prepared.shipment.id);
  }

  if (!candidateShipment) {
    return false;
  }

  if (candidateShipment.carrier !== SHIPMENT_CARRIERS.ANDREANI) {
    const carrierResult = await traceAsync("admin.shipments", "set_andreani_carrier", async () => {
      return updateShipmentCarrierForOrderShipment(
        candidateShipment.id,
        SHIPMENT_CARRIERS.ANDREANI,
      );
    }, { orderId, shipmentId: candidateShipment.id });

    if (!carrierResult.ok || !carrierResult.shipment) {
      return false;
    }
  }

  const readyResult = await traceAsync("admin.shipments", "mark_ready", async () => {
    return markShipmentReady(candidateShipment.id);
  }, { orderId, shipmentId: candidateShipment.id });

  return readyResult.ok;
}

export async function updateShipmentRecipientForOrder(
  orderId: string,
  input: {
    firstName: string;
    lastName: string;
    dni: string;
    email: string;
    phone: string;
    phoneAreaCode: string;
    phoneNumber: string;
    street: string;
    streetNumber: string;
    floor: string;
    apartment: string;
    city: string;
    province: string;
    postalCode: string;
    notes: string;
  },
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      shippingAddressId: true,
    },
  });

  if (!order) {
    return {
      ok: false as const,
      status: 404,
      message: "La orden no existe.",
      errors: [{ field: "orderId", code: "ORDER_NOT_FOUND", message: "La orden no existe." }],
    };
  }

  if (!order.shippingAddressId) {
    return {
      ok: false as const,
      status: 409,
      message: "La orden no tiene shippingAddress.",
      errors: [
        {
          field: "shippingAddressId",
          code: "SHIPPING_ADDRESS_NOT_FOUND",
          message: "La orden no tiene shippingAddress.",
        },
      ],
    };
  }

  await prisma.shippingAddress.update({
    where: { id: order.shippingAddressId },
    data: {
      firstName: normalizeOptionalString(input.firstName),
      lastName: normalizeOptionalString(input.lastName),
      dni: normalizeDni(input.dni) || null,
      email: normalizeOptionalString(input.email),
      phone: normalizeOptionalString(input.phone),
      phoneAreaCode: normalizePhoneAreaCode(input.phoneAreaCode) || null,
      phoneNumber: normalizePhoneNumber(input.phoneNumber) || null,
      street: normalizeOptionalString(input.street),
      streetNumber: normalizeOptionalString(input.streetNumber),
      floor: normalizeOptionalString(input.floor),
      apartment: normalizeOptionalString(input.apartment),
      city: normalizeString(input.city),
      province: normalizeString(input.province),
      postalCode: normalizeString(input.postalCode),
      notes: normalizeOptionalString(input.notes),
      address: buildLegacyAddressFromRecipient({
        street: normalizeString(input.street),
        streetNumber: normalizeString(input.streetNumber),
        floor: normalizeString(input.floor),
        apartment: normalizeString(input.apartment),
        city: normalizeString(input.city),
        province: normalizeString(input.province),
        postalCode: normalizeString(input.postalCode),
      }),
    },
  });

  const updatedOrder = await getOrderById(orderId);

  return {
    ok: true as const,
    order: updatedOrder,
  };
}

export async function updateShipmentCarrierForOrderShipment(
  shipmentId: string,
  carrier: ShipmentCarrier | null,
) {
  const shipment = await getShipmentById(shipmentId);

  if (!shipment) {
    return {
      ok: false as const,
      status: 404,
      message: "El shipment no existe.",
      errors: [{ field: "shipmentId", code: "SHIPMENT_NOT_FOUND", message: "El shipment no existe." }],
    };
  }

  if (!canMutateShipment(shipment.status)) {
    return {
      ok: false as const,
      status: 409,
      message: "Solo se puede editar el carrier en un shipment borrador.",
      errors: [
        {
          field: "status",
          code: "SHIPMENT_NOT_EDITABLE",
          message: "Solo se puede editar el carrier en un shipment borrador.",
        },
      ],
    };
  }

  const clearBranch = shipment.carrier !== carrier || carrier === null;
  const updatedShipment = await updateShipmentCarrier(shipmentId, carrier, { clearBranch });
  const order = await getOrderById(updatedShipment.orderId);

  return {
    ok: true as const,
    shipment: order ? mapShipment(order, updatedShipment) : null,
  };
}

export async function updateShipmentBranchForShipment(
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
  const shipment = await getShipmentById(shipmentId);

  if (!shipment) {
    return {
      ok: false as const,
      status: 404,
      message: "El shipment no existe.",
      errors: [{ field: "shipmentId", code: "SHIPMENT_NOT_FOUND", message: "El shipment no existe." }],
    };
  }

  if (!canMutateShipment(shipment.status)) {
    return {
      ok: false as const,
      status: 409,
      message: "Solo se puede editar la sucursal en un shipment borrador.",
      errors: [
        {
          field: "status",
          code: "SHIPMENT_NOT_EDITABLE",
          message: "Solo se puede editar la sucursal en un shipment borrador.",
        },
      ],
    };
  }

  if (shipment.shippingMethod !== SHIPPING_METHODS.CITY_BRANCH) {
    return {
      ok: false as const,
      status: 409,
      message: "La sucursal solo se puede editar para envios a sucursal.",
      errors: [
        {
          field: "shippingMethod",
          code: "BRANCH_NOT_APPLICABLE",
          message: "La sucursal solo se puede editar para envios a sucursal.",
        },
      ],
    };
  }

  if (!shipment.carrier) {
    return {
      ok: false as const,
      status: 409,
      message: "Primero selecciona un carrier.",
      errors: [
        {
          field: "carrier",
          code: "CARRIER_REQUIRED",
          message: "Primero selecciona un carrier.",
        },
      ],
    };
  }

  const updatedShipment = await updateShipmentBranchRecord(shipmentId, {
    branchExternalId: normalizeString(input.branchExternalId) || null,
    branchCode: normalizeString(input.branchCode) || null,
    branchName: normalizeString(input.branchName) || null,
    branchAddress: normalizeString(input.branchAddress) || null,
    branchCity: normalizeString(input.branchCity) || null,
    branchProvince: normalizeString(input.branchProvince) || null,
    branchPostalCode: normalizeString(input.branchPostalCode) || null,
  });
  const order = await getOrderById(updatedShipment.orderId);

  return {
    ok: true as const,
    shipment: order ? mapShipment(order, updatedShipment) : null,
  };
}

export async function clearShipmentBranchForShipment(shipmentId: string) {
  const shipment = await getShipmentById(shipmentId);

  if (!shipment) {
    return {
      ok: false as const,
      status: 404,
      message: "El shipment no existe.",
    };
  }

  if (!canMutateShipment(shipment.status)) {
    return {
      ok: false as const,
      status: 409,
      message: "Solo se puede limpiar la sucursal en un shipment borrador.",
      errors: [
        {
          field: "status",
          code: "SHIPMENT_NOT_EDITABLE",
          message: "Solo se puede limpiar la sucursal en un shipment borrador.",
        },
      ],
    };
  }

  const clearedShipment = await clearShipmentBranch(shipmentId);
  const order = await getOrderById(clearedShipment.orderId);

  return {
    ok: true as const,
    shipment: order ? mapShipment(order, clearedShipment) : null,
  };
}

export async function createShipmentParcelForShipment(shipmentId: string) {
  const shipment = await getShipmentById(shipmentId);

  if (!shipment) {
    return {
      ok: false as const,
      status: 404,
      message: "El shipment no existe.",
    };
  }

  if (!canMutateShipment(shipment.status)) {
    return {
      ok: false as const,
      status: 409,
      message: "Solo se pueden agregar bultos en un shipment borrador.",
      errors: [
        {
          field: "status",
          code: "SHIPMENT_NOT_EDITABLE",
          message: "Solo se pueden agregar bultos en un shipment borrador.",
        },
      ],
    };
  }

  const createdParcel = await createShipmentParcel(shipmentId);

  return {
    ok: true as const,
    parcel: mapParcel(createdParcel),
  };
}

export async function updateShipmentParcelForShipment(
  parcelId: string,
  input: {
    calculatedWeightGrams?: number | null;
    weightGrams: number | null;
    heightCm: number | null;
    widthCm: number | null;
    depthCm: number | null;
  },
) {
  const parcel = await prisma.parcel.findUnique({
    where: { id: parcelId },
    select: {
      id: true,
      shipmentId: true,
    },
  });

  if (!parcel) {
    return {
      ok: false as const,
      status: 404,
      message: "El bulto no existe.",
    };
  }

  const shipment = await getShipmentById(parcel.shipmentId);

  if (!shipment) {
    return {
      ok: false as const,
      status: 404,
      message: "El shipment no existe.",
    };
  }

  if (!canMutateShipment(shipment.status)) {
    return {
      ok: false as const,
      status: 409,
      message: "Solo se pueden editar bultos en un shipment borrador.",
      errors: [
        {
          field: "status",
          code: "SHIPMENT_NOT_EDITABLE",
          message: "Solo se pueden editar bultos en un shipment borrador.",
        },
      ],
    };
  }

  const updatedParcel = await updateShipmentParcel(parcelId, input);

  return {
    ok: true as const,
    parcel: mapParcel(updatedParcel),
  };
}

export async function deleteShipmentParcelForShipment(parcelId: string) {
  const parcel = await prisma.parcel.findUnique({
    where: { id: parcelId },
    select: {
      id: true,
      shipmentId: true,
    },
  });

  if (!parcel) {
    return {
      ok: false as const,
      status: 404,
      message: "El bulto no existe.",
    };
  }

  const shipment = await getShipmentById(parcel.shipmentId);

  if (!shipment) {
    return {
      ok: false as const,
      status: 404,
      message: "El shipment no existe.",
    };
  }

  if (!canMutateShipment(shipment.status)) {
    return {
      ok: false as const,
      status: 409,
      message: "Solo se pueden eliminar bultos en un shipment borrador.",
      errors: [
        {
          field: "status",
          code: "SHIPMENT_NOT_EDITABLE",
          message: "Solo se pueden eliminar bultos en un shipment borrador.",
        },
      ],
    };
  }

  const deletedShipment = await deleteShipmentParcel(parcelId);

  if (!deletedShipment) {
    return {
      ok: false as const,
      status: 404,
      message: "El bulto no existe.",
    };
  }

  const order = await getOrderById(deletedShipment.orderId);

  return {
    ok: true as const,
    shipment: order ? mapShipment(order, deletedShipment) : null,
  };
}

export async function markShipmentReady(shipmentId: string) {
  const shipment = await traceAsync("admin.shipments", "query_shipment_for_ready", async () => {
    return getShipmentById(shipmentId);
  }, { shipmentId });

  if (!shipment) {
    return {
      ok: false as const,
      status: 404,
      message: "El shipment no existe.",
      errors: [{ field: "shipmentId", code: "SHIPMENT_NOT_FOUND", message: "El shipment no existe." }],
    };
  }

  const order = await traceAsync("admin.shipments", "query_order_for_ready_validation", async () => {
    return getOrderById(shipment.orderId);
  }, { orderId: shipment.orderId, shipmentId });

  if (!order) {
    return {
      ok: false as const,
      status: 404,
      message: "La orden asociada al shipment no existe.",
      errors: [{ field: "orderId", code: "ORDER_NOT_FOUND", message: "La orden asociada al shipment no existe." }],
    };
  }

  const readinessErrors = await traceAsync("admin.shipments", "validate_readiness", async () => {
    return validateShipmentReadiness(order, {
      carrier: shipment.carrier,
      status: shipment.status,
      shippingMethod: shipment.shippingMethod as ShippingMethod,
      branchExternalId: shipment.branchExternalId,
      branchCode: shipment.branchCode,
      branchName: shipment.branchName,
      branchAddress: shipment.branchAddress,
      branchCity: shipment.branchCity,
      branchProvince: shipment.branchProvince,
      branchPostalCode: shipment.branchPostalCode,
      parcels: shipment.parcels,
    });
  }, { orderId: shipment.orderId, shipmentId });

  if (readinessErrors.length > 0) {
    const message = "Revisa los errores de readiness antes de marcar el shipment como listo.";

    await updateShipmentDraftErrorMessage(shipmentId, message);

    return {
      ok: false as const,
      status: 409,
      message,
      errors: readinessErrors,
    };
  }

  const readyAt = shipment.readyAt ?? new Date();
  const updatedShipment = await updateShipmentDraftStatusReady(shipmentId, readyAt);

  return {
    ok: true as const,
    shipment: mapShipment(order, updatedShipment),
  };
}

export async function getShipmentHistoryForOrder(orderId: string) {
  const order = await getOrderById(orderId);

  if (!order) {
    return null;
  }

  const shipments = await getShipmentsByOrderId(orderId);

  return shipments.map((shipment) => mapShipment(order, shipment));
}
