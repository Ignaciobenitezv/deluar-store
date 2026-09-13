/**
 * Synthetic data for looking at the populated layout, never persisted and never
 * available in production. Everything here is invented on purpose and labelled
 * as such on screen: it exists so the zero-state and the full state can be
 * compared without writing rows into the store's real database.
 */

type DaySkeleton = { date: string; label: string };

/** Deterministic, so the preview does not reshuffle on every render. */
function pseudoRandom(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

const PREVIEW_SOURCES = ["Directo", "Instagram", "Google", "Facebook", "Email", "Otros"];

const PREVIEW_PRODUCTS = [
  "Set x24 Cubiertos Blancos",
  "Contenedor Bathroom",
  "Individuales Perak",
  "Set x4 individuales",
  "Organizador Multiuso",
];

const PREVIEW_CAMPAIGNS = ["Promo Invierno", "—", "Retargeting", "—", "—"];

export function buildAbandonedPreview(days: DaySkeleton[]) {
  const daily = days.map((day, index) => {
    const carts = Math.round(pseudoRandom(index + 1) * 9);
    const checkouts = Math.round(pseudoRandom(index + 41) * 5);
    const value = (carts + checkouts) * (6000 + Math.round(pseudoRandom(index + 77) * 9000));

    return { ...day, carts, checkouts, value };
  });

  const cartAbandonedCount = daily.reduce((sum, day) => sum + day.carts, 0);
  const checkoutAbandonedCount = daily.reduce((sum, day) => sum + day.checkouts, 0);
  const totalCount = cartAbandonedCount + checkoutAbandonedCount;
  const totalValue = daily.reduce((sum, day) => sum + day.value, 0);
  const totalUnits = Math.round(totalCount * 2.4);

  const weights = [0.43, 0.17, 0.14, 0.12, 0.07, 0.07];
  const sources = PREVIEW_SOURCES.map((source, index) => {
    const count = Math.max(Math.round(totalCount * weights[index]), 1);
    return { source, count, share: totalCount > 0 ? (count / totalCount) * 100 : 0 };
  });

  const carts = Array.from({ length: 8 }, (_, index) => {
    const checkout = index % 3 === 0;
    const items = 1 + Math.round(pseudoRandom(index + 11) * 4);

    return {
      cartId: `preview-${index}`,
      abandonedAtLabel: `${daily[Math.max(daily.length - 1 - index, 0)]?.label ?? "—"}, ${String(
        9 + index,
      ).padStart(2, "0")}:${String(12 + index * 5).padStart(2, "0")}`,
      customerLabel: `demo-${String(index + 1).padStart(4, "0")}…`,
      productSummary: `${items} ${items === 1 ? "producto" : "productos"}`,
      subtotal: 8000 + Math.round(pseudoRandom(index + 5) * 48000),
      status: checkout ? "CHECKOUT_ABANDONED" : "CART_ABANDONED",
      stageLabel: checkout ? "Checkout abandonado" : "Carrito abandonado",
      sourceLabel: PREVIEW_SOURCES[index % PREVIEW_SOURCES.length],
      campaignLabel: PREVIEW_CAMPAIGNS[index % PREVIEW_CAMPAIGNS.length],
    };
  });

  const products = PREVIEW_PRODUCTS.map((productName, index) => ({
    productId: `preview-product-${index}`,
    productName,
    imageUrl: null,
    abandonedCarts: Math.max(Math.round(totalCount * [0.29, 0.19, 0.14, 0.12, 0.1][index]), 1),
  }));

  return {
    totals: {
      totalCount,
      cartAbandonedCount,
      checkoutAbandonedCount,
      totalValue,
      averageTicket: totalCount > 0 ? totalValue / totalCount : 0,
      totalUnits,
      averageTimeMinutes: 34,
      averageTimeLabel: "34 min",
    },
    daily,
    sources,
    carts,
    products,
    pageCount: 3,
    page: 1,
  };
}
