import type { CheckoutFormValues } from "@/features/checkout/types";
import type { CreateOrderInput } from "@/features/order/types";
import {
  DEFAULT_CHECKOUT_PAYMENT_METHOD,
  PAYMENT_METHODS,
  normalizeCheckoutPaymentMethod,
  isEnabledCheckoutPaymentMethod,
  isGetnetEnabled,
} from "@/features/payments/types";
import {
  isPickupShippingMethod,
  isShippingMethod,
  normalizeShippingMethod,
  requiresLocationFields,
  requiresStreetAddress,
} from "@/features/shipping/shipping";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[\d\s()+-]{6,25}$/;
const POSTAL_CODE_PATTERN = /^[A-Za-z0-9\s-]{3,12}$/;

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readPositiveInteger(value: unknown) {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return 0;
  }

  return value > 0 ? value : 0;
}

export function sanitizeShippingFields(
  values: Pick<
    CheckoutFormValues,
    "address" | "city" | "province" | "postalCode" | "shippingMethod"
  >,
) {
  if (isPickupShippingMethod(values.shippingMethod)) {
    return {
      address: "",
      city: "",
      province: "",
      postalCode: "",
    };
  }

  if (!requiresStreetAddress(values.shippingMethod)) {
    return {
      address: "",
      city: values.city,
      province: values.province,
      postalCode: values.postalCode,
    };
  }

  return {
    address: values.address,
    city: values.city,
    province: values.province,
    postalCode: values.postalCode,
  };
}

export function normalizeCheckoutCustomer(
  input: CreateOrderInput["customer"],
): CheckoutFormValues {
  return {
    firstName: readString(input?.firstName),
    lastName: readString(input?.lastName),
    email: readString(input?.email),
    phone: readString(input?.phone),
    address: readString(input?.address),
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

  if (paymentMethod === PAYMENT_METHODS.GETNET && !isGetnetEnabled) {
    return ["Getnet no esta habilitado en este entorno."];
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

  if (addressRequired && !values.address) {
    errors.push("La direccion es obligatoria.");
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
