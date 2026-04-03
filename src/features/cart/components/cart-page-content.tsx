"use client";

import Link from "next/link";
import { CartLineItem } from "@/features/cart/components/cart-line-item";
import { CartSummary } from "@/features/cart/components/cart-summary";
import { useCart } from "@/features/cart/cart-context";

export function CartPageContent() {
  const { items } = useCart();

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.24em] text-muted">Carrito</p>
        <h1 className="text-3xl font-semibold tracking-[0.03em] text-foreground sm:text-4xl">
          Resumen de compra
        </h1>
        <p className="max-w-2xl text-sm leading-7 text-muted sm:text-base">
          Esta es la base del carrito. Todavia no incluye checkout ni pago, pero ya
          permite gestionar cantidades y revisar el subtotal.
        </p>
      </div>

      {items.length > 0 ? (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <section className="space-y-4">
            {items.map((item) => (
              <CartLineItem key={item.id} item={item} />
            ))}
          </section>
          <CartSummary compact />
        </div>
      ) : (
        <section className="rounded-[1.8rem] border border-border/80 bg-surface/92 px-6 py-8 text-center sm:px-10">
          <div className="mx-auto max-w-xl space-y-4">
            <h2 className="text-2xl font-medium tracking-[0.03em] text-foreground">
              Todavia no agregaste productos
            </h2>
            <p className="text-sm leading-7 text-muted sm:text-base">
              Volve al catalogo y suma productos desde cada detalle para empezar a
              armar tu compra.
            </p>
            <Link
              href="/productos"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--color-accent-strong)] px-6 text-sm uppercase tracking-[0.22em] text-white transition-opacity hover:opacity-95"
            >
              Ir a productos
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
