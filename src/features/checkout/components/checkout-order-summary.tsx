"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/features/cart/cart-context";

function formatPrice(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

export function CheckoutOrderSummary() {
  const { items, totals } = useCart();

  return (
    <aside className="space-y-6 rounded-[2rem] border border-border/80 bg-[linear-gradient(180deg,rgba(255,253,249,0.98),rgba(243,235,226,0.95))] px-6 py-7 shadow-[0_24px_60px_rgba(58,40,26,0.05)] lg:sticky lg:top-28">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.24em] text-muted">Tu pedido</p>
        <h2 className="text-3xl font-semibold tracking-[0.03em] text-foreground">
          Resumen del carrito
        </h2>
        <p className="text-sm leading-7 text-muted">
          Revisa tus productos antes de crear la orden y avanzar al pago.
        </p>
      </div>

      <div className="space-y-4">
        {items.map((item) => (
          <article
            key={item.id}
            className="grid grid-cols-[5rem_minmax(0,1fr)] gap-4 rounded-[1.4rem] border border-border/70 bg-white/74 p-4"
          >
            <div className="relative aspect-[4/5] overflow-hidden rounded-[0.9rem] bg-[#efe5d8]">
              {item.imageUrl ? (
                <Image
                  src={item.imageUrl}
                  alt={item.imageAlt}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-[0.6rem] uppercase tracking-[0.16em] text-muted">
                  Sin imagen
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="space-y-1">
                <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted">
                  Producto
                </p>
                <Link
                  href={item.productHref}
                  className="block text-sm font-medium leading-6 text-foreground"
                >
                  {item.title}
                </Link>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted">Cantidad: {item.quantity}</p>
                <p className="text-sm font-medium text-foreground">
                  {formatPrice(item.basePrice * item.quantity)}
                </p>
              </div>
              {item.transferPrice ? (
                <div className="rounded-[1rem] bg-[rgba(167,88,60,0.07)] px-3 py-2">
                  <p className="text-[0.68rem] uppercase tracking-[0.18em] text-[var(--color-accent-strong)]">
                    Transferencia
                  </p>
                  <p className="mt-1 text-xs text-foreground">
                    {formatPrice(item.transferPrice * item.quantity)}
                  </p>
                </div>
              ) : null}
            </div>
          </article>
        ))}
      </div>

      <div className="space-y-4 rounded-[1.4rem] border border-border/75 bg-white/72 px-4 py-5 text-sm">
        <div className="flex items-center justify-between gap-4 text-muted">
          <span>Items</span>
          <span>{totals.itemCount}</span>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-border/70 pt-4 text-foreground">
          <span className="font-medium">Subtotal</span>
          <span className="text-xl font-semibold tracking-[0.01em]">
            {formatPrice(totals.subtotal)}
          </span>
        </div>
        <p className="leading-6 text-muted">
          Envio y pago se integraran despues. Esta base ya usa el estado real del carrito.
        </p>
      </div>
    </aside>
  );
}
