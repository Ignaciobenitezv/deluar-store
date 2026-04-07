"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/features/cart/cart-context";
import type { CartItem } from "@/features/cart/types";

function formatPrice(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

type CartLineItemProps = {
  item: CartItem;
};

export function CartLineItem({ item }: CartLineItemProps) {
  const { removeItem, setItemQuantity, closeCart } = useCart();

  return (
    <article className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-4 rounded-[1.4rem] border border-border/75 bg-white/70 p-4">
      <Link
        href={item.productHref}
        onClick={closeCart}
        className="relative aspect-[4/5] overflow-hidden rounded-[1rem] bg-[#efe5d8]"
      >
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.imageAlt}
            fill
            sizes="120px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[0.65rem] uppercase tracking-[0.18em] text-muted">
            Sin imagen
          </div>
        )}
      </Link>

      <div className="space-y-3">
        <div className="space-y-1">
          <Link
            href={item.productHref}
            onClick={closeCart}
            className="block text-sm font-medium leading-6 text-foreground"
          >
            {item.title}
          </Link>
          {item.variantLabel ? (
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted">
              Color: {item.variantLabel}
            </p>
          ) : null}
          <p className="text-sm text-foreground">{formatPrice(item.basePrice)}</p>
          {item.transferPrice ? (
            <p className="text-xs text-muted">
              Transferencia: {formatPrice(item.transferPrice)}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex items-center rounded-full border border-border/80 bg-surface">
            <button
              type="button"
              aria-label={`Reducir cantidad de ${item.title}`}
              onClick={() => setItemQuantity(item.id, item.quantity - 1)}
              className="inline-flex h-9 w-9 items-center justify-center text-sm text-muted transition-colors hover:text-foreground"
            >
              -
            </button>
            <span className="min-w-8 text-center text-sm text-foreground">
              {item.quantity}
            </span>
            <button
              type="button"
              aria-label={`Aumentar cantidad de ${item.title}`}
              onClick={() => setItemQuantity(item.id, item.quantity + 1)}
              className="inline-flex h-9 w-9 items-center justify-center text-sm text-muted transition-colors hover:text-foreground"
            >
              +
            </button>
          </div>

          <button
            type="button"
            onClick={() => removeItem(item.id)}
            className="text-xs uppercase tracking-[0.18em] text-muted transition-colors hover:text-foreground"
          >
            Quitar
          </button>
        </div>
      </div>
    </article>
  );
}
