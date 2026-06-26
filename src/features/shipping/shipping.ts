export const SHIPPING_METHODS = {
  HOME_DELIVERY: "home_delivery",
  CITY_BRANCH: "city_branch",
  RESISTANCE_PICKUP: "resistance_pickup",
} as const;

export type ShippingMethod =
  (typeof SHIPPING_METHODS)[keyof typeof SHIPPING_METHODS];

export const SHIPPING_FREE_THRESHOLD = 50_000;

const SHIPPING_LABELS: Record<ShippingMethod, string> = {
  [SHIPPING_METHODS.HOME_DELIVERY]: "Envio a domicilio",
  [SHIPPING_METHODS.CITY_BRANCH]: "Envio a sucursal de tu ciudad",
  [SHIPPING_METHODS.RESISTANCE_PICKUP]: "Retiro en Resistencia",
};

const SHIPPING_DESCRIPTIONS: Record<ShippingMethod, string> = {
  [SHIPPING_METHODS.HOME_DELIVERY]: "Entrega a domicilio en todo el pais.",
  [SHIPPING_METHODS.CITY_BRANCH]: "Retiro en sucursal de tu ciudad.",
  [SHIPPING_METHODS.RESISTANCE_PICKUP]: "Retiro sin costo en Resistencia, Chaco.",
};

export function isShippingMethod(value: unknown): value is ShippingMethod {
  return Object.values(SHIPPING_METHODS).includes(value as ShippingMethod);
}

export function normalizeShippingMethod(value: unknown): ShippingMethod {
  return isShippingMethod(value) ? value : SHIPPING_METHODS.HOME_DELIVERY;
}

export function getShippingMethodLabel(method: ShippingMethod) {
  return SHIPPING_LABELS[method];
}

export function getShippingMethodDescription(method: ShippingMethod) {
  return SHIPPING_DESCRIPTIONS[method];
}

export function requiresStreetAddress(method: ShippingMethod) {
  return method === SHIPPING_METHODS.HOME_DELIVERY;
}

export function requiresLocationFields(method: ShippingMethod) {
  return (
    method === SHIPPING_METHODS.HOME_DELIVERY ||
    method === SHIPPING_METHODS.CITY_BRANCH
  );
}

export function isPickupShippingMethod(method: ShippingMethod) {
  return method === SHIPPING_METHODS.RESISTANCE_PICKUP;
}

export function calculateShippingCost(subtotal: number, method: ShippingMethod) {
  if (method === SHIPPING_METHODS.RESISTANCE_PICKUP) {
    return 0;
  }

  if (method === SHIPPING_METHODS.HOME_DELIVERY) {
    return 10_000;
  }

  return subtotal >= SHIPPING_FREE_THRESHOLD ? 0 : 7_000;
}

export function getShippingOptions(subtotal: number) {
  return Object.values(SHIPPING_METHODS).map((method) => ({
    value: method,
    label: getShippingMethodLabel(method),
    description: getShippingMethodDescription(method),
    cost: calculateShippingCost(subtotal, method),
  }));
}
