import type { CheckoutFormValues } from "@/features/checkout/types";
import type { CreateOrderInput } from "@/features/order/types";
import {
  DEFAULT_CHECKOUT_PAYMENT_METHOD,
  PAYMENT_METHODS,
  normalizeCheckoutPaymentMethod,
  isEnabledCheckoutPaymentMethod,
  isUnicobrosEnabled,
} from "@/features/payments/types";
import {
  isShippingMethod,
  normalizeShippingMethod,
  requiresLocationFields,
  requiresStreetAddress,
  SHIPPING_METHODS,
} from "@/features/shipping/shipping";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[\d\s()+\-./]{6,25}$/;
const PHONE_AREA_CODE_PATTERN = /^[\d\s()+\-./]{2,12}$/;
const PHONE_NUMBER_PATTERN = /^[\d\s()+\-./]{6,15}$/;
const DNI_PATTERN = /^[\d\s.-]{7,12}$/;
const STREET_NUMBER_PATTERN = /^[\d\s.-]{1,10}$/;
const POSTAL_CODE_PATTERN = /^[A-Za-z0-9\s-]{3,12}$/;

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function normalizeDni(value: string) {
  return normalizeDigits(value);
}

export function normalizePhoneAreaCode(value: string) {
  return normalizeDigits(value).replace(/^0+/, "");
}

export function normalizePhoneNumber(value: string) {
  return normalizeDigits(value).replace(/^15/, "");
}

function buildLegacyAddress(values: Pick<
  CheckoutFormValues,
  "street" | "streetNumber" | "floor" | "apartment" | "city" | "province" | "postalCode"
>) {
  const streetLine = [values.street, values.streetNumber].filter(Boolean).join(" ").trim();
  const floorLine = [values.floor ? `Piso ${values.floor}` : "", values.apartment ? `Depto ${values.apartment}` : ""]
    .filter(Boolean)
    .join(", ")
    .trim();
  const locationLine = [values.city, values.province, values.postalCode].filter(Boolean).join(", ").trim();

  return [streetLine, floorLine, locationLine].filter(Boolean).join(" | ");
}

function readPositiveInteger(value: unknown) {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return 0;
  }

  return value > 0 ? value : 0;
}

export function normalizeCheckoutCustomer(
  input: CreateOrderInput["customer"],
): CheckoutFormValues {
  return {
    firstName: readString(input?.firstName),
    lastName: readString(input?.lastName),
    dni: readString(input?.dni),
    email: readString(input?.email),
    phone: readString(input?.phone),
    phoneAreaCode: readString(input?.phoneAreaCode),
    phoneNumber: readString(input?.phoneNumber),
    street: readString(input?.street),
    streetNumber: readString(input?.streetNumber),
    floor: readString(input?.floor),
    apartment: readString(input?.apartment),
    city: readString(input?.city),
    province: readString(input?.province),
    postalCode: readString(input?.postalCode),
    notes: readString(input?.notes),
    shippingMethod: normalizeShippingMethod(input?.shippingMethod),
    paymentMethod: DEFAULT_CHECKOUT_PAYMENT_METHOD,
  };
}

export function normalizeOrderPaymentMethod(input: CreateOrderInput["paymentMethod"]) {
  return normalizeCheckoutPaymentMethod(input);
}

export function normalizeOrderShippingMethod(input: CreateOrderInput["shippingMethod"]) {
  return normalizeShippingMethod(input);
}

export function validateOrderPaymentMethod(paymentMethod: unknown) {
  if (paymentMethod === undefined || paymentMethod === null || paymentMethod === "") {
    return [];
  }

  if (paymentMethod === PAYMENT_METHODS.UNICOBROS && !isUnicobrosEnabled) {
    return ["Unicobros no esta habilitado en este entorno."];
  }

  return isEnabledCheckoutPaymentMethod(paymentMethod)
    ? []
    : ["El metodo de pago seleccionado no esta disponible."];
}

export function validateOrderShippingMethod(shippingMethod: unknown) {
  if (shippingMethod === undefined || shippingMethod === null || shippingMethod === "") {
    return [];
  }

  return isShippingMethod(shippingMethod)
    ? []
    : ["El metodo de envio seleccionado no esta disponible."];
}

export function validateOrderCustomer(values: CheckoutFormValues) {
  const errors: string[] = [];
  const addressRequired = requiresStreetAddress(values.shippingMethod);
  const locationRequired = requiresLocationFields(values.shippingMethod);
  const dniRequired = values.shippingMethod !== SHIPPING_METHODS.RESISTANCE_PICKUP;

  if (!values.firstName) {
    errors.push("El nombre es obligatorio.");
  }

  if (!values.lastName) {
    errors.push("El apellido es obligatorio.");
  }

  if (!values.email) {
    errors.push("El email es obligatorio.");
  } else if (!EMAIL_PATTERN.test(values.email)) {
    errors.push("El email no es valido.");
  }

  if (!values.phone) {
    errors.push("El telefono es obligatorio.");
  } else if (!PHONE_PATTERN.test(values.phone)) {
    errors.push("El telefono no es valido.");
  }

  if (!values.phoneAreaCode) {
    errors.push("El codigo de area es obligatorio.");
  } else if (!PHONE_AREA_CODE_PATTERN.test(values.phoneAreaCode)) {
    errors.push("El codigo de area no es valido.");
  }

  if (!values.phoneNumber) {
    errors.push("El numero de telefono es obligatorio.");
  } else if (!PHONE_NUMBER_PATTERN.test(values.phoneNumber)) {
    errors.push("El numero de telefono no es valido.");
  }

  if (dniRequired && !values.dni) {
    errors.push("El DNI es obligatorio.");
  } else if (dniRequired && !DNI_PATTERN.test(values.dni)) {
    errors.push("El DNI no es valido.");
  }

  if (addressRequired && !values.street) {
    errors.push("La calle es obligatoria.");
  }

  if (addressRequired && !values.streetNumber) {
    errors.push("La altura es obligatoria.");
  } else if (addressRequired && !STREET_NUMBER_PATTERN.test(values.streetNumber)) {
    errors.push("La altura no es valida.");
  }

  if (locationRequired && !values.city) {
    errors.push("La localidad es obligatoria.");
  }

  if (locationRequired && !values.province) {
    errors.push("La provincia es obligatoria.");
  }

  if (locationRequired && !values.postalCode) {
    errors.push("El codigo postal es obligatorio.");
  } else if (locationRequired && !POSTAL_CODE_PATTERN.test(values.postalCode)) {
    errors.push("El codigo postal no es valido.");
  }

  if (!values.shippingMethod || !isShippingMethod(values.shippingMethod)) {
    errors.push("El metodo de envio es obligatorio.");
  }

  return errors;
}

export function buildOrderShippingAddressSnapshot(values: CheckoutFormValues) {
  const phoneAreaCode = normalizePhoneAreaCode(values.phoneAreaCode);
  const phoneNumber = normalizePhoneNumber(values.phoneNumber);
  const dni = normalizeDni(values.dni);

  return {
    firstName: readString(values.firstName),
    lastName: readString(values.lastName),
    dni,
    email: readString(values.email),
    phone: readString(values.phone),
    phoneAreaCode,
    phoneNumber,
    street: readString(values.street),
    streetNumber: readString(values.streetNumber),
    floor: readString(values.floor),
    apartment: readString(values.apartment),
    city: readString(values.city),
    province: readString(values.province),
    postalCode: readString(values.postalCode),
    notes: readString(values.notes),
    address: buildLegacyAddress(values),
  };
}

export function normalizeOrderItems(input: CreateOrderInput["items"]) {
  return Array.isArray(input)
    ? input.map((item) => ({
        id: readString(item?.id),
        slug: readString(item?.slug),
        quantity: readPositiveInteger(item?.quantity),
      }))
    : [];
}

export function validateOrderItems(
  items: ReturnType<typeof normalizeOrderItems>,
) {
  const errors: string[] = [];

  if (items.length === 0) {
    errors.push("Debes enviar al menos un producto.");
    return errors;
  }

  items.forEach((item, index) => {
    if (!item.slug) {
      errors.push(`El item ${index + 1} no tiene slug.`);
    }

    if (item.quantity <= 0) {
      errors.push(`La cantidad del item ${index + 1} debe ser mayor a cero.`);
    } else if (item.quantity > 10) {
      errors.push(`La cantidad del item ${index + 1} no puede superar 10 unidades.`);
    }
  });

  return errors;
}
