"use client";

import { useCart } from "@/features/cart/cart-context";

export function CartTrigger() {
  const { toggleCart, totals, isHydrated } = useCart();
  const itemCount = isHydrated ? totals.itemCount : 0;

  return (
    <button
      type="button"
      onClick={toggleCart}
      aria-label="Abrir carrito"
      className="relative inline-flex h-11 min-w-11 items-center justify-center rounded-full border border-border bg-white/75 px-4 text-sm tracking-[0.06em] transition-colors hover:border-foreground/30"
    >
      <span>Carrito</span>
      <span className="ml-2 inline-flex min-w-6 items-center justify-center rounded-full bg-foreground px-1.5 py-0.5 text-[0.68rem] text-background">
        {itemCount}
      </span>
    </button>
  );
}
