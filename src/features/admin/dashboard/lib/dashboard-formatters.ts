export function formatDashboardPrice(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatDashboardNumber(value: number) {
  return new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatDashboardPercent(value: number) {
  return `${new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 1,
  }).format(Number.isFinite(value) ? value : 0)}%`;
}

export function formatDashboardDateTime(value: Date | string | number | null | undefined, fallback = "—") {
  const date = value instanceof Date ? value : new Date(value ?? "");

  if (!Number.isFinite(date.getTime())) {
    return fallback;
  }

  // A fixed timeZone keeps this identical between the server render and the
  // browser's hydration pass — without it, a server and a visitor in
  // different timezones format the same instant differently, and React
  // discards + re-renders the subtree client-side (breaking anything, like
  // the theme script, that depends on running only once during SSR).
  // Explicit fields instead of dateStyle/timeStyle presets: the presets
  // resolve through the runtime's ICU data, which can differ between
  // Node's build and the browser's for the same locale, formatting the same
  // instant into two different strings and tripping the same mismatch.
  const formatted = new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);

  // ICU inserts a space before "a. m."/"p. m." whose exact code point (a
  // plain space, NBSP, or narrow NBSP) depends on the CLDR data bundled
  // with the runtime — Node's and the browser's can disagree for the same
  // locale, producing a visually-identical but byte-different string and
  // failing hydration. Collapsing all whitespace to a plain space makes
  // the output deterministic regardless of which ICU version rendered it.
  return formatted.replace(/\s+/g, " ");
}

export function formatDashboardShortDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

export function maskDashboardEmail(email: string) {
  const [localPart, domain = ""] = email.split("@");

  if (!domain) {
    return email;
  }

  return `${localPart.slice(0, Math.min(2, localPart.length))}***@${domain}`;
}
