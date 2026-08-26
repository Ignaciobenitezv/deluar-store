function removeDiacritics(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function resolveAdminProductSlugValue(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object") {
    const candidate = value as { current?: unknown };

    if (typeof candidate.current === "string") {
      return candidate.current;
    }
  }

  return "";
}

export function normalizeAdminProductSlug(value: string) {
  return removeDiacritics(String(value ?? ""))
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function buildAdminProductSlugFromTitle(value: string) {
  return normalizeAdminProductSlug(value);
}
