import type { CheckoutFormValues } from "@/features/checkout/types";
import type { CreateOrderInput } from "@/features/order/types";

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
  };
}

export function validateOrderCustomer(values: CheckoutFormValues) {
  const errors: string[] = [];

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

  if (!values.address) {
    errors.push("La direccion es obligatoria.");
  }

  if (!values.city) {
    errors.push("La localidad es obligatoria.");
  }

  if (!values.province) {
    errors.push("La provincia es obligatoria.");
  }

  if (!values.postalCode) {
    errors.push("El codigo postal es obligatorio.");
  } else if (!POSTAL_CODE_PATTERN.test(values.postalCode)) {
    errors.push("El codigo postal no es valido.");
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
