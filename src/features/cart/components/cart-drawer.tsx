"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useCart } from "@/features/cart/cart-context";
import { CartLineItem } from "@/features/cart/components/cart-line-item";
import { CartSummary } from "@/features/cart/components/cart-summary";

export function CartDrawer() {
  const { items, isOpen, closeCart } = useCart();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeCart();
      }
    };
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyOverscrollBehavior = document.body.style.overscrollBehavior;
    const previousDocumentOverflow = document.documentElement.style.overflow;
    const previousDocumentOverscrollBehavior =
      document.documentElement.style.overscrollBehavior;

    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "none";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.overscrollBehavior = previousBodyOverscrollBehavior;
      document.documentElement.style.overflow = previousDocumentOverflow;
      document.documentElement.style.overscrollBehavior =
        previousDocumentOverscrollBehavior;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeCart, isOpen]);

  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <>
      <button
        type="button"
        aria-label="Cerrar carrito"
        onClick={closeCart}
        className="pointer-events-auto fixed inset-0 z-[80] cursor-default bg-[#2b1b14]/45 opacity-100 backdrop-blur-[1px] transition-opacity duration-200"
      />

      <aside
        aria-modal="true"
        role="dialog"
        aria-label="Carrito"
        onClick={(event) => event.stopPropagation()}
        className="pointer-events-auto fixed right-0 top-0 z-[90] flex h-dvh w-full flex-col overflow-hidden border-l border-border/70 bg-[#fbf8f4] shadow-[-18px_0_50px_rgba(58,40,26,0.12)] transition-transform duration-300 sm:w-[27rem] sm:max-w-[27rem] lg:w-[28rem] lg:max-w-[28rem]"
      >
        <div className="shrink-0 border-b border-border/75 bg-[#fbf8f4] px-5 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted">
                Carrito
              </p>
              <h2 className="text-xl font-semibold tracking-[0.02em] text-foreground">
                Tus productos
              </h2>
            </div>
            <button
              type="button"
              onClick={closeCart}
              aria-label="Cerrar carrito"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/80 bg-white/70 text-sm text-muted transition-colors hover:text-foreground"
            >
              X
            </button>
          </div>
        </div>

        {items.length > 0 ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4 pr-3 sm:px-5 sm:pr-4">
              {items.map((item) => (
                <CartLineItem key={item.id} item={item} />
              ))}
            </div>
            <div className="shrink-0 border-t border-border/75 bg-[#fbf8f4] px-4 py-4 shadow-[0_-16px_28px_rgba(58,40,26,0.06)] sm:px-5">
              <CartSummary className="rounded-[1.1rem] px-4 py-4" />
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 px-6 py-8 text-center">
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
    </>,
    document.body,
  );
}
