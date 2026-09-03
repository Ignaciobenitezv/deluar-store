import { SHIPMENT_STATUSES, type ShipmentReadinessIssue } from "../types";
import type { Order } from "@/features/order/types";
import {
  isPickupShippingMethod,
  SHIPPING_METHODS,
  type ShippingMethod,
} from "@/features/shipping/shipping";

type ShipmentReadinessParcel = {
  calculatedWeightGrams: number | null;
  weightGrams: number | null;
  heightCm: number | null;
  widthCm: number | null;
  depthCm: number | null;
};

type ShipmentReadinessShipment = {
  carrier: string | null;
  status: string;
  shippingMethod: ShippingMethod;
  branchExternalId: string | null;
  branchCode: string | null;
  branchName: string | null;
  branchAddress: string | null;
  branchCity: string | null;
  branchProvince: string | null;
  branchPostalCode: string | null;
  parcels: ShipmentReadinessParcel[];
};

function hasPositiveNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function requireField(
  issues: ShipmentReadinessIssue[],
  condition: boolean,
  field: string,
  code: string,
  message: string,
) {
  if (!condition) {
    issues.push({ field, code, message });
  }
}

function requireBranchField(
  issues: ShipmentReadinessIssue[],
  value: string | null | undefined,
  field: string,
  code: string,
  message: string,
) {
  requireField(issues, Boolean(value?.trim()), field, code, message);
}

function getRecipient(order: Order) {
  const shippingAddress = order.shippingAddress;

  return {
    firstName: shippingAddress.firstName?.trim() || order.customer.firstName?.trim() || "",
    lastName: shippingAddress.lastName?.trim() || order.customer.lastName?.trim() || "",
    email: shippingAddress.email?.trim() || order.customer.email?.trim() || "",
    phone: shippingAddress.phone?.trim() || order.customer.phone?.trim() || "",
    phoneAreaCode: shippingAddress.phoneAreaCode?.trim() || "",
    phoneNumber: shippingAddress.phoneNumber?.trim() || "",
    dni: shippingAddress.dni?.trim() || "",
    street: shippingAddress.street?.trim() || "",
    streetNumber: shippingAddress.streetNumber?.trim() || "",
    city: shippingAddress.city?.trim() || "",
    province: shippingAddress.province?.trim() || "",
    postalCode: shippingAddress.postalCode?.trim() || "",
  };
}

function validateParcel(parcel: ShipmentReadinessParcel, index: number, issues: ShipmentReadinessIssue[]) {
  const parcelPrefix = `parcels[${index}]`;

  requireField(
    issues,
    hasPositiveNumber(parcel.weightGrams),
    `${parcelPrefix}.weightGrams`,
    "PARCEL_WEIGHT_REQUIRED",
    "Cada bulto debe tener peso confirmado mayor a cero.",
  );
  requireField(
    issues,
    hasPositiveNumber(parcel.heightCm),
    `${parcelPrefix}.heightCm`,
    "PARCEL_HEIGHT_REQUIRED",
    "Cada bulto debe tener alto confirmado mayor a cero.",
  );
  requireField(
    issues,
    hasPositiveNumber(parcel.widthCm),
    `${parcelPrefix}.widthCm`,
    "PARCEL_WIDTH_REQUIRED",
    "Cada bulto debe tener ancho confirmado mayor a cero.",
  );
  requireField(
    issues,
    hasPositiveNumber(parcel.depthCm),
    `${parcelPrefix}.depthCm`,
    "PARCEL_DEPTH_REQUIRED",
    "Cada bulto debe tener profundidad confirmada mayor a cero.",
  );
}

export function validateShipmentReadiness(order: Order, shipment: ShipmentReadinessShipment) {
  const issues: ShipmentReadinessIssue[] = [];
  const recipient = getRecipient(order);
  const shippingMethod = shipment.shippingMethod;

  requireField(
    issues,
    shipment.status === SHIPMENT_STATUSES.DRAFT || shipment.status === SHIPMENT_STATUSES.READY,
    "status",
    "INVALID_STATUS",
    "Solo se puede validar un shipment en estado borrador o listo.",
  );

  requireField(
    issues,
    Boolean(shipment.carrier),
    "carrier",
    "CARRIER_REQUIRED",
    "Selecciona un transportista.",
  );

  requireField(
    issues,
    shipment.parcels.length > 0,
    "parcels",
    "PARCEL_REQUIRED",
    "Agrega al menos un bulto.",
  );

  shipment.parcels.forEach((parcel, index) => {
    validateParcel(parcel, index, issues);
  });

  requireField(
    issues,
    Boolean(recipient.firstName),
    "recipient.firstName",
    "RECIPIENT_FIRST_NAME_REQUIRED",
    "El nombre del destinatario es obligatorio.",
  );
  requireField(
    issues,
    Boolean(recipient.lastName),
    "recipient.lastName",
    "RECIPIENT_LAST_NAME_REQUIRED",
    "El apellido del destinatario es obligatorio.",
  );
  requireField(
    issues,
    Boolean(recipient.email),
    "recipient.email",
    "RECIPIENT_EMAIL_REQUIRED",
    "El email del destinatario es obligatorio.",
  );
  requireField(
    issues,
    Boolean(recipient.phone),
    "recipient.phone",
    "RECIPIENT_PHONE_REQUIRED",
    "El telefono del destinatario es obligatorio.",
  );
  requireField(
    issues,
    Boolean(recipient.phoneAreaCode),
    "recipient.phoneAreaCode",
    "RECIPIENT_PHONE_AREA_CODE_REQUIRED",
    "El codigo de area es obligatorio.",
  );
  requireField(
    issues,
    Boolean(recipient.phoneNumber),
    "recipient.phoneNumber",
    "RECIPIENT_PHONE_NUMBER_REQUIRED",
    "El numero de telefono es obligatorio.",
  );

  if (!isPickupShippingMethod(shippingMethod)) {
    requireField(
      issues,
      Boolean(recipient.dni),
      "recipient.dni",
      "RECIPIENT_DNI_REQUIRED",
      "El DNI del destinatario es obligatorio.",
    );
  }

  if (shippingMethod === SHIPPING_METHODS.HOME_DELIVERY) {
    requireField(
      issues,
      Boolean(recipient.street),
      "recipient.street",
      "ADDRESS_REQUIRED",
      "La calle es obligatoria para envio a domicilio.",
    );
    requireField(
      issues,
      Boolean(recipient.streetNumber),
      "recipient.streetNumber",
      "ADDRESS_REQUIRED",
      "La altura es obligatoria para envio a domicilio.",
    );
    requireField(
      issues,
      Boolean(recipient.city),
      "recipient.city",
      "ADDRESS_REQUIRED",
      "La localidad es obligatoria para envio a domicilio.",
    );
    requireField(
      issues,
      Boolean(recipient.province),
      "recipient.province",
      "ADDRESS_REQUIRED",
      "La provincia es obligatoria para envio a domicilio.",
    );
    requireField(
      issues,
      Boolean(recipient.postalCode),
      "recipient.postalCode",
      "ADDRESS_REQUIRED",
      "El codigo postal es obligatorio para envio a domicilio.",
    );
  }

  if (shippingMethod === SHIPPING_METHODS.CITY_BRANCH) {
    requireBranchField(
      issues,
      shipment.branchExternalId,
      "branchExternalId",
      "BRANCH_EXTERNAL_ID_REQUIRED",
      "El identificador externo de la sucursal es obligatorio.",
    );
    requireBranchField(
      issues,
      shipment.branchName,
      "branchName",
      "BRANCH_NAME_REQUIRED",
      "El nombre de la sucursal es obligatorio.",
    );
    requireBranchField(
      issues,
      shipment.branchAddress,
      "branchAddress",
      "BRANCH_ADDRESS_REQUIRED",
      "La direccion de la sucursal es obligatoria.",
    );
    requireBranchField(
      issues,
      shipment.branchCity,
      "branchCity",
      "BRANCH_CITY_REQUIRED",
      "La localidad de la sucursal es obligatoria.",
    );
    requireBranchField(
      issues,
      shipment.branchProvince,
      "branchProvince",
      "BRANCH_PROVINCE_REQUIRED",
      "La provincia de la sucursal es obligatoria.",
    );
    requireBranchField(
      issues,
      shipment.branchPostalCode,
      "branchPostalCode",
      "BRANCH_POSTAL_CODE_REQUIRED",
      "El codigo postal de la sucursal es obligatorio.",
    );
  }

  if (isPickupShippingMethod(shippingMethod)) {
    issues.push({
      field: "shippingMethod",
      code: "PICKUP_DOES_NOT_REQUIRE_SHIPMENT",
      message: "El retiro local no requiere preparacion de shipment.",
    });
  }

  return issues;
}

type ShipmentItemLike = {
  weightGrams?: number | null;
  heightCm?: number | null;
  widthCm?: number | null;
  depthCm?: number | null;
  quantity: number;
};

export function buildInitialShipmentParcel(items: ShipmentItemLike[]) {
  if (items.length === 0) {
    return {
      calculatedWeightGrams: null,
      weightGrams: null,
      heightCm: null,
      widthCm: null,
      depthCm: null,
    };
  }

  const allItemsHaveWeight = items.every((item) => hasPositiveNumber(item.weightGrams));
  const allItemsHaveDimensions = items.every(
    (item) =>
      hasPositiveNumber(item.heightCm) &&
      hasPositiveNumber(item.widthCm) &&
      hasPositiveNumber(item.depthCm),
  );

  const totalWeight = allItemsHaveWeight
    ? items.reduce((accumulator, item) => accumulator + (item.weightGrams ?? 0) * item.quantity, 0)
    : null;

  if (items.length === 1) {
    const item = items[0]!;

    if (item.quantity === 1) {
      return {
        calculatedWeightGrams: totalWeight,
        weightGrams: totalWeight,
        heightCm: allItemsHaveDimensions ? item.heightCm ?? null : null,
        widthCm: allItemsHaveDimensions ? item.widthCm ?? null : null,
        depthCm: allItemsHaveDimensions ? item.depthCm ?? null : null,
      };
    }
  }

  if (!allItemsHaveDimensions) {
    return {
      calculatedWeightGrams: totalWeight,
      weightGrams: totalWeight,
      heightCm: null,
      widthCm: null,
      depthCm: null,
    };
  }

  const normalizedItems = items.map((item) => {
    const dimensions = [item.heightCm ?? 0, item.widthCm ?? 0, item.depthCm ?? 0].sort((a, b) => b - a);

    return {
      long: dimensions[0] ?? 0,
      mid: dimensions[1] ?? 0,
      short: dimensions[2] ?? 0,
      quantity: item.quantity,
    };
  });

  const depthCm = Math.max(...normalizedItems.map((item) => item.long));
  const widthCm = Math.max(...normalizedItems.map((item) => item.mid));
  const volumeTotal = normalizedItems.reduce(
    (accumulator, item) => accumulator + item.long * item.mid * item.short * item.quantity,
    0,
  );
  const baseArea = depthCm * widthCm;
  const heightCm = baseArea > 0 ? Math.max(1, Math.ceil(volumeTotal / baseArea)) : null;

  return {
    calculatedWeightGrams: totalWeight,
    weightGrams: totalWeight,
    heightCm,
    widthCm,
    depthCm,
  };
}
