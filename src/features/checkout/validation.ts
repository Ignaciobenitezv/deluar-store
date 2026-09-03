import type { CheckoutFormErrors, CheckoutFormValues } from "@/features/checkout/types";
import { DEFAULT_CHECKOUT_PAYMENT_METHOD } from "@/features/payments/types";
import {
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

function isBlank(value: string) {
  return value.trim().length === 0;
}

export function getInitialCheckoutFormValues(): CheckoutFormValues {
  return {
    firstName: "",
    lastName: "",
    dni: "",
    email: "",
    phone: "",
    phoneAreaCode: "",
    phoneNumber: "",
    street: "",
    streetNumber: "",
    floor: "",
    apartment: "",
    city: "",
    province: "",
    postalCode: "",
    notes: "",
    shippingMethod: SHIPPING_METHODS.HOME_DELIVERY,
    paymentMethod: DEFAULT_CHECKOUT_PAYMENT_METHOD,
  };
}

export function validateCheckoutForm(values: CheckoutFormValues): CheckoutFormErrors {
  const errors: CheckoutFormErrors = {};
  const addressRequired = requiresStreetAddress(values.shippingMethod);
  const locationRequired = requiresLocationFields(values.shippingMethod);
  const dniRequired = values.shippingMethod !== SHIPPING_METHODS.RESISTANCE_PICKUP;

  if (isBlank(values.firstName)) {
    errors.firstName = "Ingresa el nombre.";
  }

  if (isBlank(values.lastName)) {
    errors.lastName = "Ingresa el apellido.";
  }

  if (dniRequired && isBlank(values.dni)) {
    errors.dni = "Ingresa el DNI.";
  } else if (dniRequired && !DNI_PATTERN.test(values.dni.trim())) {
    errors.dni = "Ingresa un DNI valido.";
  }

  if (isBlank(values.email)) {
    errors.email = "Ingresa el email.";
  } else if (!EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = "Ingresa un email valido.";
  }

  if (isBlank(values.phone)) {
    errors.phone = "Ingresa el telefono.";
  } else if (!PHONE_PATTERN.test(values.phone.trim())) {
    errors.phone = "Ingresa un telefono valido.";
  }

  if (isBlank(values.phoneAreaCode)) {
    errors.phoneAreaCode = "Ingresa el codigo de area.";
  } else if (!PHONE_AREA_CODE_PATTERN.test(values.phoneAreaCode.trim())) {
    errors.phoneAreaCode = "Ingresa un codigo de area valido.";
  }

  if (isBlank(values.phoneNumber)) {
    errors.phoneNumber = "Ingresa el numero de telefono.";
  } else if (!PHONE_NUMBER_PATTERN.test(values.phoneNumber.trim())) {
    errors.phoneNumber = "Ingresa un numero de telefono valido.";
  }

  if (addressRequired && isBlank(values.street)) {
    errors.street = "Ingresa la calle.";
  }

  if (addressRequired && isBlank(values.streetNumber)) {
    errors.streetNumber = "Ingresa la altura.";
  } else if (addressRequired && !STREET_NUMBER_PATTERN.test(values.streetNumber.trim())) {
    errors.streetNumber = "Ingresa una altura valida.";
  }

  if (locationRequired && isBlank(values.city)) {
    errors.city = "Ingresa la localidad.";
  }

  if (locationRequired && isBlank(values.province)) {
    errors.province = "Ingresa la provincia.";
  }

  if (locationRequired && isBlank(values.postalCode)) {
    errors.postalCode = "Ingresa el codigo postal.";
  } else if (locationRequired && !POSTAL_CODE_PATTERN.test(values.postalCode.trim())) {
    errors.postalCode = "Ingresa un codigo postal valido.";
  }

  if (!values.shippingMethod) {
    errors.shippingMethod = "Selecciona un metodo de envio.";
  }

  return errors;
}
