/** Argentina-local date label for the topbar — computed server-side so it
 * never depends on the viewer's own browser timezone or causes a
 * hydration mismatch against `new Date()` on the client. */
export function formatAdminDateLabel(now: Date) {
  const raw = new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);

  return raw.charAt(0).toUpperCase() + raw.slice(1);
}
