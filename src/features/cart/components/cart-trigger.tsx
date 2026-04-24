"use client";

import { cn } from "@/lib/utils";
import { useCart } from "@/features/cart/cart-context";

type CartTriggerProps = {
  variant?: "desktop" | "mobile";
};

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.75 7.25h10.5l-.8 8.25H7.55l-.8-8.25Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 7.25a3 3 0 0 1 6 0" />
    </svg>
  );
}

export function CartTrigger({ variant = "desktop" }: CartTriggerProps) {
  const { toggleCart, totals, isHydrated } = useCart();
  const itemCount = isHydrated ? totals.itemCount : 0;

  return (
    <button
      type="button"
      onClick={toggleCart}
      aria-label="Abrir carrito"
      className={cn(
        "relative inline-flex items-center justify-center transition-colors",
        variant === "desktop"
          ? "h-10 rounded-full border border-neutral-200 bg-white px-4 text-neutral-900 hover:border-[#e8e0d8]"
          : "h-9 w-9 text-foreground hover:text-[var(--color-accent-strong)]",
      )}
    >
      {variant === "desktop" ? (
        <>
          <span className="h-[18px] w-[18px]">
            <CartIcon />
          </span>
          <span className="ml-2 text-xs text-neutral-500">({itemCount})</span>
        </>
      ) : (
        <>
          <span className="h-[18px] w-[18px]"><CartIcon /></span>
          <span className="absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-foreground px-1 py-[1px] text-[0.58rem] leading-none text-background">
            {itemCount}
          </span>
        </>
      )}
    </button>
  );
}
