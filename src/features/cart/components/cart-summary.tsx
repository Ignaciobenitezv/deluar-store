"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useCart } from "@/features/cart/cart-context";

function formatPrice(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

type CartSummaryProps = {
  className?: string;
  compact?: boolean;
};

export function CartSummary({ className, compact = false }: CartSummaryProps) {
  const { totals, items, closeCart } = useCart();
  const canCheckout = items.length > 0;

  return (
    <aside
      className={cn(
        "space-y-5 rounded-[1.6rem] border border-border/80 bg-[linear-gradient(180deg,rgba(255,253,249,0.96),rgba(244,237,228,0.94))] px-5 py-6",
        className,
      )}
    >
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.22em] text-muted">Resumen</p>
        <h2 className="text-xl font-semibold tracking-[0.03em] text-foreground">
          {items.length > 0 ? `${totals.itemCount} item${totals.itemCount === 1 ? "" : "s"}` : "Tu carrito"}
        </h2>
      </div>

      <div className="space-y-3 border-y border-border/75 py-4 text-sm text-muted">
        <div className="flex items-center justify-between gap-4">
          <span>Subtotal</span>
          <span className="font-medium text-foreground">{formatPrice(totals.subtotal)}</span>
        </div>
        <p className="leading-6">
          Los costos de envio y el pago se definiran en la siguiente fase del ecommerce.
        </p>
      </div>

      <div className="space-y-3">
        {!compact ? (
          <Link
            href="/carrito"
            onClick={closeCart}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-border bg-surface px-6 text-sm uppercase tracking-[0.22em] text-foreground transition-colors hover:border-foreground/25"
          >
            Ver carrito completo
          </Link>
        ) : null}
        {canCheckout ? (
          <Link
            href="/checkout"
            onClick={closeCart}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[var(--color-accent-strong)] px-6 text-sm uppercase tracking-[0.22em] text-white transition-opacity hover:opacity-95"
          >
            Continuar compra
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[var(--color-accent-strong)] px-6 text-sm uppercase tracking-[0.22em] text-white opacity-55"
          >
            Continuar compra
          </button>
        )}
      </div>
    </aside>
  );
}
