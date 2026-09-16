/**
 * Small semantic accents only — one tone per module so the KPI/module grid
 * doesn't read as one repeated shape, using the same success/warning/danger/
 * info/violet tokens the rest of the Admin uses (never a one-off hex).
 */
export type ModuleToneKey = "success" | "info" | "violet" | "warning";

export const moduleTone: Record<"products" | "orders" | "stats" | "shipping" | "customers", ModuleToneKey> = {
  stats: "success",
  orders: "info",
  customers: "violet",
  products: "warning",
  shipping: "info",
};

/**
 * How long ago, in the coarsest unit that still tells the truth. An order from
 * last week does not need its minutes counted.
 */
export function formatRelativeTime(value: Date, now = new Date()) {
  const seconds = Math.max(Math.floor((now.getTime() - value.getTime()) / 1000), 0);

  if (seconds < 60) {
    return "Recién";
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `Hace ${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `Hace ${hours} h`;
  }

  const days = Math.floor(hours / 24);

  if (days < 30) {
    return `Hace ${days} d`;
  }

  const months = Math.floor(days / 30);

  return months < 12 ? `Hace ${months} m` : `Hace ${Math.floor(months / 12)} a`;
}
