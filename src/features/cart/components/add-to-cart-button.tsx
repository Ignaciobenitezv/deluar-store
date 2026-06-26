"use client";

import { useState, useTransition } from "react";
import { useCart } from "@/features/cart/cart-context";
import type { CartProductInput } from "@/features/cart/types";

type AddToCartButtonProps = {
  product: CartProductInput;
  quantity?: number;
  disabled?: boolean;
};

export function AddToCartButton({
  product,
  quantity = 1,
  disabled = false,
}: AddToCartButtonProps) {
  const { addItem } = useCart();
  const [isPending, startTransition] = useTransition();
  const [wasAdded, setWasAdded] = useState(false);
  const [wasLimited, setWasLimited] = useState(false);

  const handleClick = () => {
    startTransition(() => {
      const result = addItem(product, quantity);

      setWasLimited(result.wasLimited || result.wasRejected);
      setWasAdded(!result.wasLimited && !result.wasRejected);
      window.setTimeout(() => {
        setWasAdded(false);
        setWasLimited(false);
      }, 1400);
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isPending}
      className="inline-flex min-h-14 w-full items-center justify-center rounded-full bg-[var(--color-accent-strong)] px-6 text-sm uppercase tracking-[0.22em] text-white shadow-[0_18px_44px_rgba(167,88,60,0.22)] transition-all hover:translate-y-[-1px] hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-55 disabled:shadow-none"
    >
      {disabled
        ? "Sin stock"
        : wasLimited
          ? "Stock maximo"
          : wasAdded
            ? "Agregado"
            : "Agregar al carrito"}
    </button>
  );
}
