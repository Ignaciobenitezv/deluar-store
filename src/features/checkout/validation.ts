import type { CheckoutFormErrors, CheckoutFormValues } from "@/features/checkout/types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isBlank(value: string) {
  return value.trim().length === 0;
}

export function getInitialCheckoutFormValues(): CheckoutFormValues {
  return {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    province: "",
    postalCode: "",
    notes: "",
  };
}

export function validateCheckoutForm(values: CheckoutFormValues): CheckoutFormErrors {
  const errors: CheckoutFormErrors = {};

  if (isBlank(values.firstName)) {
    errors.firstName = "Ingresa el nombre.";
  }

  if (isBlank(values.lastName)) {
    errors.lastName = "Ingresa el apellido.";
  }

  if (isBlank(values.email)) {
    errors.email = "Ingresa el email.";
  } else if (!EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = "Ingresa un email valido.";
  }

  if (isBlank(values.phone)) {
    errors.phone = "Ingresa el telefono.";
  }

  if (isBlank(values.address)) {
    errors.address = "Ingresa la direccion.";
  }

  if (isBlank(values.city)) {
    errors.city = "Ingresa la localidad.";
  }

  if (isBlank(values.province)) {
    errors.province = "Ingresa la provincia.";
  }

  if (isBlank(values.postalCode)) {
    errors.postalCode = "Ingresa el codigo postal.";
  }

  return errors;
}
