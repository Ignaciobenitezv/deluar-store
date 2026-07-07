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
  const stockLimit = typeof item.stock === "number" ? item.stock : undefined;
  const hasStockLimit = typeof stockLimit === "number";
  const isAtStockLimit = typeof stockLimit === "number" && item.quantity >= stockLimit;

  return (
    <article className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3.5 border-b border-border/70 bg-transparent py-3 last:border-b-0 sm:grid-cols-[6rem_minmax(0,1fr)]">
      <Link
        href={item.productHref}
        onClick={closeCart}
        aria-label={`Ver ${item.title}`}
        className="relative h-[5.5rem] w-[5.5rem] overflow-hidden rounded-[0.75rem] bg-[#efe5d8] sm:h-24 sm:w-24 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-strong)] focus-visible:ring-offset-2"
      >
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.imageAlt}
            fill
            sizes="96px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[0.65rem] uppercase tracking-[0.18em] text-muted">
            Sin imagen
          </div>
        )}
      </Link>

      <div className="min-w-0 space-y-2">
        <div className="space-y-1">
          <Link
            href={item.productHref}
            onClick={closeCart}
            className="block break-words text-sm font-medium leading-5 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-strong)] focus-visible:ring-offset-2"
          >
            {item.title}
          </Link>
          {item.variantLabel ? (
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted">
              Color: {item.variantLabel}
            </p>
          ) : null}
          <p className="text-sm font-medium text-foreground">{formatPrice(item.basePrice)}</p>
          {item.transferPrice ? (
            <p className="text-[0.72rem] leading-4 text-muted">
              Transferencia: {formatPrice(item.transferPrice)}
            </p>
          ) : null}
          {hasStockLimit ? (
            <p className="text-[0.72rem] leading-4 text-muted">
              Stock disponible: {stockLimit}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="inline-flex h-8 items-center rounded-full border border-border/80 bg-white/78">
            <button
              type="button"
              aria-label={`Reducir cantidad de ${item.title}`}
              onClick={() => setItemQuantity(item.id, item.quantity - 1)}
              className="inline-flex h-8 w-8 items-center justify-center text-sm text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-strong)] focus-visible:ring-offset-2"
            >
              -
            </button>
            <span className="min-w-7 text-center text-sm text-foreground">
              {item.quantity}
            </span>
            <button
              type="button"
              aria-label={`Aumentar cantidad de ${item.title}`}
              onClick={() => setItemQuantity(item.id, item.quantity + 1)}
              disabled={isAtStockLimit}
              className="inline-flex h-8 w-8 items-center justify-center text-sm text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-strong)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-35"
            >
              +
            </button>
          </div>

          <button
            type="button"
            aria-label={`Quitar ${item.title}`}
            onClick={() => removeItem(item.id)}
            className="text-[0.68rem] uppercase tracking-[0.16em] text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-strong)] focus-visible:ring-offset-2"
          >
            Quitar
          </button>
        </div>
        {isAtStockLimit ? (
          <p className="text-[0.72rem] leading-4 text-[var(--color-accent-strong)]">
            Ya agregaste el stock disponible.
          </p>
        ) : null}
      </div>
    </article>
  );
}
