import type { CheckoutFormErrors, CheckoutFormValues } from "@/features/checkout/types";
import { DEFAULT_CHECKOUT_PAYMENT_METHOD } from "@/features/payments/types";
import {
  requiresLocationFields,
  requiresStreetAddress,
  SHIPPING_METHODS,
} from "@/features/shipping/shipping";

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
    shippingMethod: SHIPPING_METHODS.HOME_DELIVERY,
    paymentMethod: DEFAULT_CHECKOUT_PAYMENT_METHOD,
  };
}

export function validateCheckoutForm(values: CheckoutFormValues): CheckoutFormErrors {
  const errors: CheckoutFormErrors = {};
  const addressRequired = requiresStreetAddress(values.shippingMethod);
  const locationRequired = requiresLocationFields(values.shippingMethod);

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

  if (addressRequired && isBlank(values.address)) {
    errors.address = "Ingresa la direccion.";
  }

  if (locationRequired && isBlank(values.city)) {
    errors.city = "Ingresa la localidad.";
  }

  if (locationRequired && isBlank(values.province)) {
    errors.province = "Ingresa la provincia.";
  }

  if (locationRequired && isBlank(values.postalCode)) {
    errors.postalCode = "Ingresa el codigo postal.";
  }

  if (!values.shippingMethod) {
    errors.shippingMethod = "Selecciona un metodo de envio.";
  }

  return errors;
}
