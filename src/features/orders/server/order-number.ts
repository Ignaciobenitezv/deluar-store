export function generateOrderNumber() {
  const now = new Date();
  const year = now.getUTCFullYear().toString().slice(-2);
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  const suffix = crypto.randomUUID().slice(0, 6).toUpperCase();

  return `DLR-${year}${month}${day}-${suffix}`;
}
