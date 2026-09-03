export function sanitizeAndreaniText(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .normalize("NFC")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function sanitizeAndreaniFreeText(value: unknown) {
  return sanitizeAndreaniText(value)
    .replace(/[-‐‑‒–—―]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeAndreaniLookupKey(value: string) {
  return sanitizeAndreaniText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

export function normalizeAndreaniLocationKey(
  province: string,
  locality: string,
  postalCode: string,
) {
  return [
    normalizeAndreaniLookupKey(province),
    normalizeAndreaniLookupKey(locality),
    normalizeAndreaniLookupKey(postalCode),
  ].join(" / ");
}
