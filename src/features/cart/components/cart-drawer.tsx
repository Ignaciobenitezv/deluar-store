"use client";

import Link from "next/link";
import { useCart } from "@/features/cart/cart-context";
import { CartLineItem } from "@/features/cart/components/cart-line-item";
import { CartSummary } from "@/features/cart/components/cart-summary";

export function CartDrawer() {
  const { items, isOpen, closeCart } = useCart();

  return (
    <>
      <div
        aria-hidden={!isOpen}
        onClick={closeCart}
        className={`fixed inset-0 z-40 bg-black/22 transition-opacity duration-200 ${
          isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        aria-hidden={!isOpen}
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-[28rem] flex-col border-l border-border/70 bg-background px-5 pb-6 pt-5 transition-transform duration-300 sm:px-6 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border/75 pb-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.22em] text-muted">Carrito</p>
            <h2 className="text-2xl font-semibold tracking-[0.03em] text-foreground">
              Tus productos
            </h2>
          </div>
          <button
            type="button"
            onClick={closeCart}
            aria-label="Cerrar carrito"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/80 text-sm text-muted transition-colors hover:text-foreground"
          >
            X
          </button>
        </div>

        {items.length > 0 ? (
          <>
            <div className="flex-1 space-y-4 overflow-y-auto py-5">
              {items.map((item) => (
                <CartLineItem key={item.id} item={item} />
              ))}
            </div>
            <CartSummary />
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 px-4 text-center">
            <div className="space-y-2">
              <h3 className="text-xl font-medium text-foreground">Tu carrito esta vacio</h3>
              <p className="max-w-sm text-sm leading-7 text-muted">
                Cuando agregues productos desde el detalle, apareceran aca con su resumen.
              </p>
            </div>
            <Link
              href="/productos"
              onClick={closeCart}
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-border bg-surface px-6 text-sm uppercase tracking-[0.22em] text-foreground transition-colors hover:border-foreground/25"
            >
              Explorar productos
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
