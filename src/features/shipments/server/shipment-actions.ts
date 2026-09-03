"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/features/admin/auth";
import {
  createShipmentParcelForShipment,
  deleteShipmentParcelForShipment,
  markShipmentReady,
  prepareShipment,
  updateShipmentRecipientForOrder,
  updateShipmentBranchForShipment,
  updateShipmentCarrierForOrderShipment,
  updateShipmentParcelForShipment,
} from "./shipment-service";
import { SHIPMENT_CARRIERS, type ShipmentActionState, type ShipmentCarrier } from "../types";
import type { ShipmentReadinessIssue } from "../types";

const INITIAL_STATE: ShipmentActionState = {
  status: "idle",
};

function parseString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function parseNullableInt(value: FormDataEntryValue | null) {
  const raw = parseString(value);

  if (!raw) {
    return null;
  }

  const parsed = Number.parseInt(raw, 10);

  return Number.isFinite(parsed) ? parsed : null;
}

function parseCarrier(value: string): ShipmentCarrier | null {
  if (value === SHIPMENT_CARRIERS.ANDREANI || value === SHIPMENT_CARRIERS.CORREO_ARGENTINO) {
    return value;
  }

  return null;
}

function toErrorState(message: string, errors?: ShipmentReadinessIssue[]): ShipmentActionState {
  return {
    status: "error",
    message,
    errors,
  };
}

function toSuccessState(message: string): ShipmentActionState {
  return {
    status: "success",
    message,
  };
}

export async function prepareShipmentAction(
  previousState: ShipmentActionState = INITIAL_STATE,
  formData: FormData,
): Promise<ShipmentActionState> {
  void previousState;

  await requireAdminSession();

  const orderId = parseString(formData.get("orderId"));

  if (!orderId) {
    return toErrorState("Debes enviar un orderId valido.");
  }

  const result = await prepareShipment(orderId);

  if (!result.ok) {
    return toErrorState(result.message, result.errors);
  }

  revalidatePath("/admin/envios");
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);

  return toSuccessState(result.reused ? "Se reutilizo el shipment borrador existente." : "Shipment preparado.");
}

export async function markShipmentReadyAction(
  previousState: ShipmentActionState = INITIAL_STATE,
  formData: FormData,
): Promise<ShipmentActionState> {
  void previousState;

  await requireAdminSession();

  const shipmentId = parseString(formData.get("shipmentId"));
  const orderId = parseString(formData.get("orderId"));

  if (!shipmentId || !orderId) {
    return toErrorState("Debes enviar un shipmentId y orderId validos.");
  }

  const result = await markShipmentReady(shipmentId);

  if (!result.ok) {
    return toErrorState(result.message, result.errors);
  }

  revalidatePath("/admin/envios");
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);

  return toSuccessState("Shipment marcado como listo.");
}

export async function updateShipmentCarrierAction(
  previousState: ShipmentActionState = INITIAL_STATE,
  formData: FormData,
) {
  void previousState;
  await requireAdminSession();

  const shipmentId = parseString(formData.get("shipmentId"));
  const orderId = parseString(formData.get("orderId"));
  const carrier = parseCarrier(parseString(formData.get("carrier")));

  if (!shipmentId || !orderId) {
    return toErrorState("Debes enviar un shipmentId y orderId validos.");
  }

  const result = await updateShipmentCarrierForOrderShipment(shipmentId, carrier);

  if (!result.ok) {
    return toErrorState(result.message, result.errors);
  }

  revalidatePath("/admin/envios");
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);

  return toSuccessState("Carrier actualizado.");
}

export async function updateShipmentRecipientAction(
  previousState: ShipmentActionState = INITIAL_STATE,
  formData: FormData,
) {
  void previousState;
  await requireAdminSession();

  const orderId = parseString(formData.get("orderId"));

  if (!orderId) {
    return toErrorState("Debes enviar un orderId valido.");
  }

  const result = await updateShipmentRecipientForOrder(orderId, {
    firstName: parseString(formData.get("firstName")),
    lastName: parseString(formData.get("lastName")),
    dni: parseString(formData.get("dni")),
    email: parseString(formData.get("email")),
    phone: parseString(formData.get("phone")),
    phoneAreaCode: parseString(formData.get("phoneAreaCode")),
    phoneNumber: parseString(formData.get("phoneNumber")),
    street: parseString(formData.get("street")),
    streetNumber: parseString(formData.get("streetNumber")),
    floor: parseString(formData.get("floor")),
    apartment: parseString(formData.get("apartment")),
    city: parseString(formData.get("city")),
    province: parseString(formData.get("province")),
    postalCode: parseString(formData.get("postalCode")),
    notes: parseString(formData.get("notes")),
  });

  if (!result.ok) {
    return toErrorState(result.message, result.errors);
  }

  revalidatePath("/admin/envios");
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);

  return toSuccessState("Datos del destinatario actualizados.");
}

export async function updateShipmentBranchAction(
  previousState: ShipmentActionState = INITIAL_STATE,
  formData: FormData,
) {
  void previousState;
  await requireAdminSession();

  const shipmentId = parseString(formData.get("shipmentId"));
  const orderId = parseString(formData.get("orderId"));

  if (!shipmentId || !orderId) {
    return toErrorState("Debes enviar un shipmentId y orderId validos.");
  }

  const result = await updateShipmentBranchForShipment(shipmentId, {
    branchExternalId: parseString(formData.get("branchExternalId")) || null,
    branchCode: parseString(formData.get("branchCode")) || null,
    branchName: parseString(formData.get("branchName")) || null,
    branchAddress: parseString(formData.get("branchAddress")) || null,
    branchCity: parseString(formData.get("branchCity")) || null,
    branchProvince: parseString(formData.get("branchProvince")) || null,
    branchPostalCode: parseString(formData.get("branchPostalCode")) || null,
  });

  if (!result.ok) {
    return toErrorState(result.message, result.errors);
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);

  return toSuccessState("Sucursal actualizada.");
}

export async function addShipmentParcelAction(formData: FormData) {
  await requireAdminSession();

  const shipmentId = parseString(formData.get("shipmentId"));
  const orderId = parseString(formData.get("orderId"));

  if (!shipmentId || !orderId) {
    return;
  }

  await createShipmentParcelForShipment(shipmentId);

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
}

export async function updateShipmentParcelAction(formData: FormData) {
  await requireAdminSession();

  const parcelId = parseString(formData.get("parcelId"));
  const orderId = parseString(formData.get("orderId"));

  if (!parcelId || !orderId) {
    return;
  }

  await updateShipmentParcelForShipment(parcelId, {
    weightGrams: parseNullableInt(formData.get("weightGrams")),
    heightCm: parseNullableInt(formData.get("heightCm")),
    widthCm: parseNullableInt(formData.get("widthCm")),
    depthCm: parseNullableInt(formData.get("depthCm")),
  });

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
}

export async function deleteShipmentParcelAction(formData: FormData) {
  await requireAdminSession();

  const parcelId = parseString(formData.get("parcelId"));
  const orderId = parseString(formData.get("orderId"));

  if (!parcelId || !orderId) {
    return;
  }

  await deleteShipmentParcelForShipment(parcelId);

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
}
