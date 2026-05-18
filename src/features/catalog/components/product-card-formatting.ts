export function formatProductPrice(value: number, fractionDigits = 0) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatInstallmentPrice(basePrice: number) {
  return formatProductPrice(basePrice / 6, 2);
}
